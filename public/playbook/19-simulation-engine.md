# 19 — The Simulation Engine

> The piece that turns Vision Cortex from an idea-generator into a **destiny engine**. Press one button, see every possible future of an idea — across 1 month to 10 years — with money, decisions, risks, and life events laid out. Change one line item, watch the entire future + bottom line reflow.

## Where It Sits

A discrete stage in the Build Session, **between Strategies (step 2) and Commit (step 4)**:

```
Vision → Strategies → [Goal Lock] → [Recommendation] → SIMULATE → [Line-Item Forge] → [Reverse-Engineer] → Commit
```

It is its own screen — **Simulation Studio** — not chat.

## The Data Model — `Simulation` entity

One record per simulated strategy:

- `strategy_id` → the Idea being simulated.
- `goal` → the user's locked ultimate goal (from onboarding).
- `mode` → `forecast` (project forward) | `reverse` (solve backward from a target).
- `target` → for reverse mode: `{ kind: "money"|"viral"|"approval"|"autonomy", value, by_horizon }`.
- `horizons` → `{ "1m", "3m", "6m", "1y", "3y", "5y", "10y" }`, each:
  - `revenue`, `costs`, `net_profit`, `cash_balance`
  - `key_events[]` — the headline things that happen (the viral moment, the hire, the conference, the girlfriend).
  - `risks[]` — what could go wrong + how to prevent it.
  - `probability_of_goal` — likelihood this horizon hits the locked goal.
- `decisions[]` → the line items. Each:
  - `{ id, category, label, value, options[], chosen, financial_impact, life_impact }`
  - **Categories (universal):** Investment · Team/AI-agents · Marketing · Product · Personal · Brand · Network · Health.
  - Every business/idea/invention reduces to these forks. The "girlfriend at the AI conference" is a `Network` decision with a probabilistic event attached.
- `base_case`, `best_case`, `worst_case` → three branches per run.

## The Two-Layer Reflow (the "badass to watch" mechanic)

1. **Local reflow (instant, <100ms):** every line item carries a `financial_impact` vector (monthly cost, monthly revenue delta, one-time cost, probability shift). When the user changes "Marketing: organic → paid ads $2k/mo," the client re-sums every horizon's net profit and the bottom-line number animates immediately. Pure math, no waiting.

2. **Deep re-simulate (10–20s, on demand):** pressing "Re-run simulation" sends the full edited decision set to the LLM with `add_context_from_internet: true` (real market data, real comps). The LLM re-projects the qualitative timelines (events, risks, the viral moment, the life events) against the new decisions. The numbers stay from the local reflow; the *story* updates from the deep run.

So the user gets both: **instant gratification on the money, real intelligence on the life.**

## The Backend — `simulateStrategy`

- **Input:** `{ strategy_id, goal, decisions[], mode, target }`.
- **Process:** `InvokeLLM` with `add_context_from_internet: true`, a strict `response_json_schema` matching the horizons + decisions shape, and a system prompt that forces the LLM to:
  1. Project each horizon (revenue, costs, events, risks, probability).
  2. Attach a financial + life impact to every decision.
  3. In `reverse` mode: *solve* the decision set to hit the target and flag which decisions must change.
- **Output:** the full Simulation record → persisted to the `Simulation` entity → returned to the studio.
- **Recommendation:** the same function in `reverse` mode with the user's locked goal as target, run across all 10 strategies, scores each by `probability_of_goal`, surfaces the winner. This is how the system "always recommends."

## The UI — Simulation Studio

One screen, no chat:

- **Top:** seven horizon columns (1m → 10y) — net profit + the headline event each. The spine of the simulated life.
- **Middle:** the decision line items, grouped by category, each editable (dropdown / slider / toggle). This is where you change the ad spend, the agent count, the boyfriend, the workout.
- **Bottom:** the **live bottom line** — total net at 1y / 3y / 10y + a big `probability of your goal` meter.
- **Two buttons:** `Re-run deep simulation` · `Reverse-engineer to target` (set target → it rewrites the decisions).

## The "Change One Line → Everything Reflows" Moment

This is the viral demo. The user drags one slider — "Investment: $0 → $10,000" — and:
- every horizon's net profit animates,
- the 1y cash balance dips then recovers,
- the 3y revenue jumps,
- the probability-of-goal meter climbs,
- a new key_event appears ("hired first AI agent squad"),
- the bottom line number rolls up.

That is the moment the user understands they can *steer their future*. One sentence → a life, simulated, editable, real.

## Integration

- Consumes: the Strategy (from step 2) + the user's locked goal (from onboarding).
- Produces: a committed `Simulation` → becomes the AutoBuilder build's spec (the chosen decision set is the build's requirements).
- Feeds: the Queue (on Commit), the Marketer agent (the chosen marketing decisions), the revenue-feedback loop (the target becomes the success metric).
