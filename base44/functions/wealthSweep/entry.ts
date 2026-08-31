import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// wealthSweep — the wealth enhancement search engine. Continuously searches the
// web for wealth-enhancing digital programs, algorithms, digital secrets,
// tricks, and system glitches that enable significant wealth or system
// enhancements. Stores findings in IntelFeed for the dashboard.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const core = base44.asServiceRole.integrations.Core;

    const prompt = `You are the Wealth Sweep engine for the Vision Cortex Destiny Engine. Search the web for wealth-enhancing digital programs, algorithms, digital secrets, digital tricks, and glitches in systems that enable significant wealth or system enhancements. Focus on:

1. New digital tools, platforms, and SaaS that enable passive or automated income
2. Algorithmic trading, arbitrage, and DeFi opportunities (legal, real)
3. Automation scripts, AI workflows, and no-code stacks that compound wealth
4. Digital marketing growth hacks and viral acquisition tricks
5. System optimization techniques that slash costs or boost throughput
6. Emerging digital economies, platform glitches, and early-mover opportunities
7. Open-source tools and free resources that replace paid subscriptions

For each finding, provide: the opportunity name, a concise summary of how it works, the wealth potential (monthly or annual), the category, the source URL, and actionable signals.

Return a structured list of the top 8-12 most actionable findings.`;

    const res = await core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          findings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                headline: { type: 'string', description: 'Short name of the opportunity' },
                summary: { type: 'string', description: 'How it works, 2-3 sentences' },
                category: { type: 'string', description: 'e.g. "automation", "arbitrage", "saas", "marketing"' },
                wealth_potential: { type: 'string', description: 'Estimated monthly or annual upside' },
                url: { type: 'string', description: 'Source URL' },
                signals: { type: 'array', items: { type: 'string' }, description: 'Actionable next steps' },
              },
              required: ['headline', 'summary'],
            },
          },
        },
        required: ['findings'],
      },
    });

    const created = [];
    for (const f of (res.findings || [])) {
      const record = await base44.entities.IntelFeed.create({
        category: f.category || 'wealth_sweep',
        headline: f.headline,
        summary: f.summary,
        source: 'Wealth Sweep',
        url: f.url || '',
        signals: f.signals || [],
        impact_score: 5,
      });
      created.push(record.id);
    }

    await base44.entities.AgentLog.create({
      agent_name: 'Wealth Sweep',
      level: 'info',
      category: 'wealth_sweep',
      message: `Wealth sweep complete — ${created.length} wealth-enhancing digital opportunities found via web search.`,
    });

    return Response.json({ created: created.length, findings: res.findings });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}