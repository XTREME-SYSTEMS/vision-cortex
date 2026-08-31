# 17 — The Onboarding Quest

> The front door. The lever. A compounding, AI-assisted, multiple-choice questionnaire that turns one sentence into a locked profile + ultimate goal — and feeds every other screen.

## The Flow

1. **The Seed Sentence** — one input: *"Describe the life you want."* Free text, one line. Example: *"I want to be a millionaire in a year running a fully automated digital business with minimal human interaction."*

2. **Vision Expansion** (generator, behind the UI) — `InvokeLLM` rewrites the seed into a formal **Vision Statement**: the industry focus, financial focus, autonomy level, risk tolerance, and time horizon, parsed into structured fields.

3. **The Compounding Questions** (5–7 rounds) — each question is:
   - **AI-generated** from the Vision Statement + all prior answers.
   - **Multiple choice** (3 options, exactly — the system adds "Something else").
   - **Compounding**: every answer is fed back as context for the next question, so the system gets sharper with every click.

   Question categories (universal — every life/business reduces to these):
   - **Goal** — money target, timeframe, what "success" looks like.
   - **Autonomy** — how much human interaction you want.
   - **Risk** — capital you're willing to risk, time you're willing to give.
   - **Domain** — industries you know, industries you want to enter.
   - **Personal** — lifestyle constraints, relationships, health, location.
   - **Brand** — aesthetic, voice, audience you want to attract.

4. **Goal Lock** — the final question locks the **ultimate goal** as a structured target: `{ kind, value, by_horizon }`. Example: `{ kind: "money", value: 1000000, by_horizon: "1y" }`. This goal drives every recommendation the system makes forever after.

5. **Profile Written** — the full profile + locked goal is persisted to the User entity (`base44.auth.updateMe`) and a `Profile` record. The user never sees this; they just proceed to the Morning Feed.

## The UX Rules

- **One question per screen.** No batching. No chat.
- **Progress bar** showing "Question 3 of ~6."
- **Always 3 options** + the system-injected "Something else" (free text).
- **Back button** — the user can change a prior answer; everything downstream re-compounds.
- **No AI text appears.** The question is rendered as a clean card; the AI only generates the question text and options in the backend.

## The Backend — `onboardingQuest`

- **Input:** `{ seed_sentence, answers[], step }`.
- **Process:** `InvokeLLM` with `response_json_schema` defining `{ question, options[3], field_name, is_final }`. The prompt includes the Vision Statement + all prior Q&A as context. `add_context_from_internet: true` on the first call to ground the vision in real market reality.
- **Output:** the next question (or, on the final step, the locked profile + goal).
- **Persistence:** each answer is saved incrementally so a user can pause and resume.

## Why This Is the Key

The Onboarding Quest is the **only place the human expresses intent**. Everything downstream — the Morning Feed's scoring, the Strategy recommendation, the Simulation's target, the Marketer's tone — is derived from this profile + goal. Get this right and the whole system feels psychic. Get it wrong and the system feels generic.

## Integration

- Output feeds: Morning Feed (scoring weights), Simulation Engine (goal target), Strategy recommendation (goal match), Marketer agent (brand voice).
- Re-runnable: the user can re-take the Quest from Settings; this re-seeds all downstream scoring.
