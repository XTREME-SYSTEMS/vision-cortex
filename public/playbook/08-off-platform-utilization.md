# 08 — Off-Platform Utilization — Drive, Vercel, GitHub, Supabase

How to own the trio's infrastructure so it is not trapped inside Base44. Every layer below is something you control on your own accounts. The goal: the brain is portable, the data is yours, the deploys are yours, and a platform outage never costs you the system.

## The portable stack

| Layer | On Base44 today | Off-platform owner-controlled | Why |
|---|---|---|---|
| Brain (prompts + doctrine) | `base44/agents/*`, Doctrine entity | GitHub repo `visioncortex/brain` | Text is portable; version it. |
| Data | Base44 entities | Supabase (Postgres) | Your data, your SQL, your backups. |
| Functions | `base44/functions/*` | Vercel serverless (or Supabase Edge) | Same TS, your deploy. |
| Build factory | — | AutoBuilder OS on Vercel + GitHub | autobuilderos.com. |
| File storage | Base44 files | Google Drive (via connector) + Supabase Storage | Archival + evidence. |
| Hosting (products) | — | Vercel | Every shipped product deploys here. |

## 1. GitHub — the source of truth for code + brain

- **Org:** `visioncortex` (create it). Repos:
  - `visioncortex/brain` — the prompt library (chapter `07`) as `.md`/`.ts` files, versioned. Doctrine exports as JSON snapshots.
  - `visioncortex/vision-cortex-app` — the Base44 app source (2-way sync via Base44's GitHub integration).
  - `visioncortex/autobuilder-os` — the AutoBuilder API service.
  - `visioncortex/product-templates` — Next.js + Supabase scaffolds AutoBuilder clones from.
- **Connect Base44 → GitHub:** use the 2-way repo sync (Settings → GitHub). This gives you pull-request-able source for the whole app.
- **Secrets:** store `GITHUB_PAT` as a Base44 secret only if a function needs to create repos (AutoBuilder does). Otherwise keep PATs in Vercel env.

## 2. Vercel — deploys for AutoBuilder OS + every shipped product

- **AutoBuilder OS:** one Vercel project at autobuilderos.com. Three endpoints (`/scaffold`, `/deploy`, `/status`). Env vars: `GITHUB_PAT`, `VERCEL_API_TOKEN`, `AUTOBUILDER_API_KEY`, `SUPABASE_*`.
- **Shipped products:** each Idea that launches gets a Vercel project auto-created by AutoBuilder. Custom domains via Vercel DNS.
- **Why Vercel over Base44 for products:** products need their own domains, their own analytics, their own Supabase — and they must be portable to clients (Chris). Vercel is the neutral ground.

## 3. Supabase — your data, your SQL

- **Project:** `vision-cortex-core`. Migrate every Base44 entity to a Postgres table (1:1 mapping in chapter `01`). Enable RLS at the database level (the real fix for audit gap #1).
- **Auth:** Supabase Auth can mirror Base44 auth for off-platform products; for the brain itself, keep Base44 auth as the operator gateway.
- **Storage:** Supabase Storage for product assets; Google Drive for archival/evidence (below).
- **Edge Functions:** optional off-platform home for the 11 backend functions if you ever leave Base44. Same TS, Deno runtime.
- **Backups:** nightly `pg_dump` to Drive. The doctrine brain is too valuable to live in one DB.

## 4. Google Drive — archival + evidence + shared docs

You have a Google Drive workspace connector registered (id `69db1e5e75a5f8c15c80cf34`). Use it for:
- **Evidence vault:** Shadow screenshots and PDF exports of sources for high-conviction trades (chapter `03` upgrade). Store the Drive file URL on the Trade record.
- **Doctrine snapshots:** weekly export of the Doctrine entity to a Drive folder as a dated doc.
- **Owner reports:** Documenter agent writes a weekly council summary to a Drive doc (via the Google Docs connector, id `69ddcb7e5d965b5605cd24b4`).
- **Playbook:** this playbook lives in Drive as the canonical copy; the in-app version is the working copy.

**To activate:** authorize the Drive connector (BYO shared) via `request_oauth_authorization(connector_id=69db1e5e75a5f8c15c80cf34)`. Then a backend function `archiveToDrive` can upload files server-side.

## 5. The other registered connectors (available, not yet wired)

| Connector | id | Use it for |
|---|---|---|
| Google Calendar | `69ddcb305a599e0b4a1b3cff` | Schedule owner review sessions; council session reminders. |
| Google Tasks | `69db201897e4e8f9ae073be7` | Push proof-gate approvals to your task list. |
| Gmail | `69db200274332486fd28dd7e` | Owner alerting (loss threshold, streak, errors) — the fix for audit gap #30. |
| Google Sheets | `69db1fad3c50db37ad0ce8dd` | Treasurer's daily money report; revenue log. |
| Google Docs | `69ddcb7e5d965b5605cd24b4` | Documenter's weekly council summary. |
| HubSpot | `69db228b2439d854c8587167` | CRM for client work (Chris's company). |
| Supabase | `69e521c8418f5cecefb2567c` | The off-platform data home. |

Wire Gmail first — it closes the biggest reliability gap (no owner alerting). Wire Supabase second — it's the portability escape hatch.

## The migration path (if you ever leave Base44)

1. `visioncortex/brain` repo already has every prompt.
2. Supabase already has every table (kept in sync via a nightly `exportToSupabase` function).
3. Vercel already hosts AutoBuilder OS.
4. Rehost the 11 functions as Vercel serverless or Supabase Edge — same TS, swap `createClientFromRequest` for Supabase client.
5. Rehost the frontend on Vercel (it's already Vite + React).
6. The brain, data, and prompts are identical. The system did not notice the move.

This is what "not reliant on Base44" means: you can leave in an afternoon without losing a single doctrine.
