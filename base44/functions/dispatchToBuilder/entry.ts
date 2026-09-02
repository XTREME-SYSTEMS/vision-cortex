import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// dispatchToBuilder — BRAIN → HANDS bridge.
// Takes an approved Idea from Vision Cortex (the brain) and POSTs it to the
// Xtreme AI v2 builder app's `receiveVisionCortexIdea` webhook (the hands).
// The builder creates an AutoBuild record and its autonomous loop runs the
// full pipeline (architecture → data model → UI → code → deploy).
//
// Auth: shared secret VISION_CORTEX_WEBHOOK_KEY sent in the x-api-key header.
// The same key must be set in the builder app's secrets.
//
// Invoke from the SDK:
//   base44.functions.invoke('dispatchToBuilder', { idea_id, auto_advance, product_type })
//
// Returns: { ok, autobuild_id, builder_response }

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { idea_id, auto_advance = true, product_type = 'marketing_site' } = body;

    if (!idea_id) return Response.json({ error: 'idea_id is required' }, { status: 400 });

    // ── Load the approved idea ──
    const idea = await base44.asServiceRole.entities.Idea.get(idea_id);
    if (!idea) return Response.json({ error: 'Idea not found' }, { status: 404 });

    // ── Resolve secrets ──
    const builderUrl = (secrets.get('XTREME_BUILDER_URL') || '').replace(/\/+$/, '');
    const apiKey = secrets.get('VISION_CORTEX_WEBHOOK_KEY');
    if (!builderUrl) return Response.json({ error: 'XTREME_BUILDER_URL secret not set' }, { status: 503 });
    if (!apiKey) return Response.json({ error: 'VISION_CORTEX_WEBHOOK_KEY secret not set' }, { status: 503 });

    const validProductType = ['marketing_site', 'web_app', 'ecommerce', 'platform'].includes(product_type)
      ? product_type
      : 'marketing_site';

    // ── Build the manifest (matches receiveVisionCortexIdea contract) ──
    const manifest = {
      title: idea.title,
      description: idea.solution || idea.one_liner || idea.problem || '',
      industry: idea.industry || 'general',
      sub_industry: idea.sub_industry || '',
      product_type: validProductType,
      target_audience: idea.target_users || '',
      key_features: idea.monetization || [],
      scores: {
        overall: idea.score || 0,
        profitability: idea.est_monthly_profit_usd || 0,
        scalability: idea.probability_of_success || 0,
        launch_cost_usd: idea.launch_cost_usd || 0,
        time_to_launch_days: idea.time_to_launch_days || 0
      },
      source_idea_id: idea.id,
      auto_advance
    };

    // ── POST to the builder's receiveVisionCortexIdea webhook ──
    const endpoint = `${builderUrl}/functions/receiveVisionCortexIdea`;
    const builderRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(manifest)
    });

    const builderText = await builderRes.text();
    let builderJson;
    try { builderJson = JSON.parse(builderText); } catch { builderJson = { raw: builderText }; }

    if (!builderRes.ok) {
      return Response.json({
        error: 'Builder rejected the manifest',
        status: builderRes.status,
        builder_response: builderJson,
        endpoint
      }, { status: 502 });
    }

    // ── Mark the idea as dispatched to the builder ──
    await base44.asServiceRole.entities.Idea.update(idea_id, {
      stage: 'building',
      automation_plan: (idea.automation_plan || '') + `\n[dispatchToBuilder ${new Date().toISOString()}] autobuild_id=${builderJson.autobuild_id || 'unknown'}`
    });

    return Response.json({
      ok: true,
      autobuild_id: builderJson.autobuild_id || null,
      message: builderJson.message || 'Dispatched to builder',
      builder_response: builderJson
    });
  } catch (error) {
    console.error('dispatchToBuilder error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}