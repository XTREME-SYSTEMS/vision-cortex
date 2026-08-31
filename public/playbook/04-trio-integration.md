# 04 — Trio Integration — How the Three Combine

The trio is one loop with three organs. This document is the wiring diagram.

## The 24/7 loop

```
  ┌─────────────────────────────────────────────────────────────┐
  │  VISION CORTEX (brain)                                       │
  │  6am  ingestIntel      → IntelFeed                           │
  │  7am  visionSweep      → 30 Ideas                            │
  │  every 2h councilSession → ChatMessage + Doctrine           │
  │  every 2h councilPredict → Trade (validated by Cloud Browser)│
  │  every 2h councilCompound → Doctrine (sharper)              │
  │  hourly shadowForcefield → opsec                            │
  └───────────────┬───────────────────────────┬──────────────────┘
                  │ directs                   │ outcomes
                  ▼                           │
  ┌─────────────────────────────┐              │
  │  CLOUD BROWSER (eyes)        │              │
  │  shadowBrowse   (covert)     │              │
  │  cloudBrowserIntel (shared)  │              │
  │  directed reads for trades   │              │
  └───────────────┬─────────────┘              │
                  │ intel                      │
                  ▼                            ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  AUTOBUILDER OS (hands)                                      │
  │  top validated Idea → scaffold → deploy → launch            │
  │  revenue + analytics → feed back to Vision Cortex Doctrine │
  └─────────────────────────────────────────────────────────────┘
```

## Handoff contracts

### Brain → Eyes
The Council's `councilPredict` returns `shadow_sources` (URLs). Shadow's `shadowBrowse` reads them. Contract: a list of URLs in, page text out, nothing persisted.

### Brain → Hands
A validated Idea (stage `strategized`, validation.verdict `approved`, confidence ≥ 90) enters the BuildQueue. The `autobuildAdvance` function (to build) calls AutoBuilder OS. Contract: `{ ideaId, repoName, template }` in, `{ repoUrl, previewUrl, prodUrl }` out.

### Hands → Brain
AutoBuilder OS reports daily: revenue, signups, churn, deploy status. A function `autobuildReport` (to build) writes a summary to AgentLog and updates the Idea's stage. Treasurer reads it; councilCompound extracts doctrine from outcomes.

### Eyes → Brain
`cloudBrowserIntel` writes IntelFeed. The `Council on Intel` workflow fires on impact ≥ 80. Contract: URL in, structured IntelFeed records out.

## The proof gate (enforced in code — to build)

No autonomous action that costs money or ships a product proceeds unless:
- confidence ≥ 90 (stored on Idea.validation.confidence / Trade.confidence), AND
- a 10-win streak is active OR the operator has approved this specific action.

Below the gate, the system *prepares* (writes Idea, writes BuildQueue at stage `queued`, writes a Trade at status `open` with size 0) and *notifies the owner* — it does not execute. This is the single most important missing enforcement. Today nothing checks it.

## Data flow ownership

| Data | Owner | Who reads | Who writes |
|---|---|---|---|
| Ideas | Vision Cortex | all agents | Vision, Strategy, Brand, Council, AutoBuilder (stage) |
| Intel | Vision Cortex | all agents | ingestIntel, cloudBrowserIntel, Shadow |
| Trades | Vision Cortex | Capital, Quant, Treasurer | councilPredict, Quant |
| Doctrine | Vision Cortex | all agents | councilCompound, Philosopher |
| BuildQueue | AutoBuilder OS | Distributor, AutoBuilder | Distributor, autobuildAdvance |
| Revenue | AutoBuilder OS | Treasurer | AutoBuilder (via autobuildReport) |

## Failure modes and what each system does

- **Brain down (Base44 outage):** Eyes and Hands keep running on Vercel/Supabase; queue actions; resync on recovery.
- **Eyes down (browser engine):** Brain falls back to InvokeLLM `add_context_from_internet` (web search) — lower fidelity, still functional. Trades pause if no validation.
- **Hands down (AutoBuilder):** Brain keeps finding and validating; BuildQueue backs up; no revenue until restored. Non-fatal.

## The one-sentence version

Vision Cortex thinks, the Cloud Browser looks, AutoBuilder OS builds — and the money and lessons flow back to the brain so tomorrow's decisions are sharper than today's.
