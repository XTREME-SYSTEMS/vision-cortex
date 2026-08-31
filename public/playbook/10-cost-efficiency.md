# 10 — Cost Efficiency

How to run a 24/7 autonomous multi-agent system without burning the credit budget. The trio is designed to be cheap to operate and expensive only when it earns.

## The credit model

Every LLM call costs integration credits. The system makes roughly (per day, at current cadence):

| Call | Model | Frequency/day | Notes |
|---|---|---|---|
| ingestIntel | gemini_3_flash | 1 | cheap, web search |
| visionSweep | gemini_3_flash | 1 | cheap, web search |
| councilSession | claude_sonnet_4_6 (no web) / gemini_3_flash (web) | 12 | the bulk of spend |
| councilPredict pass 1 | gemini_3_1_pro + web | 12 | **expensive** |
| councilPredict pass 2 | gemini_3_1_pro | 12 | expensive |
| fetchPrice (×2 per cycle) | gemini_3_flash + web | 24 | cheap but frequent |
| councilCompound | automatic | 12 | cheap |
| shadowForcefield | none | 24 | free |

**The expensive line is `councilPredict`** — 24 gemini_3_1_pro calls/day, each with web search. This is the single biggest cost driver.

## Cost-reduction levers (in priority order)

1. **Drop the paper cycle to every 4h, not every 2h.** Halves the most expensive calls. Trades still resolve against live prices; you just open fewer per day. The doctrine still compounds.
2. **Use `gemini_3_flash` for pass 1, `gemini_3_1_pro` only for pass 2 (the refine).** Pass 1 is idea generation (flash is fine); pass 2 is the accuracy decision (worth the pro model).
3. **Cache `fetchPrice`.** One price per asset per 15-min window. Don't fetch the same ticker twice in a cycle.
4. **Replace `fetchPrice` with a real market-data API** (chapter `12`). One API call is cheaper and more accurate than an LLM web search.
5. **Cap Doctrine growth.** Keep the top 50 by weight; archive the rest. Stops context bloat in `councilCompound` (audit gap #28).
6. **Debounce `Council on Intel`.** Batch high-impact intel into one session per hour, not one per record (audit gap — over-triggering).

## Budget caps (to build)

A backend function `creditGuard` (to build) tracks daily LLM calls and enforces:
- **Soft cap:** at 80% of the daily budget, downgrade all calls to `gemini_3_flash`.
- **Hard cap:** at 100%, pause `councilPredict` and `councilSession` (keep forcefield + alerting running) and email the owner.

Store the daily cap in a `Settings` entity or Supabase table. Start at a number you set; adjust from the burn data.

## Model selection policy

| Task | Model | Why |
|---|---|---|
| Web-search ingestion, sweeps, price | gemini_3_flash | cheap, supports web |
| Debate (no web) | claude_sonnet_4_6 | best reasoning |
| Debate (with web) | gemini_3_flash | only web-capable cheap option |
| Trade refine, blueprint | gemini_3_1_pro | highest quality, use sparingly |
| Shadow covert extract | gemini_3_flash | fast, cheap |
| Owner digest, summaries | gemini_3_flash | cheap |

**Rule:** default to flash. Escalate to pro only for the one decision per cycle that matters most.

## The honest number

At current cadence (2h cycles, pro on both passes), you are likely burning the equivalent of dozens of pro-model calls per day. Cutting the cycle to 4h and moving pass 1 to flash should cut the burn by ~60% with negligible quality loss. That is the first knob to turn.
