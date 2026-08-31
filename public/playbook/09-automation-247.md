# 09 — 24/7 Automation Loop

The complete cadence map and the human-in-the-loop gates. The system works while you sleep; it pauses and asks you only when it has earned the right to.

## Daily cadence (all times ET)

| Time | Workflow | Action | Autonomous? |
|---|---|---|---|
| 6:00 | Daily Intelligence Ingestion | `ingestIntel` → IntelFeed | yes |
| 7:00 | Morning Vision Sweep | `visionSweep` → 30 Ideas | yes |
| every 2h | Council Session | `councilSession` → ChatMessage + Doctrine | yes |
| every 2h | Autonomous Paper Cycle | `councilPredict` → Trade, then `councilCompound` → Doctrine | yes, gated |
| hourly | Shadow Forcefield | `shadowForcefield` → opsec sweep | yes |
| on event | Council on Intel | `councilSession` when IntelFeed impact ≥ 80 | yes |
| on demand | owner | `agentDebate`, `councilBlueprint`, `shadowBrowse`, `shadowClone` | owner-triggered |

## The proof gate (to enforce in code)

No autonomous action that **spends money** or **ships a product** proceeds unless:

```
confidence >= 90
AND (consecutive_wins >= 10 OR owner_approved_this_action)
```

Below the gate the system **prepares, not executes**:
- Writes the Idea at stage `strategized` (does not launch).
- Writes the BuildQueue at stage `queued` (does not build).
- Writes the Trade at status `open` with `position_size_usd = 0` (does not risk capital).
- Sends the owner a single digest email (Gmail connector) with the prepared actions and a one-tap approve link.

This is the single most important missing enforcement. Today nothing checks it (audit gap #8, #17).

## Owner alerting (to build — closes audit gap #30)

A backend function `ownerDigest` (to build) runs on a schedule and on event triggers, sending via the Gmail connector:
- **Loss threshold:** any Trade resolving below -5% pnl.
- **Streak hit:** consecutive_wins reaches 10.
- **Agent error:** any AgentLog at level `error` unresolved > 1h.
- **Forcefield purge:** Shadow forcefield purged > 0 messages (a leak occurred).
- **Proof-gate queue:** prepared actions awaiting approval.

One email per day max, unless a critical alert fires. The owner sleeps; the system respects that.

## Failure modes

- **Brain down (Base44 outage):** AutoBuilder and Cloud Browser keep running on Vercel/Railway. Actions queue in Supabase. Resync on recovery.
- **Eyes down (browser engine):** Brain falls back to InvokeLLM web search (lower fidelity). Trades pause validation.
- **Hands down (AutoBuilder):** Brain keeps finding and validating; BuildQueue backs up; no revenue until restored.
- **Owner unreachable:** the system never executes a gated action. It waits. This is correct — autonomy without consent is liability.

## What "autonomy" really means here

Autonomy is not "the system does everything." Autonomy is "the system does everything *that does not risk your money or your reputation without proof*." The proof gate is the boundary. Inside it: full 24/7 autonomy. Outside it: prepare, notify, wait.

## The 5-morning / 3-evening question discipline

Your stated practice. Wire it into the owner digest:
- **Morning (7am, with the sweep):** 5 questions — what did we earn, what did we lose, what compounds, what bleeds, what is the one move today.
- **Evening (9pm):** 3 questions — what did we ship that will still earn in a year, what did we spend time on that produced no compounding asset, what is bleeding.

Treasurer answers these from real data (once the Revenue entity exists). Until then, Documenter drafts them from AgentLog.
