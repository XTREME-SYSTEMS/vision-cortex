import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// ═══════════════════════════════════════════════════════════════
// onboardingQuest — the front door of the Destiny Engine.
// A compounding, AI-assisted, multiple-choice questionnaire:
//   seed sentence → vision expansion → N questions → goal lock.
// One question per call. Each question is generated from the vision
// statement + all prior answers (compounding). The final call locks
// the user's ultimate goal. See public/playbook/17-onboarding-quest.md.
// ═══════════════════════════════════════════════════════════════

const MAX_QUESTIONS = 7;

export default async function (req) {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { seed_sentence, answer, action } = body;
    const core = base44.asServiceRole.integrations.Core;

    // Find or create the user's profile.
    let profile = null;
    const existing = await base44.entities.UserProfile.filter({ user_id: user.id }).catch(() => []);
    if (existing && existing.length) profile = existing[0];

    // STEP 0 — start: parse the seed sentence into a vision statement.
    if (action === "start" && seed_sentence) {
      const vision = await core.InvokeLLM({
        prompt: `You are the Onboarding Quest for Vision Cortex, an autonomous destiny engine.
Parse this user's life-vision sentence into a formal Vision Statement and structured focus fields.
Sentence: "${seed_sentence}"
Return JSON with: vision_statement (1-2 sentences, formal), industry_focus, financial_focus (a money target if implied), autonomy_level (low|med|high), risk_tolerance (low|med|high), time_horizon (e.g. "1y","5y"), brand_aesthetic, brand_voice, target_audience. Infer reasonably; leave blank if unknown.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            vision_statement: { type: "string" },
            industry_focus: { type: "string" },
            financial_focus: { type: "string" },
            autonomy_level: { type: "string" },
            risk_tolerance: { type: "string" },
            time_horizon: { type: "string" },
            brand_aesthetic: { type: "string" },
            brand_voice: { type: "string" },
            target_audience: { type: "string" },
          },
          required: ["vision_statement"],
        },
      });

      const created = await base44.entities.UserProfile.create({
        user_id: user.id,
        seed_sentence,
        vision_statement: vision?.vision_statement || seed_sentence,
        industry_focus: vision?.industry_focus || "",
        financial_focus: vision?.financial_focus || "",
        autonomy_level: vision?.autonomy_level || "",
        risk_tolerance: vision?.risk_tolerance || "",
        time_horizon: vision?.time_horizon || "",
        brand_aesthetic: vision?.brand_aesthetic || "",
        brand_voice: vision?.brand_voice || "",
        target_audience: vision?.target_audience || "",
        answers: [],
        completed: false,
      });

      const question = await nextQuestion(core, created, []);
      return Response.json({ profile_id: created.id, question });
    }

    // STEP N — append the latest answer and generate the next question.
    if (profile) {
      let answers = profile.answers || [];
      if (answer) {
        answers = [...answers, answer];
        await base44.entities.UserProfile.update(profile.id, { answers });
      }

      // If we've hit the cap or the LLM says final, lock the goal.
      const question = await nextQuestion(core, { ...profile, answers }, answers);
      if (question.is_final || answers.length >= MAX_QUESTIONS) {
        const goal = await lockGoal(core, { ...profile, answers });
        await base44.entities.UserProfile.update(profile.id, { goal, completed: true });
        return Response.json({ profile_id: profile.id, completed: true, goal, question: null });
      }
      return Response.json({ profile_id: profile.id, question });
    }

    return Response.json({ error: "Provide action:'start' and a seed_sentence." }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

async function nextQuestion(core, profile, answers) {
  const prompt = `You are the Onboarding Quest for Vision Cortex.
Generate the NEXT multiple-choice question for this user. The question must compound on everything known so far.

VISION STATEMENT: ${profile.vision_statement || "(none yet)"}
INDUSTRY: ${profile.industry_focus || "?"}  FINANCIAL: ${profile.financial_focus || "?"}  AUTONOMY: ${profile.autonomy_level || "?"}  RISK: ${profile.risk_tolerance || "?"}  HORIZON: ${profile.time_horizon || "?"}
PRIOR Q&A:
${answers.map((a, i) => `Q${i + 1}: ${a.question}\nA: ${a.answer}`).join("\n") || "(none)"}

RULES:
- Ask ONE question with EXACTLY 3 options (the UI adds "Something else").
- Cover, in order until you have enough: Goal specifics, Autonomy, Risk/capital, Domain, Personal/lifestyle, Brand.
- Make options concrete and distinct.
- Set is_final=true once you have enough to lock a goal (after ~5-7 questions).
Return JSON.`;
  const res = await core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        question: { type: "string" },
        options: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
        field_name: { type: "string" },
        is_final: { type: "boolean" },
      },
      required: ["question", "options", "is_final"],
    },
  });
  return res || { question: "Something went wrong. Try again.", options: ["Retry"], is_final: false };
}

async function lockGoal(core, profile) {
  const res = await core.InvokeLLM({
    prompt: `You are the Onboarding Quest for Vision Cortex. Lock the user's ultimate goal as a structured target.
VISION: ${profile.vision_statement}
ANSWERS: ${JSON.stringify(profile.answers)}
Return JSON: { "kind": "money|viral|approval|autonomy|lifestyle", "value": number, "by_horizon": "1m|3m|6m|1y|3y|5y|10y", "summary": "one line" }. Pick the single most-likely-to-motivate goal.`,
    response_json_schema: {
      type: "object",
      properties: {
        kind: { type: "string" },
        value: { type: "number" },
        by_horizon: { type: "string" },
        summary: { type: "string" },
      },
      required: ["kind", "value", "by_horizon"],
    },
  });
  return res || { kind: "money", value: 100000, by_horizon: "1y", summary: "Default goal" };
}