import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// ═══════════════════════════════════════════════════════════════
// simulateUserJourney — the meta-simulation. Generates N diverse,
// realistic user personas (varying age, background, tech literacy,
// goal clarity, personality) and simulates each one's complete
// journey through Vision Cortex: the vision they'd naturally give,
// what the system would recommend, their experience score, what
// they'd like / dislike, and where the system fails them.
// Returns per-user scores + an aggregate system-readiness verdict.
// This is the stress-test that answers: "can this serve ANY human?"
// ═══════════════════════════════════════════════════════════════

export default async function (req) {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const count = Math.min(Math.max(body.count || 8, 3), 12);
    const core = base44.asServiceRole.integrations.Core;

    const res = await core.InvokeLLM({
      prompt: `You are a product-testing AI simulating real users going through Vision Cortex — an autonomous business-creation platform. The user gives a vision sentence, and the system is supposed to autonomously generate strategies, simulate outcomes, build a brand + website + content, provision infrastructure, launch, and monetize — with near-zero interaction beyond "ok go." It also has a Life Lab that simulates life outcomes and an accountability coach.

Generate ${count} MAXIMALLY DIVERSE user personas. Cover the full spectrum of humanity:
- A total beginner with no tech skills and no idea what they want
- A burned-out professional who wants passive income but doesn't know how
- A creative 20-something with big dreams and no discipline
- A retiree who needs income and is afraid of technology
- A blue-collar worker who knows their industry but not digital tools
- A neurodivergent person (ADHD/autism) who thinks differently
- A skeptical executive who demands proof before acting
- A single parent with zero time and zero budget
- A serial entrepreneur who gets bored after launch
- Someone who doesn't speak tech jargon and needs plain language
- A person whose real goal is life-balance, not money
- A person in a developing country with $50 to start

For EACH user, simulate their FULL journey through the system and score it honestly:

1. PERSONA: name, age, archetype (one label), background (1 sentence), personality_summary (1 sentence), big_five (0-100 each: openness, conscientiousness, extraversion, agreeableness, neuroticism), risk_tolerance (low/medium/high/extreme), tech_savviness (1-10), goal_clarity (1-10 — how clear are they on what they want)

2. VISION: the exact vision sentence this person would naturally type (in their own voice — not corporate speak)

3. SYSTEM RESPONSE: what the system would actually produce for them — top_strategies (3 titles), recommendation (the best strategy title + one_liner + why it fits THIS person)

4. EXPERIENCE SCORE: experience_score (1-10 — how intuitive/frictionless would the system be for THIS person), success_probability (0-1 — realistic probability they'd actually get a launched, monetized business), liked (2-3 things they'd love), disliked (2-3 things that would frustrate/block them)

5. GAPS: gaps (2-4 specific things the system currently fails to do for this person — be brutally honest based on what the system actually does today: it generates strategies, brands, websites, content calendars, and creates a Vercel project shell, but does NOT deploy code, register a business, post to social media, set up payments, send an email, or guide a user who has no vision)

Then provide an AGGREGATE verdict:
- avg_experience_score (mean across users)
- avg_success_probability (mean)
- weakest_user_type (which persona the system serves worst, and why)
- strongest_user_type (which persona it serves best)
- universal_gaps (3-5 gaps that affect nearly every user type)
- overall_verdict (1 paragraph: can this system serve virtually any human today? what's the #1 thing to fix?)

Be realistic, specific, and honest. Do not sugarcoat. If the system would fail a user, say so.`,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          users: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                age: { type: 'number' },
                archetype: { type: 'string' },
                background: { type: 'string' },
                personality_summary: { type: 'string' },
                big_five: {
                  type: 'object',
                  properties: {
                    openness: { type: 'number' },
                    conscientiousness: { type: 'number' },
                    extraversion: { type: 'number' },
                    agreeableness: { type: 'number' },
                    neuroticism: { type: 'number' },
                  },
                },
                risk_tolerance: { type: 'string' },
                tech_savviness: { type: 'number' },
                goal_clarity: { type: 'number' },
                vision: { type: 'string' },
                top_strategies: { type: 'array', items: { type: 'string' } },
                recommendation: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    one_liner: { type: 'string' },
                    why: { type: 'string' },
                  },
                },
                experience_score: { type: 'number' },
                success_probability: { type: 'number' },
                liked: { type: 'array', items: { type: 'string' } },
                disliked: { type: 'array', items: { type: 'string' } },
                gaps: { type: 'array', items: { type: 'string' } },
              },
              required: ['name', 'archetype', 'vision', 'experience_score', 'success_probability', 'gaps'],
            },
          },
          aggregate: {
            type: 'object',
            properties: {
              avg_experience_score: { type: 'number' },
              avg_success_probability: { type: 'number' },
              weakest_user_type: { type: 'string' },
              strongest_user_type: { type: 'string' },
              universal_gaps: { type: 'array', items: { type: 'string' } },
              overall_verdict: { type: 'string' },
            },
            required: ['avg_experience_score', 'avg_success_probability', 'overall_verdict'],
          },
        },
        required: ['users', 'aggregate'],
      },
    });

    await base44.entities.AgentLog.create({
      agent_name: 'Destiny Engine',
      level: 'info',
      category: 'user_simulation',
      message: `User journey simulation ran for ${count} diverse personas. Avg experience: ${res?.aggregate?.avg_experience_score || '?'}/10.`,
    });

    return Response.json(res);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}