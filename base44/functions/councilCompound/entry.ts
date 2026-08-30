import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const str = (v, max) => String(v ?? '').slice(0, max);

// The compounding intelligence engine: after each cycle, extract one durable,
// reusable doctrine from the outcome and add it to the shared brain. Winning
// cycles reinforce the doctrine that contributed, so the brain gets sharper
// over time and is fed back into future deliberations.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    } catch { /* workflow context — no user token */ }

    const trades = await base44.asServiceRole.entities.Trade.list('-updated_date', 5);
    const lastResolved = trades.find((t) => t.status && t.status.startsWith('resolved_'));
    const intel = await base44.asServiceRole.entities.IntelFeed.list('-created_date', 5);
    const doctrine = await base44.asServiceRole.entities.Doctrine.list('-weight', 8);

    const cycleContext = lastResolved
      ? `Last cycle: ${lastResolved.asset} ${lastResolved.direction}, status ${lastResolved.status}, confidence ${lastResolved.confidence}, thesis: ${str(lastResolved.thesis, 400)}. PnL: ${lastResolved.pnl_usd}.`
      : 'No resolved cycle yet — extract a foundational doctrine instead.';
    const intelContext = intel.map((i) => str(i.headline, 120)).join(' | ') || 'none';
    const doctrineContext = doctrine.map((d) => `- ${str(d.topic, 80)}: ${str(d.insight, 160)}`).join('\n') || 'none yet';

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the Xtreme Vision Council's compounding intelligence engine. Extract ONE reusable, durable insight or heuristic from the latest cycle that should permanently improve future decisions.\n\nCURRENT DOCTRINE (compounded so far):\n${doctrineContext}\n\nLATEST CYCLE:\n${cycleContext}\n\nRECENT INTEL:\n${intelContext}\n\nOutput a single NEW doctrine entry: a concise topic, the insight (a transferable rule or pattern, not a recap), a category (market/tactic/ethics/opsec/leadership/compounding), and a confidence 0-100. Do not repeat existing doctrine verbatim — advance or complement it.`,
      response_json_schema: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          insight: { type: 'string' },
          category: { type: 'string' },
          confidence: { type: 'number' },
          source: { type: 'string' }
        },
        required: ['topic', 'insight']
      }
    });

    const entry = await base44.asServiceRole.entities.Doctrine.create({
      topic: str(llm.topic, 160),
      insight: str(llm.insight, 1000),
      category: str(llm.category, 40) || 'tactic',
      confidence: Number(llm.confidence) || 50,
      source: str(llm.source, 200) || 'councilCompound',
      weight: 1,
      validated: false,
      validation_count: 0
    });

    // Compounding reward: a winning cycle reinforces the top contributing doctrine.
    if (lastResolved && lastResolved.status === 'resolved_won') {
      const top = doctrine.slice(0, 3);
      for (const d of top) {
        await base44.asServiceRole.entities.Doctrine.update(d.id, {
          weight: (d.weight || 1) + 1,
          validated: true,
          validation_count: (d.validation_count || 0) + 1
        });
      }
    }

    await base44.asServiceRole.entities.AgentLog.create({
      agent_name: 'Council',
      level: 'success',
      category: 'compounding',
      message: `Compounding brain recorded doctrine: ${entry.topic}`,
      detail: str(entry.insight, 300),
      auto_action: 'doctrine compounded',
      resolved: true
    });

    return Response.json({ doctrine: entry, total: doctrine.length + 1 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}