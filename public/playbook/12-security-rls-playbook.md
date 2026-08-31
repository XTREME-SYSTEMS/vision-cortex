# 12 — Security & RLS Playbook

The hardening roadmap. This closes the audit's most dangerous gaps in priority order. None of it is optional if the system will ever hold real money or client data.

## Priority 1 — Row-Level Security (audit gap #1)

**Today:** every authenticated user can read/write/delete every entity. The "private council" is wide open between users.

**Fix:** add an `rls` block to every entity schema. The pattern (single-operator + future clients):

- **Owner-only entities** (Portfolio, Governance, Trade, Doctrine): only `role: admin` can read; only `admin` can write. (Portfolio/Trade are the fund — never expose to non-admins.)
- **Shared-read, admin-write** (Idea, IntelFeed, BuildQueue, AgentProfile, AgentLog, ChatMessage): all authenticated users can read; only `admin` (and the system/service role) can create/update/delete.

Load the RLS guide (`get_capability_guide("rls")`) before writing the rules. The standard ownership pattern: `created_by_id == user.id` for user-owned records; `role == 'admin'` for operator records. Apply per entity.

## Priority 2 — Shadow invisibility (audit gap #2, #3)

**Today:** Shadow appears in the LiveChat sidebar for every user (client-gated only); the forcefield only purges ChatMessage and runs hourly.

**Fix:**
1. Remove Shadow from the public `AGENTS` array in `LiveChat.jsx` for non-admins (filter by `user.role`).
2. Add a server-side check: the `shadow` agent config should reject any conversation from a non-admin (the `adminOnly` flag exists in `LiveAgentChat` — enforce it in the agent config too, not just the UI).
3. Extend `shadowForcefield` to also scrub Shadow-attributed entries in AgentLog, Doctrine, Trade, and Idea — or better, never write them there in the first place (Shadow writes to a private `ShadowLog` entity only the owner reads).
4. Trigger an immediate forcefield sweep after every covert action, not just hourly.

## Priority 3 — Real price data (audit gap #7)

**Today:** `fetchPrice` asks an LLM for the price and trusts it. PnL is computed against a hallucinated number.

**Fix:** add a backend function `marketPrice` that calls a real price API:
- **Free option:** Yahoo Finance unofficial endpoint, or CoinGecko for crypto (free tier).
- **Paid option:** Polygon.io or Alpha Vantage (free tier 25 calls/day — enough at 4h cycles).
- Store the API key as a Base44 secret (`MARKET_DATA_API_KEY`).
- `councilPredict` calls `marketPrice` instead of the LLM `fetchPrice`. Keep the LLM fallback only if the API is down, and flag the trade as `price_estimated: true`.

## Priority 4 — The proof gate in code (audit gaps #8, #9, #10, #17)

**Today:** confidence is stored but never enforced; no drawdown limit; no kill-switch; the 10-win streak is a flag with no action.

**Fix:** in `councilPredict`, before opening a position:
```
if (final_confidence < 90) {
  // prepare, don't execute
  create Trade with position_size_usd = 0, status = 'open', flag 'awaiting_approval';
  sendOwnerDigest('proof_gate', trade);
  return { prepared: true, notExecuted: 'below confidence gate' };
}
if ((portfolio.consecutive_wins || 0) < 10 && !ownerApproved) {
  // same: prepare and notify
}
```
Add a `max_open_trades = 1` guard (audit gap — no concurrency control) and a `max_drawdown_pct` that pauses the cycle if the portfolio drops below a threshold from its peak.

## Priority 5 — Auth gates on shared functions (audit gap #5, #6)

**Today:** `ingestIntel`, `visionSweep`, `councilBlueprint`, `councilCompound`, `cloudBrowserIntel` set `allowed = true` inside the `catch` of `auth.me()` — a missing token is treated as authorized. `agentDebate` and `councilPredict` allow any logged-in user.

**Fix:** distinguish "workflow context" (no user, allowed) from "user context" (must be admin) explicitly. Use a workflow header or signed trigger token rather than treating a thrown `auth.me()` as permission. Gate `agentDebate` and `councilPredict` to admin-only (or owner-only for predict).

## Priority 6 — Owner alerting (audit gap #30)

**Today:** no email/push on loss, error, streak, or forcefield purge.

**Fix:** build `ownerDigest` (chapter `09`) using the Gmail connector. One daily digest + critical alerts.

## Priority 7 — Data hygiene (audit gaps #21, #28, #33)

- **Dedup:** hash IntelFeed headlines and Idea titles; skip creates on near-duplicate hashes.
- **Doctrine cap:** keep top 50 by weight; archive the rest to a `DoctrineArchive` entity or Drive.
- **Retention/TTL:** nightly job archives AgentLog/ChatMessage older than 90 days to Drive, deletes from the live DB.

## Priority 8 — Shadow audit trail (audit gap #4)

**Today:** `shadowClone` can bulk-copy User records with no audit trail.

**Fix:** every `shadowClone` and `shadowBrowse` call writes a private `ShadowLog` entry (owner-only entity) with the caller, target, and count. The owner can review every covert action.

## The order to build

1. RLS (Priority 1) — do this first; everything else is theater without it.
2. Shadow invisibility (Priority 2) — same day.
3. Real price data (Priority 3) — next.
4. Proof gate (Priority 4) — before any real capital.
5. Auth gates (Priority 5) — same sprint.
6. Owner alerting (Priority 6) — so you can sleep.
7. Data hygiene (Priority 7) — ongoing.
8. Shadow audit (Priority 8) — before onboarding clients.

This is the work that turns the showcase into a system you can trust with real money and real clients.
