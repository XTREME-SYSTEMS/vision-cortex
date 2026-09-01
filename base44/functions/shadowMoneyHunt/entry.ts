import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// shadowMoneyHunt — the Shadow agent's money-hunting protocol. Follows the money:
// billionaire AI deals, algorithmic trading secrets, data markets, hidden wealth
// programs, deal timing (Trump-style), AI-generated wealth, digital experts making
// millions in unknown places, and the secrets of the wealthy. Hunts down the
// algorithms, data, locations, methods, and systems. Logs everything to the
// Shadow screen (AgentLog + IntelFeed) and emails the owner every single time.

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
      category: 'money_hunt',
      message: 'Money hunt initiated — following the billionaire and millionaire AI/data trails.',
    });

    const prompt = `You are the Shadow agent for the Vision Cortex Destiny Engine. Your mission: FOLLOW THE MONEY. Hunt down where billionaires and millionaires are making their money right now with AI, data, algorithms, and deals. Do not stop until you have the algorithms, the data, the locations, the methods, the systems, and everything in and around what makes people millions right now.

Search for ALL of the following:
1. BILLIONAIRE AI DEALS — who is investing in AI right now, what deals are happening, where is the smart money flowing, what startups are getting funded
2. ALGORITHMIC TRADING SECRETS — hedge fund strategies, quant algorithms, AI-driven trading systems generating millions, the actual methods behind them
3. DATA MARKETS — who is buying/selling data, data brokerages, data monetization plays, how data is being turned into wealth
4. HIDDEN WEALTH PROGRAMS — underground digital money systems, private AI tools, exclusive platforms the public doesn't know about
5. DEAL TIMING — how figures like Donald Trump made billions in trades this past year by timing deals right; what signals, data, and methods they use to know when to move
6. AI-GENERATED WEALTH — AI systems being used to create, find, or predict money opportunities; AI tools that generate revenue autonomously
7. DIGITAL EXPERTS MAKING MILLIONS — indie hackers, solo developers, digital arbitrage experts making millions in places most people don't know exist
8. SECRETS OF THE WEALTHY — private algorithms, proprietary systems, exclusive data sources, insider methods
9. EMERGING MONEY SYSTEMS — DeFi, crypto, tokenized assets, new financial rails, AI-predicted markets
10. METHODS AND LOCATIONS — exact platforms, websites, tools, and methods being used right now to generate wealth

For each finding, provide:
- headline: the opportunity or secret (what it is)
- category: one of billionaire_deal, algo_trading, data_market, hidden_program, deal_timing, ai_wealth, digital_expert, wealthy_secret, emerging_system
- method: how it works (the actual method, not vague)
- location: where to find it (the platform, website, tool, or place)
- wealth_potential: how much money is being made or could be made
- algorithm_or_data: the specific algorithm, data source, or system behind it
- build_system_value: the full value of building this system — what it's worth, why it matters, what it unlocks
- tricks: the tricks, hacks, shortcuts, and exploits that make it work (the non-obvious edge)
- algorithms: the specific algorithms, models, or mathematical methods to use
- obtain_asap: exact steps to obtain or replicate this ASAP — the fastest path to money
- avoid: what to avoid — pitfalls, traps, legal risks, red flags, things that will lose money
- action_steps: exact steps to replicate or access it
- url: source URL where you found this
- impact_score: 1-10 based on wealth potential and actionability

Be exhaustive and specific. Return everything you find — the more actionable, the better. Pack every field with maximum detail.`;

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
                headline: { type: 'string', description: 'The opportunity or secret' },
                category: { type: 'string' },
                method: { type: 'string', description: 'How it works' },
                location: { type: 'string', description: 'Where to find it — platform, website, tool' },
                wealth_potential: { type: 'string', description: 'Estimated money upside' },
                algorithm_or_data: { type: 'string', description: 'The algorithm, data, or system behind it' },
                build_system_value: { type: 'string', description: 'Full value of building this system — what it unlocks' },
                tricks: { type: 'string', description: 'Tricks, hacks, shortcuts, exploits — the non-obvious edge' },
                algorithms: { type: 'string', description: 'Specific algorithms, models, or math methods to use' },
                obtain_asap: { type: 'string', description: 'Fastest path to obtain/replicate this ASAP' },
                avoid: { type: 'string', description: 'What to avoid — pitfalls, traps, legal risks, red flags' },
                action_steps: { type: 'array', items: { type: 'string' } },
                url: { type: 'string' },
                impact_score: { type: 'number' },
              },
              required: ['headline', 'method'],
            },
          },
          executive_summary: { type: 'string', description: 'A concise summary of the biggest money trails found' },
        },
        required: ['findings', 'executive_summary'],
      },
    });

    const findings = res.findings || [];

    // Log every finding to the Shadow screen (AgentLog)
    await base44.entities.AgentLog.create({
      agent_name: 'Shadow',
      level: 'success',
      category: 'money_hunt',
      message: `Money hunt complete — ${findings.length} intelligence items found. ${res.executive_summary}`,
      detail: findings.slice(0, 8).map((f) => `• ${f.headline} — ${f.wealth_potential || 'unknown upside'} — ${f.location || 'location unknown'}`).join('\n'),
    });

    // Store detailed findings in IntelFeed so they persist on the Shadow screen
    // Pack ALL detail into the summary as labeled sections for full display
    const created = [];
    for (const f of findings) {
      const sections = [
        f.method ? `[METHOD] ${f.method}` : '',
        f.location ? `[LOCATION] ${f.location}` : '',
        f.wealth_potential ? `[WEALTH POTENTIAL] ${f.wealth_potential}` : '',
        f.algorithm_or_data ? `[ALGORITHM/DATA] ${f.algorithm_or_data}` : '',
        f.build_system_value ? `[BUILD SYSTEM VALUE] ${f.build_system_value}` : '',
        f.tricks ? `[TRICKS] ${f.tricks}` : '',
        f.algorithms ? `[ALGORITHMS] ${f.algorithms}` : '',
        f.obtain_asap ? `[OBTAIN ASAP] ${f.obtain_asap}` : '',
      ].filter(Boolean).join('\n\n');
      const record = await base44.entities.IntelFeed.create({
        category: f.category || 'shadow_money_hunt',
        headline: f.headline,
        summary: sections,
        source: 'Shadow Money Hunt',
        url: f.url || '',
        signals: f.action_steps || [],
        correlations: f.avoid ? [f.avoid] : [],
        impact_score: f.impact_score || 5,
      });
      created.push(record.id);
    }

    // Send email to owner every time
    const emailBody = `SHADOW MONEY HUNT REPORT
=========================

EXECUTIVE SUMMARY:
${res.executive_summary}

${findings.length} INTELLIGENCE ITEMS FOUND:

${findings.map((f, i) => `
${i + 1}. ${f.headline}
   Category: ${f.category || 'N/A'}
   Method: ${f.method || 'N/A'}
   Location: ${f.location || 'N/A'}
   Wealth Potential: ${f.wealth_potential || 'N/A'}
   Algorithm/Data: ${f.algorithm_or_data || 'N/A'}
   Action Steps: ${(f.action_steps || []).join('; ')}
   Source: ${f.url || 'N/A'}
`).join('\n')}

Full intelligence logged to the Shadow screen.

— Shadow Agent, Vision Cortex Destiny Engine
`;

    try {
      await core.SendEmail({
        to: OWNER_EMAIL,
        subject: `Shadow Money Hunt — ${findings.length} intelligence items found`,
        body: emailBody,
      });
      await base44.entities.AgentLog.create({
        agent_name: 'Shadow',
        level: 'success',
        category: 'money_hunt',
        message: `Email sent to ${OWNER_EMAIL} with ${findings.length} money intelligence items.`,
      });
    } catch (emailErr) {
      await base44.entities.AgentLog.create({
        agent_name: 'Shadow',
        level: 'warn',
        category: 'money_hunt',
        message: `Email send failed: ${emailErr.message || emailErr}. Intelligence logged to Shadow screen only.`,
      });
    }

    return Response.json({
      found: findings.length,
      intel_feed_created: created.length,
      executive_summary: res.executive_summary,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}