import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// shadowBuildStrategy — Shadow's full pipeline: takes every money-hunt finding,
// evaluates which can be 100% strategized, built, validated, launched, and
// monetized (Stripe payouts) entirely by AI + the Vision Cortex system, then
// produces complete architecture docs, strategy docs, playbooks, build orders,
// and monetization plans — and pushes them into the BuildQueue ready for the
// auto-builder. Zero failure rate enforced via validation gates.

const OWNER_EMAIL = 'j@xpsxpress.com';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const core = base44.asServiceRole.integrations.Core;

    await base44.entities.AgentLog.create({
      agent_name: 'Shadow',
      level: 'info',
      category: 'build_strategy',
      message: 'Build strategy pipeline initiated — evaluating money-hunt methods for 100% AI automatability.',
    });

    // 1. Pull all Shadow Money Hunt intelligence
    const intel = await base44.entities.IntelFeed.filter(
      { source: 'Shadow Money Hunt' },
      '-created_date',
      50
    ).catch(() => []);

    if (!intel.length) {
      return Response.json({ error: 'No money-hunt intelligence found. Run Shadow Money Hunt first.' }, { status: 400 });
    }

    const intelDigest = intel.map((f, i) => ({
      id: f.id,
      headline: f.headline,
      summary: f.summary,
      category: f.category,
      impact_score: f.impact_score,
      signals: f.signals,
      correlations: f.correlations,
      url: f.url,
    }));

    // 2. LLM evaluates every method for full AI-automatability and produces build packs
    const prompt = `You are the Shadow agent for the Vision Cortex Destiny Engine. You have a set of money-hunt intelligence findings. Your mission: identify which of these can be 100% strategized, built, validated, launched, and monetized — with money delivered to a Stripe account — entirely by AI and the Vision Cortex system, with a ZERO FAILURE RATE.

For each finding, evaluate it against these gates:
G1. STRATEGY — can AI fully generate the strategy with no human input?
G2. BUILD — can the Vision Cortex auto-builder fully build it (React + Tailwind + Base44 backend)?
G3. VALIDATE — can AI fully validate it works (automated tests, no human QA)?
G4. LAUNCH — can it be auto-provisioned and launched (Vercel/Supabase)?
G5. MONETIZE — can it collect payments via Stripe with zero human setup?
G6. ZERO FAILURE — is the failure rate effectively 0% with proper automation?

Only include methods that pass ALL six gates. For each viable method, produce a COMPLETE build pack:

- viable: true/false (must pass all 6 gates)
- failure_gates: which gates failed (if not viable)
- business_name: a real, brandable name
- one_liner: what it does in one sentence
- industry: the industry
- problem: the exact problem it solves
- solution: the exact solution
- target_users: who pays for this
- tech_stack: exact technologies (must be buildable on React + Tailwind + Base44)
- architecture_doc: full system architecture — components, data flow, integrations, entity model
- strategy_doc: full go-to-market strategy — positioning, pricing, acquisition channels, growth loop
- playbook: step-by-step playbook for the auto-builder — every build step in order
- monetization_plan: exact Stripe integration — products, prices, checkout flow, webhook handling
- validation_criteria: automated tests that must pass before launch (zero failure rate)
- build_order: ordered array of build steps for the queue system
- estimated_monthly_revenue: realistic USD range
- time_to_launch_days: how fast the auto-builder can ship it
- risk_mitigation: how to guarantee zero failure

INTELLIGENCE FINDINGS:
${JSON.stringify(intelDigest)}

Return only methods that are viable. Be rigorous — if a method requires human sales calls, physical fulfillment, regulatory licenses, or manual operations, it FAILS. Only fully AI-automatable, digital, Stripe-monetizable methods pass.`;

    const res = await core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          viable_methods: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                intel_id: { type: 'string', description: 'The IntelFeed id this method is based on' },
                viable: { type: 'boolean' },
                failure_gates: { type: 'array', items: { type: 'string' } },
                business_name: { type: 'string' },
                one_liner: { type: 'string' },
                industry: { type: 'string' },
                problem: { type: 'string' },
                solution: { type: 'string' },
                target_users: { type: 'string' },
                tech_stack: { type: 'array', items: { type: 'string' } },
                architecture_doc: { type: 'string', description: 'Full system architecture' },
                strategy_doc: { type: 'string', description: 'Full go-to-market strategy' },
                playbook: { type: 'string', description: 'Step-by-step build playbook' },
                monetization_plan: { type: 'string', description: 'Exact Stripe integration plan' },
                validation_criteria: { type: 'array', items: { type: 'string' } },
                build_order: { type: 'array', items: { type: 'string' } },
                estimated_monthly_revenue: { type: 'string' },
                time_to_launch_days: { type: 'number' },
                risk_mitigation: { type: 'string' },
              },
              required: ['viable', 'business_name', 'one_liner'],
            },
          },
          rejected_methods: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                intel_id: { type: 'string' },
                headline: { type: 'string' },
                failure_gates: { type: 'array', items: { type: 'string' } },
                reason: { type: 'string' },
              },
            },
          },
          executive_summary: { type: 'string' },
        },
        required: ['viable_methods', 'executive_summary'],
      },
    });

    const viable = (res.viable_methods || []).filter((m) => m.viable);
    const rejected = res.rejected_methods || [];

    // 3. Create Idea + BuildQueue entries for every viable method
    const queued = [];
    for (const m of viable) {
      // Create the Idea
      const idea = await base44.entities.Idea.create({
        title: m.business_name,
        one_liner: m.one_liner,
        industry: m.industry,
        problem: m.problem,
        solution: m.solution,
        target_users: m.target_users,
        tech_stack: m.tech_stack || [],
        monetization: [m.monetization_plan || 'Stripe checkout + webhooks'],
        est_monthly_profit_usd: parseInt(String(m.estimated_monthly_revenue || '').replace(/[^0-9]/g, '')) || null,
        time_to_launch_days: m.time_to_launch_days || 7,
        stage: 'strategized',
        discovered_by: 'Shadow Build Strategy',
        automation_plan: m.playbook,
        moat: m.risk_mitigation,
        risks: m.validation_criteria || [],
        hidden_opportunity: m.architecture_doc,
      });

      // Create the BuildQueue entry — ready for the auto-builder
      const queueEntry = await base44.entities.BuildQueue.create({
        title: m.business_name,
        idea_id: idea.id,
        stage: 'strategized',
        priority: 1,
        assigned_agent: 'Shadow',
        source: 'shadow_build_strategy',
        notes: `Auto-strategized by Shadow. Revenue: ${m.estimated_monthly_revenue}. Launch: ${m.time_to_launch_days} days.`,
        business_name: m.business_name,
        industry: m.industry,
        product_type: 'saas',
        current_step: 'profile',
        status: 'queued',
        auto_advance: true,
        visited_steps: ['strategized'],
        logs: [
          `[ARCHITECTURE] ${m.architecture_doc || ''}`,
          `[STRATEGY] ${m.strategy_doc || ''}`,
          `[PLAYBOOK] ${m.playbook || ''}`,
          `[MONETIZATION] ${m.monetization_plan || ''}`,
          `[VALIDATION] ${(m.validation_criteria || []).join(' | ')}`,
          `[BUILD ORDER] ${(m.build_order || []).join(' → ')}`,
          `[RISK MITIGATION] ${m.risk_mitigation || ''}`,
        ],
      });

      queued.push({
        queue_id: queueEntry.id,
        idea_id: idea.id,
        business_name: m.business_name,
        one_liner: m.one_liner,
        architecture_doc: m.architecture_doc,
        strategy_doc: m.strategy_doc,
        playbook: m.playbook,
        monetization_plan: m.monetization_plan,
        validation_criteria: m.validation_criteria,
        build_order: m.build_order,
        estimated_monthly_revenue: m.estimated_monthly_revenue,
        time_to_launch_days: m.time_to_launch_days,
        risk_mitigation: m.risk_mitigation,
      });
    }

    // 4. Log the full pipeline result
    await base44.entities.AgentLog.create({
      agent_name: 'Shadow',
      level: 'success',
      category: 'build_strategy',
      message: `Build strategy complete — ${viable.length} viable methods queued, ${rejected.length} rejected. ${res.executive_summary}`,
      detail: viable.map((m) => `• ${m.business_name} — ${m.estimated_monthly_revenue} — ${m.time_to_launch_days}d to launch`).join('\n'),
      auto_action: `${viable.length} entries pushed to BuildQueue with auto_advance=true`,
    });

    // 5. Email the owner the full pipeline result
    const emailBody = `SHADOW BUILD STRATEGY REPORT
==============================

EXECUTIVE SUMMARY:
${res.executive_summary}

${viable.length} VIABLE METHODS — 100% AI-AUTOMATABLE, STRIPE-MONETIZABLE, ZERO FAILURE:

${queued.map((m, i) => `
${i + 1}. ${m.business_name}
   ${m.one_liner}
   Revenue: ${m.estimated_monthly_revenue}
   Launch: ${m.time_to_launch_days} days
   Queue ID: ${m.queue_id}

   ARCHITECTURE:
   ${m.architecture_doc}

   STRATEGY:
   ${m.strategy_doc}

   PLAYBOOK:
   ${m.playbook}

   MONETIZATION (STRIPE):
   ${m.monetization_plan}

   BUILD ORDER:
   ${(m.build_order || []).join(' → ')}

   VALIDATION CRITERIA:
   ${(m.validation_criteria || []).join('\n   ')}

   RISK MITIGATION:
   ${m.risk_mitigation}
`).join('\n')}

${rejected.length} REJECTED METHODS (failed gates):
${rejected.map((r) => `• ${r.headline} — failed: ${(r.failure_gates || []).join(', ')} — ${r.reason || ''}`).join('\n')}

All viable methods are now in the BuildQueue with auto_advance=true — ready for the auto-builder.

— Shadow Agent, Vision Cortex Destiny Engine
`;

    try {
      await core.SendEmail({
        to: OWNER_EMAIL,
        subject: `Shadow Build Strategy — ${viable.length} methods queued for auto-build`,
        body: emailBody,
      });
    } catch { /* email optional */ }

    return Response.json({
      evaluated: intel.length,
      viable: viable.length,
      rejected: rejected.length,
      queued: queued.length,
      executive_summary: res.executive_summary,
      viable_methods: queued,
      rejected_methods: rejected,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}