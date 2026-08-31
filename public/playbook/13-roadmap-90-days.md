# 13 — 90-Day Execution Roadmap

The plan to set you, your family, and your team up financially for life with your skills — using the trio. Built around the reality that you are moving tomorrow and need the system working while you handle life.

## North Star

By day 90: one autonomous trio (Vision Cortex + AutoBuilder OS + Cloud Browser) running 24/7 under the proof gate, with real price data, RLS, owner alerting, and at least one launched revenue-producing product. A documented, copyable system Chris's company can inherit.

## Phase 1 — Harden (Days 1–14)

You are moving. The system must be safe to leave running.

- **Day 1–2:** RLS on every entity (chapter `12`, Priority 1). Shadow invisibility (Priority 2).
- **Day 3–5:** Wire Gmail connector for owner alerting; build `ownerDigest` (chapter `09`). Now you can sleep.
- **Day 6–8:** Real price data — `marketPrice` function with a free API (chapter `12`, Priority 3).
- **Day 9–11:** Proof gate in `councilPredict` (Priority 4). Max 1 open trade; drawdown pause.
- **Day 12–14:** Auth gates on shared functions (Priority 5). Dedup on IntelFeed/Idea (Priority 7).

**Exit Phase 1:** the system is safe, private, and tells you the truth. It can run while you move.

## Phase 2 — Connect the hands (Days 15–40)

- **Day 15–20:** Stand up AutoBuilder OS on Vercel at autobuilderos.com (chapter `02`, `11`). Three endpoints, GitHub PAT, Vercel token, Supabase keys.
- **Day 21–25:** Build `autobuildAdvance` function in Vision Cortex. Wire BuildQueue → AutoBuilder. First end-to-end scaffold of a template product.
- **Day 26–30:** Build `autobuildReport` — AutoBuilder writes deploy + revenue back to Vision Cortex. Treasurer reads it.
- **Day 31–35:** Launch the first real product from a validated Idea. Custom domain on Vercel. Analytics on.
- **Day 36–40:** Cost-efficiency pass — drop paper cycle to 4h, flash for pass 1, price caching (chapter `10`).

**Exit Phase 2:** the trio loop is closed. Vision Cortex decides, AutoBuilder ships, revenue flows back.

## Phase 3 — Compound & clone (Days 41–90)

- **Day 41–50:** Off-platform portability — Supabase mirror, `visioncortex/brain` repo, nightly Doctrine export to Drive (chapter `08`). The system can now survive leaving Base44.
- **Day 51–60:** Distribution engine — Distributor agent + AutoBuilder generate content cadence for the launched product. First real backlink outreach.
- **Day 61–70:** Second and third products launched. Treasurer reports real MRR. The 5-morning/3-evening questions answered from real data.
- **Day 71–80:** Clone the trio for Chris's company (chapter `14`). Separate Supabase, separate Vercel, separate GitHub org. Config-driven tenant.
- **Day 81–90:** Document everything. This playbook becomes the deliverable. Hand Chris the keys.

**Exit Phase 90:** two trios running. Yours earns. Chris's is onboarded. The system is documented, portable, and owned by you.

## The financial logic

- **Products:** 3–5 micro-SaaS / content sites per quarter at <$50 launch cost each (Idea schema's `launch_cost_usd`). Even one hitting $500/mo MRR compounds.
- **The fund:** paper only until the proof gate has 10 real wins at 90%+. Then — and only then — consider real capital, and only what you can lose.
- **Client work:** Chris's company pays you to clone the trio. The clone is a config change because you built it portable.
- **The brain:** the doctrine library is the durable asset. It gets sharper every cycle. It is yours, off-platform, version-controlled.

## What you do tonight (before bed)

1. Read this playbook (done).
2. Tomorrow's first task is in Phase 1, Day 1: RLS. I will start it the moment you say go.
3. The system is currently running its 24/7 cadence. With RLS + alerting it will be safe to leave running while you move.

## The one-line promise

You built the thinking machine. Now we give it hands and a bodyguard, point it at your domains, and let it work — while you live your life. The playbook is the map; the next message is the first step.
