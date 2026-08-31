# 37 — The Master Autonomous Build (the prompt that builds the whole system)

> The single sequence that builds Vision Cortex end-to-end. Each turn, the builder resumes from the last completed step and pushes as far as it can: build → validate → test → launch → heal. The autonomous loops keep the backlog alive between turns.

## How to use this

This chapter IS the prompt. When the owner says "continue" (or anything implying "keep building"), the builder:
1. Reads the Build Order (ch.24) + the SystemEnhancement ledger to find the next unbuilt step.
2. Builds it fully — entity, function, UI, route, wiring.
3. Validates it with the audit prompts (ch.28).
4. Tests it (`test_backend_function`, preview).
5. Marks the matching `SystemEnhancement` record `audited` → `optimized`.
6. Continues to the next step until the turn's capacity is reached.

The owner never has to specify *what* to build — only "continue." The system knows.

## The Resume Rule

On every turn, before building, the builder queries `SystemEnhancement.list` and finds the highest-priority record in `pending` / `in_progress` / `implemented` (not yet `audited`/`optimized`). That is the next step. This makes the build **resume-able** — no state is lost between turns.

## The Per-Step Build Protocol (every step)

```
1. SPEC   — read the matching playbook chapter (the spec of record).
2. BUILD  — entity (if needed) → function → UI component → route → wiring.
3. VALIDATE — run the relevant audit prompt (ch.28): spec, doctrine, governance, cost, no-regression.
4. TEST   — test_backend_function for any new function; load the page in preview.
5. SHIP   — mark the SystemEnhancement record audited/optimized; log to AgentLog.
6. NEXT   — repeat for the next step until the turn ends.
```

## The Full Sequence (the build order, restated as executable steps)

```
Step 1.1  Onboarding Quest ── entity (UserProfile) + onboardingQuest fn + Onboarding page + route   ✅ (this turn)
Step 1.2  Goal Lock ── persist + expose goal to downstream (carried by 1.1)
Step 2.1  Morning Feed ── new home page; 10 life-path cards scored to profile
Step 2.2  scoreIdeaToProfile ── function: idea × profile + goal → scores
Step 3.1  Simulation entity
Step 3.2  simulateStrategy ── forecast + reverse
Step 3.3  Simulation Studio UI ── horizons, line items, live bottom line, re-run, reverse
Step 3.5  Recommendation ── reverse-mode pick across 10 strategies
Step 4.1  generateBrand ── name + logo + palette + domain availability
Step 4.2  generateWebsite ── site with real market data
Step 4.3  generateContent ── 30-day social schedule
Step 4.4  Launch button ── provision + payment + arm Marketer
Step 5.1  Marketer agent ── social jobs via Cloud Browser
Step 5.2  Revenue feedback ── app_payment → Council learning
Step 6.1  Hide backend screens ── admin-only route
Step 6.2  Cloud Browser as agent tool
Step 7.1  Multi-tenant RLS
Step 7.2  Portability ── package brain for off-Base44
```

## The Autonomy Contract (honest)

- **What runs without the owner:** `autoRecommend` (every 4h) + `runEnhancementCycle` (every 4h) + the existing sweeps/council/paper cycles. These plan, validate, and queue work 24/7.
- **What needs a turn:** writing new app source code (pages/components/functions) — only the builder can do that, in response to a message. There is no platform mechanism for a function to write source files.
- **What the owner does:** say "continue" (or any nudge). The builder resumes the build order from the last audited step and pushes as far as it can. Between turns, the loops keep improving and validating.

This is the closest thing to "build itself" the platform allows — and it is real: the system never loses its place, never ships unaudited, and never needs the owner to specify *what* to build, only *that* to keep going.

## The End State

When every step is `optimized`, the Destiny Engine is complete: a 5-screen product (Onboarding → Morning Feed → Simulation Studio → Build Approvals → Dashboard) backed by an invisible 13-agent council, a Cloud Browser, a self-healing Fortress Engineer, and an auto-recommendation engine — all running 24/7, monetizing from day 1, and compounding its own intelligence from real revenue. That is the system that builds more systems.
