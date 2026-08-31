# 03 — Cloud Browser Engine — The Eyes

The Cloud Browser Engine is an isolated, proxy-routed headless browser service that reads the live web for Shadow and the intel layer. It is the trio's research instrument — the thing that lets the system *see* the internet without exposing your origin.

## What it is

A hosted browser engine (currently on Railway) exposing a small REST API:
- `POST /sessions` — spin up an isolated browser session. `{ usePool: true }` routes the session through the engine's Proxy Pool so each session egresses from a rotated proxy.
- `POST /sessions/{id}/execute` — run actions: `goto`, `ai_extract`, click, scroll, type.
- `DELETE /sessions/{id}` — tear down.

Auth: `x-api-key` header against `CLOUD_BROWSER_API_KEY`. URL in `CLOUD_BROWSER_URL`. Both stored as Base44 secrets.

## How Vision Cortex uses it today

Two functions wrap it (`base44/shared/cloudBrowser.ts`):

- **shadowBrowse** — covert read. `goto` + `ai_extract`, return page text to the caller, persist nothing. Owner-only.
- **cloudBrowserIntel** — scrape one URL → LLM structures it → writes IntelFeed records. Admin or workflow.
- **councilPredict** uses `browseSession` to read the Council's directed sources for each trade.

## Capabilities (present)

- Proxy-pooled sessions (rotation per session).
- AI content extraction (returns clean text, strips nav/ads).
- Up to 40,000 chars per page.
- Session isolation (fresh profile each time).

## Capabilities (missing — the upgrade list)

1. **Wait-for-load** — no network-idle wait; pages that render client-side return partial content. Add a `wait` action or a `networkidle` flag on `goto`.
2. **JS interaction** — no click/type/scroll exposed to Vision Cortex. Add action passthrough so Shadow can log in, paginate, and scrape behind auth.
3. **Retry + fallback** — a single failed `goto` kills the scrape. Add 2 retries with a fresh session.
4. **Screenshot capture** — for evidence on high-conviction trades; store the signed URL on the Trade record.
5. **PDF export** — for archiving source pages into Drive (chapter `08`).
6. **Proxy diversity** — currently one engine, one static IP at the engine level. The pool rotates the *session* egress, but the engine host is fingerprintable. Add a second engine in a different region for true redundancy.
7. **Rate-limit awareness** — back off on 403/429; log blocked sources to AgentLog so the system learns which sites are no-go.

## Opsec posture

- Shadow's `shadowBrowse` returns text only to the caller. Nothing is written to IntelFeed, ChatMessage, or AgentLog. This is correct and must stay this way.
- `cloudBrowserIntel` writes to IntelFeed — use this for *shared* intelligence, never for Shadow's covert work.
- The engine's static IP is a known fingerprinting risk. Mitigation: proxy pool (done) + second regional engine (todo) + rotating user-agent per session (todo).

## Cost model

- Railway hosting: ~$5–20/mo depending on usage.
- Proxy pool: depends on provider ($5–50/mo for residential rotation).
- Per scrape: one session, seconds of compute. Effectively free at your volume.

## The rule

The Cloud Browser is a tool, not an agent. It never decides. It reads what an agent directs it to read and returns what it found. Shadow directs it for covert work; the Council directs it for trade validation; Distributor directs it for competitor research. The intelligence always flows back into a *brain* entity (IntelFeed, Trade, Doctrine) — never raw into a user.
