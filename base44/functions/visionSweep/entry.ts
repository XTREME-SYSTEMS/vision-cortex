import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const str = (v, max) => String(v ?? '').slice(0, max);
const arr = (v, max, itemMax) =>
  Array.isArray(v) ? v.slice(0, max).map((s) => str(s, itemMax)) : [];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Auth gate: allow the scheduled workflow (no user) or an admin.
    let allowed = true;
    try {
      const user = await base44.auth.me();
      if (user) allowed = user.role === 'admin';
    } catch {
      allowed = true;
    }
    if (!allowed) return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const count = Math.min(Number(body?.count) || 30, 30);

    const prompt = `You are the Vision Agent of Vision Cortex, an autonomous opportunity-scanning system. Today is ${new Date().toUTCString()}. Use live web search to surface the ${count} highest-leverage, launchable business opportunities available right now.

Scan: Product Hunt launches, Reddit (r/SaaS, r/Entrepreneur, r/sidehustle), Hacker News, X/Twitter trends, emerging AI tools, underserved niches, painful problems with real demand, and gaps left by incumbents.

For EACH opportunity, capture:
- title (concise product/business name)
- one_liner (one sentence value prop)
- industry (broad category)
- sub_industry (niche)
- problem (the real pain, 1-2 sentences)
- solution (what gets built, 1-2 sentences)
- target_users (who pays)
- rank (1 to ${count}, 1 = best)
- score (0-100, overall conviction)
- probability_of_success (0-100)
- launch_cost_usd (realistic USD to launch)
- est_monthly_profit_usd
- est_annual_revenue_usd
- time_to_launch_days
- trend_signal (why now)
- moat (defensibility)
- hidden_opportunity (the non-obvious edge)
- tech_stack (array of 3-6 strings)
- monetization (array of 2-4 strings)
- risks (array of 2-4 strings)
- source_urls (array of real URLs found during search)

Return JSON matching the schema. items is the array of ${count} opportunities. Be rigorous: real demand only, no vapor. Cite real sources.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                one_liner: { type: 'string' },
                industry: { type: 'string' },
                sub_industry: { type: 'string' },
                problem: { type: 'string' },
                solution: { type: 'string' },
                target_users: { type: 'string' },
                rank: { type: 'number' },
                score: { type: 'number' },
                probability_of_success: { type: 'number' },
                launch_cost_usd: { type: 'number' },
                est_monthly_profit_usd: { type: 'number' },
                est_annual_revenue_usd: { type: 'number' },
                time_to_launch_days: { type: 'number' },
                trend_signal: { type: 'string' },
                moat: { type: 'string' },
                hidden_opportunity: { type: 'string' },
                tech_stack: { type: 'array', items: { type: 'string' } },
                monetization: { type: 'array', items: { type: 'string' } },
                risks: { type: 'array', items: { type: 'string' } },
                source_urls: { type: 'array', items: { type: 'string' } }
              },
              required: ['title', 'one_liner', 'industry', 'problem', 'solution']
            }
          }
        },
        required: ['items']
      }
    });

    const items = (result.items || []).slice(0, count).map((it, i) => ({
      title: str(it.title, 200),
      one_liner: str(it.one_liner, 300),
      industry: str(it.industry, 80),
      sub_industry: str(it.sub_industry, 80),
      problem: str(it.problem, 1000),
      solution: str(it.solution, 1000),
      target_users: str(it.target_users, 300),
      rank: Number(it.rank) || i + 1,
      score: Number(it.score) || 0,
      probability_of_success: Number(it.probability_of_success) || 0,
      launch_cost_usd: Number(it.launch_cost_usd) || 0,
      est_monthly_profit_usd: Number(it.est_monthly_profit_usd) || 0,
      est_annual_revenue_usd: Number(it.est_annual_revenue_usd) || 0,
      time_to_launch_days: Number(it.time_to_launch_days) || 0,
      trend_signal: str(it.trend_signal, 500),
      moat: str(it.moat, 500),
      hidden_opportunity: str(it.hidden_opportunity, 500),
      tech_stack: arr(it.tech_stack, 8, 100),
      monetization: arr(it.monetization, 6, 200),
      risks: arr(it.risks, 6, 300),
      source_urls: arr(it.source_urls, 8, 500),
      stage: 'discovered',
      discovered_by: 'vision-sweep'
    }));

    if (items.length) await base44.asServiceRole.entities.Idea.bulkCreate(items);

    return Response.json({ swept: items.length, items });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}