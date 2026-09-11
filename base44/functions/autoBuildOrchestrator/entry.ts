import { createClientFromRequest, secrets } from '../../runtime/index';

// ============================================================================
// autoBuildOrchestrator — the "Auto Builder" button in the chat.
// Replicates the step-by-step onboarding journey from the AUTOBUILDER2 system:
//   profile → vision → strategy → brand → content → website → deploy
// Then auto-provisions the built system across the full stack:
//   - Vercel       (frontend hosting)
//   - Vercel AI Gateway (LLM — injected as env var)
//   - Supabase     (backend / database)
//   - Google Drive (data + asset storage)
//   - Google Workspace (docs / sheets — via connector)
//   - Railway      (container services)
// Each generation step uses InvokeLLM; provisioning reuses the existing
// provisionVercel / provisionSupabase / driveOrganizer / railwayProvisioner
// functions so we never duplicate that logic.
// ============================================================================

const STEPS = ['profile', 'vision', 'strategy', 'brand', 'content', 'website', 'deploy'];

const STEP_PROMPTS = {
  profile: (name, industry, type) => `You are a business analyst. Generate a concise business profile for "${name}" in the "${industry}" industry. Product type: ${type}. Return JSON with: mission (string), target_audience (string), services (array of strings, 4-6), tagline (string), key_features (array of strings, 3-5), primary_location (string).`,
  vision: (name, industry) => `You are a visionary strategist. Generate a vision document for "${name}" in "${industry}". Return JSON with: mission (string), problem (string), target_audience (string), long_term_vision (string), success_metrics (array of 4 strings), core_values (array of 4 strings), value_proposition (string).`,
  strategy: (name, industry) => `You are a GTM strategist. Generate a strategy for "${name}" in "${industry}". Return JSON with: positioning (string), gtm_plan (string), revenue_model (string), competitive_advantage (string).`,
  brand: (name, industry) => `You are a brand designer. Generate a brand pack for "${name}" in "${industry}". Return JSON with: brand_colors (array of 4 hex strings), brand_voice (string), value_proposition (string), logo_description (string).`,
  content: (name, industry) => `You are a content strategist. Generate website content for "${name}" in "${industry}". Return JSON with: hero_headline (string), hero_subheadline (string), about (string), services (array of 4 objects with name + description), cta (string).`,
  website: (name, industry, type) => `You are a web architect. Generate a website structure for "${name}" (${type}) in "${industry}". Return JSON with: pages (array of objects with name + slug + purpose), nav_items (array of strings), layout (string: "single_page" | "multi_page").`,
};

const PROFILE_SCHEMA = {
  type: 'object',
  properties: {
    mission: { type: 'string' }, target_audience: { type: 'string' },
    services: { type: 'array', items: { type: 'string' } },
    tagline: { type: 'string' }, key_features: { type: 'array', items: { type: 'string' } },
    primary_location: { type: 'string' },
  },
};
const VISION_SCHEMA = {
  type: 'object',
  properties: {
    mission: { type: 'string' }, problem: { type: 'string' }, target_audience: { type: 'string' },
    long_term_vision: { type: 'string' }, success_metrics: { type: 'array', items: { type: 'string' } },
    core_values: { type: 'array', items: { type: 'string' } }, value_proposition: { type: 'string' },
  },
};
const STRATEGY_SCHEMA = {
  type: 'object',
  properties: {
    positioning: { type: 'string' }, gtm_plan: { type: 'string' },
    revenue_model: { type: 'string' }, competitive_advantage: { type: 'string' },
  },
};
const BRAND_SCHEMA = {
  type: 'object',
  properties: {
    brand_colors: { type: 'array', items: { type: 'string' } },
    brand_voice: { type: 'string' }, value_proposition: { type: 'string' },
    logo_description: { type: 'string' },
  },
};
const CONTENT_SCHEMA = {
  type: 'object',
  properties: {
    hero_headline: { type: 'string' }, hero_subheadline: { type: 'string' },
    about: { type: 'string' },
    services: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } } } },
    cta: { type: 'string' },
  },
};
const WEBSITE_SCHEMA = {
  type: 'object',
  properties: {
    pages: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, slug: { type: 'string' }, purpose: { type: 'string' } } } },
    nav_items: { type: 'array', items: { type: 'string' } },
    layout: { type: 'string' },
  },
};

const STEP_SCHEMAS = {
  profile: PROFILE_SCHEMA, vision: VISION_SCHEMA, strategy: STRATEGY_SCHEMA,
  brand: BRAND_SCHEMA, content: CONTENT_SCHEMA, website: WEBSITE_SCHEMA,
};

function slug(name) {
  return String(name || 'autobuild').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function genPassword() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(36).padStart(2, '0')).join('').slice(0, 40);
}

async function runStep(base44, step, build) {
  const prompt = STEP_PROMPTS[step](build.business_name, build.industry || 'general', build.product_type);
  const schema = STEP_SCHEMAS[step];
  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: schema,
    model: 'gpt_5_mini',
  });
  return result;
}

async function provisionStack(base44, build) {
  const sr = base44.asServiceRole;
  const name = slug(build.business_name);
  const results = { vercel: null, supabase: null, drive: null, railway: null, ai_gateway: null };

  // 1. Supabase (backend / database) — provision first so we can inject its URL into Vercel env
  try {
    const supa = await sr.functions.invoke('provisionSupabase', {
      mode: 'create', name: `${name}-db`, db_password: genPassword(), region: 'us-east-1', plan: 'free',
    });
    const supaData = supa?.data || supa;
    if (supaData?.project?.ref) {
      results.supabase = { ref: supaData.project.ref, url: supaData.project.url, ready: supaData.project.ready };
    } else {
      results.supabase = { error: supaData?.error || 'no project returned' };
    }
  } catch (e) { results.supabase = { error: e.message }; }

  // 2. Vercel (frontend) — with env vars wiring the whole stack together
  const envVars = {
    AI_GATEWAY_API_KEY: secrets.get('AI_GATEWAY_API_KEY') || '',
    AI_GATEWAY_URL: 'https://ai-gateway.vercel.sh/v1',
  };
  if (results.supabase?.url) {
    envVars.NEXT_PUBLIC_SUPABASE_URL = results.supabase.url;
    envVars.SUPABASE_URL = results.supabase.url;
  }
  try {
    const vercel = await sr.functions.invoke('provisionVercel', { mode: 'create', name, env: envVars });
    const vData = vercel?.data || vercel;
    if (vData?.project?.id) {
      results.vercel = { id: vData.project.id, name: vData.project.name };
      results.ai_gateway = { configured: true, env_var: 'AI_GATEWAY_API_KEY' };
    } else {
      results.vercel = { error: vData?.error || 'no project returned' };
    }
  } catch (e) { results.vercel = { error: e.message }; }

  // 3. Google Drive (data + asset storage) — ensure project folder structure
  try {
    const drive = await sr.functions.invoke('driveOrganizer', { action: 'ensure_folders' });
    const dData = drive?.data || drive;
    results.drive = { ok: !!dData?.ok, detail: dData?.message || 'folders ensured' };
  } catch (e) { results.drive = { error: e.message }; }

  // 4. Railway (container services) — provision a backend container if we have a repo
  //    Falls back to simulation mode when no repo is provided (railwayProvisioner handles this)
  try {
    const railway = await sr.functions.invoke('railwayProvisioner', {
      projectName: `${name}-backend`,
      githubRepoUrl: build.generated_assets?.repo_url || `https://github.com/autobuilder/${name}`,
      environmentVariables: {
        SUPABASE_URL: results.supabase?.url || '',
        AI_GATEWAY_API_KEY: secrets.get('AI_GATEWAY_API_KEY') || '',
      },
    });
    const rData = railway?.data || railway;
    results.railway = { serviceId: rData?.serviceId, liveUrl: rData?.liveUrl, simulated: rData?.simulated };
  } catch (e) { results.railway = { error: e.message }; }

  return results;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const businessName = String(body.business_name || '').trim();
    const industry = String(body.industry || 'general').trim();
    const productType = String(body.product_type || 'marketing_site');
    if (!businessName) return Response.json({ error: 'business_name required' }, { status: 400 });

    const sr = base44.asServiceRole;
    const log = (msg) => `[${new Date().toISOString()}] ${msg}`;

    // 1. Create the AutoBuild record
    let build = await sr.entities.AutoBuild.create({
      business_name: businessName,
      industry,
      product_type: productType,
      current_step: 'profile',
      status: 'running',
      visited_steps: [],
      logs: [log('Build created — onboarding journey started')],
    });

    const stepResults = {};
    const advance = async (step, data, logMsg) => {
      stepResults[step] = data;
      build = await sr.entities.AutoBuild.update(build.id, {
        current_step: step,
        visited_steps: [...(build.visited_steps || []), step],
        [step === 'profile' ? 'profile' : step === 'vision' ? 'vision' : step === 'strategy' ? 'strategy' : 'generated_assets']:
          step === 'profile' ? data : step === 'vision' ? data : step === 'strategy' ? data : { ...(build.generated_assets || {}), [step]: data },
        logs: [...(build.logs || []), log(logMsg)],
      });
    };

    // 2. Run the onboarding journey steps
    for (const step of STEPS) {
      if (step === 'deploy') continue;
      try {
        const result = await runStep(base44, step, build);
        await advance(step, result, `Step "${step}" generated`);
      } catch (e) {
        await sr.entities.AutoBuild.update(build.id, {
          logs: [...(build.logs || []), log(`Step "${step}" failed: ${e.message}`)],
        });
      }
    }

    // 3. Auto-provision the full stack
    await sr.entities.AutoBuild.update(build.id, {
      current_step: 'deploy',
      logs: [...(build.logs || []), log('Provisioning stack: Vercel + Supabase + Drive + Railway + AI Gateway')],
    });

    let provisioning = null;
    try {
      provisioning = await provisionStack(base44, build);
      const deployUrl = provisioning.vercel?.id ? `https://${slug(businessName)}.vercel.app` : null;
      build = await sr.entities.AutoBuild.update(build.id, {
        status: 'completed',
        current_step: 'complete',
        deploy_url: deployUrl,
        generated_assets: { ...(build.generated_assets || {}), provisioning, deploy_url: deployUrl },
        logs: [...(build.logs || []), log(`Provisioning complete. Vercel: ${provisioning.vercel?.id || 'failed'}, Supabase: ${provisioning.supabase?.ref || 'failed'}, Drive: ${provisioning.drive?.ok ? 'ok' : 'failed'}, Railway: ${provisioning.railway?.serviceId || 'failed'}`)],
      });
    } catch (e) {
      build = await sr.entities.AutoBuild.update(build.id, {
        status: 'failed',
        error_message: e.message,
        logs: [...(build.logs || []), log(`Provisioning failed: ${e.message}`)],
      });
    }

    return Response.json({
      ok: true,
      build_id: build.id,
      business_name: build.business_name,
      status: build.status,
      current_step: build.current_step,
      steps_completed: Object.keys(stepResults),
      provisioning: provisioning || { error: 'provisioning failed' },
      deploy_url: build.deploy_url || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}