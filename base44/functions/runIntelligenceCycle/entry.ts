import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// Zero-Credit Intelligence Cycle — the decoupled fabric driver.
// Reads the next pending target from Supabase, scrapes it via microlink.io (free),
// evaluates it through Groq's free-tier API (llama-3.3-70b-versatile), and writes
// the result back to Supabase. No Base44 Core.InvokeLLM, no Base44 entity calls —
// zero integration credit consumption.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';

function supabaseUrl() { return secrets.get('SUPABASE_URL'); }
function supabaseKey() { return secrets.get('SUPABASE_SERVICE_ROLE_KEY') || secrets.get('SUPABASE_TOKEN'); }

async function supabaseFetch(path, options = {}) {
  const url = `${supabaseUrl()}/rest/v1${path}`;
  const key = supabaseKey();
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_TOKEN) must be set');
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${res.status}: ${body}`);
  }
  return res;
}

async function groqEvaluate(domain, vertical, rawMeta) {
  const key = secrets.get('GROQ_API_KEY');
  if (!key) throw new Error('GROQ_API_KEY not set');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are the Vision Cortex Brain — a decoupled competitive intelligence engine. Evaluate the target payload metadata, determine if a competitor platform gap exists, calculate a commercial value score (0-100), identify missing features, estimate pricing, and output a clean JSON block only.'
        },
        {
          role: 'user',
          content: `Target: ${domain}\nVertical: ${vertical}\nMetadata: ${JSON.stringify(rawMeta)}\n\nReturn JSON: {"commercial_value_score": 0-100, "discovered_gaps": ["gap1","gap2"], "estimated_value_margin": 0.00, "buying_intent_signal": "low|medium|high", "seo_aeo_score": 0-100, "recommended_action": "build|skip|monitor"}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1000
    })
  });
  if (!res.ok) { const err = await res.text(); throw new Error(`Groq error: ${err}`); }
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

async function scrapeTarget(domain) {
  try {
    const res = await fetch(`https://microlink.io?url=${encodeURIComponent(`https://${domain}`)}&palette=true`);
    if (!res.ok) return { description: 'No description tags available' };
    const data = await res.json();
    return {
      description: data.data?.description || 'No description available',
      title: data.data?.title || domain,
      logo: data.data?.logo || null,
      colors: data.data?.image || null
    };
  } catch {
    return { description: 'Scrape failed — using domain only' };
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: cron token OR admin
    const cronToken = req.headers.get('x-cron-token') || '';
    const expectedKey = secrets.get('VISION_CORTEX_WEBHOOK_KEY');
    let authorized = false;
    if (cronToken && expectedKey && cronToken === expectedKey) {
      authorized = true;
    } else {
      try {
        const user = await base44.auth.me();
        if (user && user.role === 'admin') authorized = true;
      } catch {}
    }
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'process';

    // STATUS MODE — return queue stats + recent targets
    if (mode === 'status') {
      const [pending, enriched, analyzed, converted, recent] = await Promise.all([
        supabaseFetch('/discovery_targets?automation_state=eq.Pending_Scrape&select=id').then(r => r.json()).catch(() => []),
        supabaseFetch('/discovery_targets?automation_state=eq.Enriched_Structured&select=id').then(r => r.json()).catch(() => []),
        supabaseFetch('/discovery_targets?automation_state=eq.Outreach_Active&select=id').then(r => r.json()).catch(() => []),
        supabaseFetch('/discovery_targets?automation_state=eq.Converted&select=id').then(r => r.json()).catch(() => []),
        supabaseFetch('/discovery_targets?order=updated_at.desc&limit=20').then(r => r.json()).catch(() => [])
      ]);
      return Response.json({
        status: 'online',
        engine: 'zero-credit-fabric-v44',
        groq_model: GROQ_MODEL,
        queue: {
          pending_scrape: pending.length,
          enriched: enriched.length,
          outreach_active: analyzed.length,
          converted: converted.length
        },
        recent_targets: recent
      });
    }

    // ADD MODE — add a new target to the queue
    if (mode === 'add') {
      const { domain_name, industry_vertical, priority_rank } = body;
      if (!domain_name || !industry_vertical) {
        return Response.json({ error: 'domain_name and industry_vertical are required' }, { status: 400 });
      }
      const res = await supabaseFetch('/discovery_targets', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({
          domain_name,
          industry_vertical,
          priority_rank: priority_rank || 3,
          automation_state: 'Pending_Scrape'
        })
      });
      const created = await res.json();
      return Response.json({ status: 'queued', target: created[0] });
    }

    // PROCESS MODE (default) — process the next pending target
    const targetRes = await supabaseFetch('/discovery_targets?automation_state=eq.Pending_Scrape&order=priority_rank.asc&limit=1');
    const targets = await targetRes.json();
    if (!targets || targets.length === 0) {
      return Response.json({ status: 'idle', message: 'Queue is empty — no targets pending scrape' });
    }
    const target = targets[0];

    // 1. Scrape target metadata (free microlink.io)
    const rawMeta = await scrapeTarget(target.domain_name);

    // 2. Evaluate via Groq free tier
    const evaluation = await groqEvaluate(target.domain_name, target.industry_vertical, rawMeta);

    // 3. Determine next state
    const score = evaluation.commercial_value_score || 0;
    const nextState = score >= 65 ? 'Enriched_Structured' : 'Pending_Scrape';

    // 4. Update Supabase
    await supabaseFetch(`/discovery_targets?id=eq.${target.id}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        automation_state: nextState,
        commercial_value_score: score,
        missing_features: evaluation.discovered_gaps || [],
        estimated_customer_pricing: evaluation.estimated_value_margin || 0,
        buying_intent_signal: evaluation.buying_intent_signal || null,
        seo_aeo_score: evaluation.seo_aeo_score || 0,
        raw_mined_payload: { ...rawMeta, evaluation },
        last_scraped_at: new Date().toISOString()
      })
    });

    return Response.json({
      status: 'success',
      processed_target: target.domain_name,
      assigned_score: score,
      discovered_gaps: evaluation.discovered_gaps || [],
      recommended_action: evaluation.recommended_action || 'monitor',
      pipeline_transition: nextState,
      groq_model: GROQ_MODEL,
      zero_credit: true
    });
  } catch (error) {
    return Response.json({ error: error.message, zero_credit: true, timestamp: new Date().toISOString() }, { status: 500 });
  }
}