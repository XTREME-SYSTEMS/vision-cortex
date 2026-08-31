# 02 — AutoBuilder OS — The Build Engine

AutoBuilder OS (autobuilderos.com) is the hands of the trio. Vision Cortex decides *what* to build; AutoBuilder OS actually builds, deploys, and distributes it. You own the domain; the new AutoBuilder is not connected yet. This document is the spec to connect it.

## Mission

Take a validated Idea (stage = `strategized` or `branded`) and ship a real, revenue-capable product with minimal human touch: scaffold → deploy → content → distribute → measure → feed outcomes back to Vision Cortex's doctrine brain.

## The build pipeline (BuildQueue stages)

The BuildQueue entity already defines the stage machine: `queued → strategized → building → launched → failed`. AutoBuilder OS is the engine that drives transitions between them.

| Stage | Owner | Action | Output |
|---|---|---|---|
| queued | Distributor | Idea accepted into queue, priority assigned | BuildQueue record |
| strategized | Strategy agent | Architecture, tech stack, moat, automation plan written to Idea | Idea updated |
| building | AutoBuilder | Scaffold repo, wire integrations, deploy preview | GitHub repo + Vercel preview URL |
| launched | AutoBuilder | Promote to production, custom domain, analytics on | Live URL + analytics events |
| failed | Validator | Post-mortem logged to Doctrine, record marked failed | Doctrine entry |

## What AutoBuilder OS must do (capability spec)

1. **Scaffold** — generate a project from a template (Next.js + Supabase is the default trio stack) into a new GitHub repo under your org. Driven by the Idea's `tech_stack` field.
2. **Wire** — inject Supabase project keys, Stripe/test-mode keys, analytics. Store secrets in Vercel/Supabase, never in the repo.
3. **Deploy** — Vercel auto-deploys on push to main. Return a preview URL written back to the BuildQueue record.
4. **Content** — generate initial landing copy + SEO from the Idea's `branding` and `one_liner`. Commit to the repo.
5. **Distribute** — schedule the first content cadence (Distributor agent owns this; AutoBuilder just provisions the channels).
6. **Measure** — emit `base44.analytics.track` events (or, off-platform, PostHog) for signups, revenue, churn.
7. **Report** — write a daily BuildQueue status + revenue signal back to Vision Cortex so Treasurer and the doctrine brain can compound.

## How it connects to Vision Cortex today

Today the connection is one-way and manual: `councilBlueprint` writes an Idea; you manually move it to BuildQueue. The missing link is a function — call it `autobuildAdvance` — that:
- reads the top-priority `queued` BuildQueue item,
- calls the AutoBuilder OS API (a Vercel-hosted service you control) to scaffold + deploy,
- writes the repo URL + preview URL back to the BuildQueue record,
- moves stage to `building`, then `launched` on a successful deploy webhook.

That function does not exist yet. It is the single highest-leverage thing to build after RLS + real price data.

## The AutoBuilder OS API (what you control on autobuilderos.com)

A small Vercel-deployed service with three endpoints:
- `POST /scaffold` — { ideaId, repoName, template } → creates GitHub repo, returns repoUrl.
- `POST /deploy` — { repoUrl } → triggers Vercel deploy, returns previewUrl + prodUrl.
- `POST /status` — { repoUrl } → returns deploy + analytics summary.

Vision Cortex calls these via a backend function (`autobuildAdvance`) using a secret `AUTOBUILDER_API_KEY`. The service authenticates with GitHub (PAT) and Vercel (API token) server-side. None of those credentials ever touch Base44.

## Cost model

- GitHub: free for private repos up to 2,000 min/actions.
- Vercel: Hobby tier free for personal; Pro $20/mo per team (needed for commercial/client work).
- Supabase: free tier up to 500MB DB / 50k MAU; Pro $25/mo.
- AutoBuilder OS itself: one Vercel deployment, ~$0 incremental.

Target: ship 3–5 micro-products per quarter at <$50 launch cost each (matches the Idea schema's `launch_cost_usd`).

## Why it's separate from Vision Cortex

Separation = portability + client-readiness. When you clone the trio for Chris's company (chapter `14`), Vision Cortex is the brain they license, AutoBuilder OS is the factory they point at their own GitHub/Vercel/Supabase, and the Cloud Browser is shared infra. Keeping AutoBuilder on its own domain makes the clone a config change, not a rewrite.
