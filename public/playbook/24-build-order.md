# 24 — The Build Order

> The sequence to build the Destiny Engine. Each item is a `SystemEnhancement` record the Fortress Engineer will track, validate, and heal. Build top-down; each tier unlocks the next.

## Tier 1 — The Front Door (the lever)

- [ ] **1.1 Onboarding Quest** — the compounding questionnaire + goal lock. `onboardingQuest` function + `UserProfile` entity + the Quest UI. *Feeds everything.*
- [ ] **1.2 Goal Lock** — persist the locked goal; expose it to all downstream scoring/recommendation.

## Tier 2 — The Hook

- [ ] **2.1 Morning Feed** — the 10 idea cards, scored to the profile. The new home page (`/`).
- [ ] **2.2 scoreIdeaToProfile** — the scoring function (idea × profile + goal).
- [ ] **2.3 Idea Card component** — scores, "why this fits you," Simulate/Skip actions.

## Tier 3 — The Destiny Engine

- [ ] **3.1 Simulation entity** — the data model (chapter 19).
- [ ] **3.2 simulateStrategy function** — forecast + reverse modes, web-grounded.
- [ ] **3.3 Simulation Studio UI** — horizon columns, decision line items, live bottom line, re-run + reverse buttons.
- [ ] **3.4 Local reflow** — instant client-side financial re-sum on line-item change.
- [ ] **3.5 Recommendation** — reverse-mode run across all 10 strategies → pick the winner.

## Tier 4 — The Build Approvals

- [ ] **4.1 generateBrand** — name + logo + palette + tone; `findAvailableDomain` via Cloud Browser.
- [ ] **4.2 generateWebsite** — build the site with real market data.
- [ ] **4.3 generateContent** — 30-day social schedule + videos + viral hooks.
- [ ] **4.4 Launch button** — provisions Drive/Git/Vercel/Supabase + payment + arms Marketer.
- [ ] **4.5 Wire AutoBuilder portal** to surface only these 4 approvals (hide the 10-step internal timeline from end users).

## Tier 5 — The Autonomous Loop

- [ ] **5.1 Marketer agent** — new Council agent + Cloud Browser social job templates.
- [ ] **5.2 Revenue feedback** — connect payment provider; `On Payment` workflow → Council learning.
- [ ] **5.3 Self Healing Cycle** — `SystemEnhancement` entity + `runEnhancementCycle` function + scheduled workflow (built in this turn).
- [ ] **5.4 Fortress Engineer** — port the Cloud Browser's enhancement-cycle pattern to harden Vision Cortex itself.

## Tier 6 — The Invisible Backend

- [ ] **6.1 Hide backend screens** — move War Room / Council / Ops / Intel / Shadow / Paper / Live Chat to an admin-only route; keep the 5 user screens clean.
- [ ] **6.2 Cloud Browser as agent tool** — give every agent the `cloud_browser_research` tool.
- [ ] **6.3 Data-broker arm** — `DataBroker` agent + IntelligenceRun schedules that acquire + package valuable datasets.

## Tier 7 — Scale & Port

- [ ] **7.1 Multi-tenant** — RLS per owner; the app serves many users.
- [ ] **7.2 Portability** — package the brain (agents + memory + doctrine) for off-Base44 deployment (Vercel/Supabase/Railway).
- [ ] **7.3 Clone for Chris** — mirror the system as "Xtreme AI" with distinct name/URL.

## How the Fortress Engineer Uses This

Each unchecked item above is seeded as a `pending` `SystemEnhancement` record. The `runEnhancementCycle` (every 4h) generates an implementation plan for the top pending item, audits it, and either marks it `audited` (ready for the builder) or auto-fixes. When the builder (human or agent) completes the work, the record moves to `implemented` → `audited` → `optimized`, and the next item rises to the top.

This is how the system **builds itself** — the build order is the backlog; the cycle is the engine.
