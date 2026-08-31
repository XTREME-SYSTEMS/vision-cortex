import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// ═══════════════════════════════════════════════════════════════
// scoreIdeaToProfile — scores ideas against the user's destiny profile.
// The engine behind the Morning Feed: turns the generic ranked list into
// a personalized feed of life-paths, each measured for fit, goal alignment,
// autonomy/risk match, and time-to-goal. See playbook ch.18.
// ═══════════════════════════════════════════════════════════════

export default async function (req) {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { idea_ids, limit = 10 } = body;
    const core = base44.asServiceRole.integrations.Core;

    const profiles = await base44.entities.UserProfile.filter({ user_id: user.id }).catch(() => []);
    const profile = profiles && profiles[0];
    if (!profile) return Response.json({ error: "No profile — complete the Onboarding Quest first." }, { status: 400 });

    let ideas;
    if (idea_ids && idea_ids.length) {
      ideas = await Promise.all(idea_ids.map((id) => base44.entities.Idea.get(id).catch(() => null)));
      ideas = ideas.filter(Boolean);
    } else {
      ideas = await base44.entities.Idea.list("rank", limit);
    }
    if (!ideas.length) return Response.json({ scores: [] });

    const compact = ideas.map((i) => ({
      id: i.id, title: i.title, industry: i.industry, sub_industry: i.sub_industry,
      one_liner: i.one_liner, est_monthly_profit_usd: i.est_monthly_profit_usd,
      launch_cost_usd: i.launch_cost_usd, time_to_launch_days: i.time_to_launch_days,
      probability_of_success: i.probability_of_success, target_users: i.target_users,
    }));

    const res = await core.InvokeLLM({
      prompt: `You are the Morning Feed scorer for Vision Cortex. Score EACH idea against the user's destiny profile.
PROFILE:
Vision: ${profile.vision_statement}
Goal: ${JSON.stringify(profile.goal || {})}
Industry focus: ${profile.industry_focus || "?"}
Financial focus: ${profile.financial_focus || "?"}
Autonomy: ${profile.autonomy_level || "?"}
Risk: ${profile.risk_tolerance || "?"}
Horizon: ${profile.time_horizon || "?"}
Answers: ${JSON.stringify(profile.answers || [])}

IDEAS: ${JSON.stringify(compact)}

For EACH idea return: { id, fit_score (0-100), goal_alignment (0-100), autonomy_match (0-100), risk_match (0-100), time_to_goal_days (int), rationale (one sentence why it fits the user's stated goal) }.
Be rigorous and discriminating — a poor fit should score below 50. Return JSON { scores: [...] }.`,
      response_json_schema: {
        type: "object",
        properties: {
          scores: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                fit_score: { type: "number" },
                goal_alignment: { type: "number" },
                autonomy_match: { type: "number" },
                risk_match: { type: "number" },
                time_to_goal_days: { type: "number" },
                rationale: { type: "string" },
              },
              required: ["id", "fit_score", "rationale"],
            },
          },
        },
        required: ["scores"],
      },
    });

    const scores = (res?.scores || [])
      .map((s) => ({ ...(ideas.find((i) => i.id === s.id) || {}), ...s }))
      .sort((a, b) => (b.fit_score || 0) - (a.fit_score || 0));

    return Response.json({ scores });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}