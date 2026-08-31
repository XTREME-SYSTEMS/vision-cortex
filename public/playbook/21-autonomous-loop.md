# 21 — The 24/7 Autonomous Loop

> The system never sleeps. A recursive cycle of discover → validate → build → launch → market → measure → compound → harden, running every 4 hours, self-correcting, self-healing, self-enhancing.

## The Master Cycle (every 4 hours)

```
┌─ DISCOVER ── Cloud Browser scrapes world → IntelFeed → Council filters to profile
│
├─ VALIDATE ── agentDebate top signals → scoreIdeaToProfile → rank
│
├─ ARCHITECT ─ councilBlueprint → investor-grade blueprint
│
├─ BUILD ──── AutoBuilder pulls committed simulations from Queue → builds
│
├─ PROVISION ─ provisionVercel + provisionSupabase → real infra
│
├─ LAUNCH ─── launchPipelineBuild → live URL
│
├─ MARKET ─── Marketer agent runs social jobs (Cloud Browser) → posts, DMs, lead-gen
│
├─ MONETIZE ─ payment provider connected → revenue flows back
│
├─ MEASURE ─ revenue signal (app_payment webhook) → Council learns what makes money
│
├─ COMPOUND ─ councilCompound → doctrine extracted + refined
│
└─ HARDEN ── runEnhancementCycle → platform improves/fixes itself
             │
             └─→ loops back to DISCOVER
```

## The Schedules (workflows)

| Workflow | Cadence | Does |
|---|---|---|
| Morning Vision Sweep | 3am daily | Cloud Browser scrape → IntelFeed |
| Nightly Pipeline Prep | 6am daily | 10 ideas ranked + scored for the Feed |
| Daily Council Strategy Meeting | 8am daily | Council deliberates the day's top ideas |
| Autonomous Pipeline Cycle | every 4h | orchestrator: validate → architect → build → launch |
| Autonomous Paper Cycle | every 4h | paper-trading portfolio compounding |
| Daily Intelligence Ingestion | hourly | intel ingest + correlation |
| Shadow Forcefield | every 6h | opsec scan + forcefield |
| Owner Digest | 7am daily | the morning brief |
| **Self Healing Cycle** | every 4h | Fortress Engineer: validate/audit/fix/enhance the platform |
| Council on Intel | on IntelFeed create | Council reacts to high-impact intel |
| On Payment | on payment_succeeded | revenue signal → Council learning |

## The Revenue Feedback Loop (the learning signal)

The single most important loop: **what actually makes money teaches the Council what to find next.**

```
customer pays → app_payment webhook → On Payment workflow
  → record revenue against the idea/build
  → Council reviews: "this worked because…"
  → doctrine extracted (councilCompound)
  → tomorrow's Morning Feed weighted toward similar patterns
```

Without this loop the system is guessing. With it, the system compounds intelligence about money-making the way a real boardroom does — from results.

## The Self-Healing Recursion (the Fortress Engineer)

The platform improves itself on the same loop it runs businesses:

```
SystemEnhancement ledger (the backlog of improvements)
  → runEnhancementCycle (every 4h)
    → for each pending enhancement:
        1. IMPLEMENT  — generate a plan (LLM)
        2. AUDIT ──── LLM audits the plan against architecture + doctrine
        3. if pass → mark audited → owner notified to execute
        4. if fail → AUTO-FIX (regenerate) up to max_fix_attempts
        5. if exhausted → mark failed → owner alerted
  → doctrine refined from the cycle's outcomes
  → loop
```

The ledger is seeded from this architecture playbook (chapter 24, Build Order). Each unbuilt piece is a `SystemEnhancement` record. The cycle keeps the backlog alive, validated, and prioritized; the builder (human or agent) executes the audited plans.

See **chapter 25 — Self-Healing Protocol** for the full spec.

## Infinite-Loop Safety

- Entity-trigger workflows that create the same entity type carry a `condition` distinguishing source records from workflow-created ones (prevents runaway).
- The enhancement cycle processes a bounded number of records per run (cost control).
- Every autonomous action is logged to `AgentLog` + `Notification` for owner oversight.
- The owner can pause any cycle from the Dashboard (a kill-switch per workflow).
