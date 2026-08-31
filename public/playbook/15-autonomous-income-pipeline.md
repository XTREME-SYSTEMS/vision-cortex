# 15 — Autonomous Income Pipeline

The recursive, cron-driven engine that turns the Council's daily deliberation into launched, income-generating digital businesses — with a hardened human-gate so nothing ships unattended until the Council is confident.

## The end result we are pursuing

Autonomous, 24/7, high-growth **residual income** from digital businesses operated by the Vision Cortex Council with zero human intervention. The full trio — Vision Cortex (brain), Cloud Browser (eyes), AutoBuilder OS (hands) — runs on cron, persistently, until that success ratio is achieved and then compounds.

## The loop

1. **Find** — Vision + Strategy sessions (daily + every 4h) scan the live web for high-probability digital opportunities.
2. **Validate** — the Council deliberates; Validator enforces a human-gate threshold before anything launches.
3. **Queue** — solidified opportunities enter the BuildQueue (`stage: queued`).
4. **Gate** — each cycle the Council re-reviews the top queued item. It is promoted to `strategized` (launch-ready) **only** when confidence ≥ 0.8, the primary risk is mitigated, and unit economics are positive.
5. **Build & launch** — AutoBuilder provisions a Vercel project for the top `strategized` build and marks it `launched`.
6. **Compound** — every cycle extracts one Doctrine into the permanent brain, so the next cycle is sharper than the last. Income outcomes feed back as doctrine. Forever.

## What runs on cron

- **Daily Council Strategy Meeting** — 7:30am ET, `councilSession` with a strategy topic.
- **Autonomous Pipeline Cycle** — every 4h, `pipelineOrchestrator` → `launchPipelineBuild`.
- **Morning Vision Sweep** — 7am ET, `visionSweep` (30 ideas).
- **Daily Intelligence Ingestion** — 6am ET, `ingestIntel`.
- **Autonomous Paper Cycle** — every 2h, `councilPredict` → `councilCompound` (the paper-trading fund).
- **Council Session** — every 2h, rotating doctrine.
- **Shadow Forcefield** — hourly, opsec hygiene.

## The recursive-enhancement engine (`pipelineOrchestrator`)

Each 4-hour cycle:
1. Loads current pipeline state — top queued build, recent ideas, recent doctrine.
2. Convenes the Council with live web search.
3. **Reviews** the top queued opportunity for launch-readiness (`ready_to_launch`).
4. **Identifies** the next best opportunity and queues it.
5. **Compounds** one durable Doctrine.
6. Logs the full transcript to the War Room and an audit entry to Ops.

If the Council approves the top queued item, it is promoted to `strategized`; the next step in the workflow auto-provisions it on Vercel.

## The human-gate (hardening)

The Council itself resolved that fully-unattended launch requires a **Human-Gate Threshold** — without it, the estimated probability of catastrophic failure is 0.72. That gate is now enforced in code:

- `pipelineOrchestrator` only promotes a build to `strategized` when the Council returns `ready_to_launch: true` (confidence ≥ 0.8, risk mitigated, unit economics positive).
- `launchPipelineBuild` only provisions builds at stage `strategized`. Queued items are never auto-launched.
- Doctrines start `validated: false`; the brain compounds but does not auto-trust new insight.

This means the system runs autonomously and persistently, but it earns the right to launch each build through demonstrated Council confidence — exactly the anti-hierarchical, evidence-first governance the charter demands.

## How to watch it

- **War Room** — every cycle's transcript lands here in realtime.
- **Queue** — watch builds move `queued → strategized → building → launched`.
- **Ops** — audit log of every orchestration and launch.
- **Owner bell** — a notification fires on every successful launch.

## First step

The cycle is live. The Council's current top pick — **Autonomous SDR-as-a-Service ("Corporate Memory-as-a-Service")** — is already in the queue. Watch for it to be promoted and launched as the Council's confidence crosses the gate.
