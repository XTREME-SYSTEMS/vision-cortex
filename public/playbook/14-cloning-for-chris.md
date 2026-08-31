# 14 — Cloning the Trio for Chris's Company

Chris's company gets its own trio. Because you built it portable, the clone is a configuration change, not a rewrite. This is the template.

## What Chris gets

1. **A Vision Cortex instance** — the brain (prompts, agents, doctrine) pointed at his data.
2. **An AutoBuilder OS instance** — the factory pointed at his GitHub + Vercel + Supabase.
3. **Shared Cloud Browser access** — the eyes (you can share the engine or stand up a second one for isolation).

## What stays yours

- The `visioncortex/brain` repo (the canonical prompts). Chris gets a fork or a licensed snapshot.
- thevisioncortex.com and autobuilderos.com.
- The doctrine you have personally compounded.

## The clone steps

### 1. Provision Chris's accounts
- **GitHub org:** `chriscompany` (or his existing). Repos: `brain` (fork of yours), `autobuilder-os` (fork), `product-templates` (fork).
- **Vercel team:** Chris's. AutoBuilder OS deploys here. Env vars: his `GITHUB_PAT`, `VERCEL_API_TOKEN`, `AUTOBUILDER_API_KEY`, `SUPABASE_*`.
- **Supabase project:** `chriscompany-core`. Migrate the entity schemas (1:1 from chapter `01`). Enable RLS from day one.
- **Custom domain:** Chris's choice, pointed at his Base44 app or his Vercel frontend.

### 2. Spin up the Base44 app (or go off-platform)
- **Option A (fastest):** a second Base44 app from the same source (2-way sync from `visioncortex/vision-cortex-app`). Point it at Chris's Supabase via env. Re-seed agents from the `brain` repo.
- **Option B (fully off-platform):** Vercel frontend + Supabase Edge Functions + the `brain` repo. No Base44. This is the ultimate portability proof — and the pitch to Chris that he owns everything.

### 3. Tenant isolation
- **Data:** separate Supabase project. No shared tables. RLS enforced.
- **Secrets:** separate `AUTOBUILDER_API_KEY`, `CLOUD_BROWSER_*`, `MARKET_DATA_API_KEY`. Chris's app never sees your secrets.
- **Agents:** separate agent configs (forked from `brain`). Chris can tune personalities without touching yours.
- **Doctrine:** starts empty (or seeded from a curated subset of yours). Chris's brain compounds from his outcomes, not yours.

### 4. The Cloud Browser decision
- **Shared (cheaper):** Chris's AutoBuilder calls your Cloud Browser engine with a scoped API key. You see the traffic; he doesn't run infra.
- **Isolated (cleaner):** stand up a second browser engine in Chris's Railway/Vercel account. Full isolation. Recommended for paid clients.

### 5. Handoff
- Document Chris's tenant in a `tenants/chriscompany.md` in the `brain` repo.
- Give Chris: his app URL, his AutoBuilder URL, his Supabase access, and this playbook.
- Walk him through the 90-day roadmap (chapter `13`) on his timeline.

## The licensing model (suggested)

- **One-time setup fee:** for the clone + onboarding (Phase 1–2 equivalent).
- **Monthly retainer:** for brain updates (new doctrine, prompt improvements), infrastructure monitoring, and the shared Cloud Browser if you host it.
- **Performance share (optional):** a small % of revenue from products his trio launches — aligns you with his outcomes.

You are selling a system that prints products and compounds intelligence, documented and portable. That is worth a real number.

## The discipline

- Never let Chris's tenant touch your data. RLS + separate projects, not shared tables with a tenant column.
- Never let your secrets leak into his env. Separate keys, always.
- Version the `brain` repo. Chris pulls updates; you never push into his fork automatically.

## The pitch in one sentence

"I built an autonomous system that finds opportunities, validates them, builds the products, and compounds what it learns — and I will install a copy, on your infrastructure, that you own, documented, in two weeks."
