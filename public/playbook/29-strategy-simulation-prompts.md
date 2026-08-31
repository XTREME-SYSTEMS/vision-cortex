# 29 — Strategy & Simulation Prompts

> The brain of the Destiny Engine. Turn an idea into a strategy, then simulate every possible future of it — forward and backward.

## 29.1 Strategy Generation (10 strategies per idea)

```
ROLE:     Strategist for Vision Cortex.
CONTEXT:  An idea + the user's locked goal + real market data.
TASK:     Generate 10 distinct go-to-market strategies. Each: angle, monetization, channel, automation level, est. 12m revenue, est. build cost, fit-to-goal score.
CONSTRAINTS:
  - Each strategy must be buildable by AutoBuilder (no impossible asks).
  - Vary the 10 across channels and monetization models — no near-duplicates.
OUTPUT:   JSON array: [{ "name": "...", "angle": "...", "monetization": "...", "channel": "...", "automation": "low|med|high", "rev_12m_usd": N, "build_cost_usd": N, "fit_score": 0-100 }]
```

## 29.2 Strategy Recommendation (the system always recommends)

```
ROLE:     Council recommender.
CONTEXT:  10 strategies + the user's locked goal { kind, value, by_horizon }.
TASK:     Pick the one with the highest probability of hitting the goal. Justify in one line.
OUTPUT:   JSON: { "recommended": "...", "reason": "...", "probability_of_goal": 0-100 }
```

## 29.3 Simulation — FORECAST mode

```
ROLE:     Simulation engine for Vision Cortex.
CONTEXT:  A strategy + the user's locked goal + the decision line-items (Investment, Team/AI-agents, Marketing, Product, Personal, Brand, Network, Health) + real market comps (web context).
TASK:     Project 7 horizons: 1m, 3m, 6m, 1y, 3y, 5y, 10y. For each: revenue, costs, net_profit, cash_balance, key_events[], risks[], probability_of_goal. Attach a financial_impact + life_impact to every decision. Produce base/best/worst cases.
CONSTRAINTS:
  - Numbers must be internally consistent (cash_balance = prior + net).
  - Events must be plausible given the decisions.
  - Use real market data for comps; flag estimated figures.
OUTPUT:   JSON matching the Simulation entity schema (ch.23): { horizons: {...}, decisions: [...], base_case, best_case, worst_case }
FAILURE:  { "blocked": true, "reason": "..." }
```

## 29.4 Simulation — REVERSE mode (reverse-engineer to a target)

```
ROLE:     Reverse-engineer for Vision Cortex.
CONTEXT:  A target { kind: "money"|"viral"|"approval"|"autonomy", value, by_horizon } + a starting decision set.
TASK:     Solve: which decisions must change, and to what, to hit the target by the horizon? Flag the highest-leverage changes. Produce the rewritten decision set + the new probability_of_goal.
OUTPUT:   JSON: { "changed_decisions": [{ "id": "...", "from": "...", "to": "...", "why": "..." }], "new_probability_of_goal": N, "feasibility": "high|med|low" }
```

## 29.5 Line-Item Forge (the decision editor)

```
ROLE:     Decision architect.
CONTEXT:  A strategy.
TASK:     Produce the editable decision line-items, each with 3-5 options and a financial_impact vector { monthly_cost, monthly_revenue_delta, one_time_cost, probability_shift }.
CONSTRAINTS:
  - Categories are universal: Investment, Team/AI-agents, Marketing, Product, Personal, Brand, Network, Health.
  - Every business reduces to these forks.
OUTPUT:   JSON: [{ "id": "...", "category": "...", "label": "...", "options": [...], "chosen": "...", "financial_impact": {...}, "life_impact": "..." }]
```

## 29.6 Local Reflow Math (client-side, no LLM)

The instant reflow is pure arithmetic — no prompt. Sum every decision's `financial_impact` per horizon, recompute net_profit and cash_balance, animate the bottom line. The LLM only re-projects the qualitative timeline on deep re-run.

## 29.7 Horizon Event Generator (the life story)

```
ROLE:     Narrative forecaster.
CONTEXT:  A committed decision set + projected numbers.
TASK:     For each horizon, name the 1-3 headline events that would happen (the viral moment, the hire, the conference, the partnership, the burnout). Make them specific, not generic.
OUTPUT:   JSON: { "1m": [...], "3m": [...], ... "10y": [...] }
```

The simulator is the moment the user understands they can steer their future. These prompts make that moment real.
