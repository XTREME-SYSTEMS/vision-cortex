import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// shadowSentiment — monitors social media and news to score market excitement
// for each niche identified by the Shadow money hunt. Uses LLM with web search
// to gauge sentiment, momentum, and hype levels. Stores results in IntelFeed
// (source: 'Shadow Sentiment') for the Shadow dashboard.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const core = base44.asServiceRole.integrations.Core;

    await base44.entities.AgentLog.create({
      agent_name: 'Shadow',
      level: 'info',
      category: 'sentiment',
      message: 'Sentiment tracker initiated — scanning social media and news for niche market excitement.',
    });

    // Pull all money-hunt niches
    const intel = await base44.entities.IntelFeed.filter(
      { source: 'Shadow Money Hunt' },
      '-created_date',
      30
    ).catch(() => []);

    if (!intel.length) {
      return Response.json({ error: 'No money-hunt intelligence found. Run Shadow Money Hunt first.' }, { status: 400 });
    }

    // Extract unique niches from categories + headlines
    const niches = [...new Set(intel.map((f) => f.category || 'general'))];
    const nicheHeadlines = niches.map((n) => ({
      niche: n,
      headlines: intel.filter((f) => (f.category || 'general') === n).map((f) => f.headline).slice(0, 5),
    }));

    const prompt = `You are the Shadow sentiment tracker for Vision Cortex. Analyze the current market excitement, social media buzz, and news sentiment for each of these niches identified by the money hunt. Use web search to find real-time social media discussions, news articles, Reddit threads, X/Twitter buzz, and industry reports.

For each niche, provide:
- niche: the niche name
- excitement_score: 1-10 (how much hype/buzz exists right now)
- momentum: 'rising', 'peak', 'cooling', or 'dormant'
- sentiment: 'euphoric', 'positive', 'neutral', 'negative', 'fearful'
- key_buzz_terms: top 5 terms driving the conversation
- top_platforms: where the conversation is happening (X, Reddit, TikTok, LinkedIn, HN, etc.)
- viral_potential: 1-10 (how likely this goes viral)
- competitor_density: 1-10 (how saturated the market is)
- opportunity_window: 'closing', 'open', 'wide_open', 'early'
- summary: 2-3 sentence analysis
- sources: URLs of relevant discussions/articles

NICHES TO ANALYZE:
${JSON.stringify(nicheHeadlines)}

Be rigorous. Use real web data. Score based on actual social media activity and news volume, not assumptions.`;

    const res = await core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          niches: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                niche: { type: 'string' },
                excitement_score: { type: 'number' },
                momentum: { type: 'string' },
                sentiment: { type: 'string' },
                key_buzz_terms: { type: 'array', items: { type: 'string' } },
                top_platforms: { type: 'array', items: { type: 'string' } },
                viral_potential: { type: 'number' },
                competitor_density: { type: 'number' },
                opportunity_window: { type: 'string' },
                summary: { type: 'string' },
                sources: { type: 'array', items: { type: 'string' } },
              },
              required: ['niche', 'excitement_score'],
            },
          },
          market_pulse: { type: 'string', description: 'Overall market pulse summary' },
        },
        required: ['niches', 'market_pulse'],
      },
    });

    // Store sentiment results in IntelFeed
    const created = [];
    for (const n of (res.niches || [])) {
      const record = await base44.entities.IntelFeed.create({
        category: n.niche,
        headline: `Sentiment: ${n.niche} — ${n.excitement_score}/10 excitement, ${n.momentum}`,
        summary: `[EXCITEMENT SCORE] ${n.excitement_score}/10\n\n[MOMENTUM] ${n.momentum}\n\n[SENTIMENT] ${n.sentiment}\n\n[VIRAL POTENTIAL] ${n.viral_potential}/10\n\n[COMPETITOR DENSITY] ${n.competitor_density}/10\n\n[OPPORTUNITY WINDOW] ${n.opportunity_window}\n\n[BUZZ TERMS] ${(n.key_buzz_terms || []).join(', ')}\n\n[PLATFORMS] ${(n.top_platforms || []).join(', ')}\n\n[SUMMARY] ${n.summary}`,
        source: 'Shadow Sentiment',
        url: (n.sources || [])[0] || '',
        signals: n.sources || [],
        impact_score: n.excitement_score,
      });
      created.push(record.id);
    }

    await base44.entities.AgentLog.create({
      agent_name: 'Shadow',
      level: 'success',
      category: 'sentiment',
      message: `Sentiment scan complete — ${created.length} niches scored. Market pulse: ${res.market_pulse}`,
    });

    return Response.json({
      niches_scored: created.length,
      market_pulse: res.market_pulse,
      niches: res.niches,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}