# 01 — Vision Cortex Architecture

The complete map of what exists today, grounded in the actual codebase as of 2026-08-31.

## System identity

Vision Cortex is an autonomous, multi-agent business-intelligence ecosystem. A council of 13 AI agents scans markets, validates opportunities, reverse-engineers competitors, and runs a paper-trading simulation — all to generate and compound residual income. It runs on Base44 (BaaS: auth, DB, integrations, hosting) but is architected to be portable off it.

## Data layer — 10 entities + built-in User

| Entity | Purpose | Key fields |
|---|---|---|
| Idea | Business opportunity | title, problem, solution, competitors, branding, tech_stack, monetization, validation, stage |
| AgentProfile | Agent identity | name, role, mission, personality, intelligence_profile, status, health, order |
| AgentLog | Operational events | agent_name, level, category, message, auto_action, resolved |
| ChatMessage | Council/war-room transcript | author, author_type, content, kind, accent |
| IntelFeed | Ingested intelligence | category, headline, summary, signals, correlations, region, impact_score |
| Trade | Paper trade | asset, direction, thesis, confidence, accuracy_drivers, entry/exit, pnl, status |
| Portfolio | Paper fund | cash_balance, positions_value, total_value, starting_value, day, consecutive_wins |
| Doctrine | Compounding brain | topic, insight, category, confidence, weight, validated, validation_count |
| Governance | Charter | article, principle, category (loyalty/ethics/opsec/charter), enforcement |
| BuildQueue | Build pipeline | title, idea_id, stage, priority, assigned_agent, source |

Every record has built-ins: `id`, `created_date`, `updated_date`, `created_by_id`.

## Backend functions — 11

- **councilPredict** — resolves open trades vs LLM-fetched price, 2-pass Council deliberation (gemini_3_1_pro + web), Shadow browses directed sources, opens next position.
- **councilCompound** — extracts one Doctrine per cycle; reinforces top-3 on wins.
- **councilBlueprint** — generates one full digital-business Idea blueprint.
- **councilSession** — scheduled multi-agent deliberation; 20-topic rotating doctrine; logs to ChatMessage + AgentLog.
- **agentDebate** — on-demand debate across user-selected agents; optional web search.
- **ingestIntel** — LLM web-search ingestion across 15 categories → IntelFeed.
- **visionSweep** — LLM web-search scan → up to 30 Idea records.
- **cloudBrowserIntel** — cloud-browser scrape of one URL → structured IntelFeed records.
- **shadowBrowse** — covert cloud-browser read; returns text to caller only, nothing persisted.
- **shadowClone** — bulk-duplicate records across 6 entities (up to 500).
- **shadowForcefield** — purges ChatMessage referencing "shadow"; plants cover breadcrumb in AgentLog.

## Agents — 13 chat-capable configs

Vision, Validator, Strategy, Brand, Capital, Quant, Maxwell, Sage, Documenter, Philosopher, Treasurer, Distributor, Shadow. Each has memory enabled, scoped entity tool-permissions, and a distinct humanistic personality. Shadow has unrestricted CRUD on all entities + all 11 functions.

## Workflows — 6

- **Autonomous Paper Cycle** — every 2h: councilPredict → councilCompound.
- **Council Session** — every 2h: councilSession.
- **Morning Vision Sweep** — 7am ET daily: visionSweep (30 ideas).
- **Daily Intelligence Ingestion** — 6am ET daily: ingestIntel.
- **Council on Intel** — entity trigger on IntelFeed create, impact ≥ 80 → councilSession.
- **Shadow Forcefield** — hourly: shadowForcefield.

## Frontend — 12 pages

Dashboard, IdeaDetail, Agents, WarRoom, Ops, Intel, Council, Shadow, PaperTrade, Queue, LiveChat, Playbook (+ auth pages). Layout: hamburger slide-over nav, PWA install, theme toggle. Live Chat is a ChatGPT-style two-pane (agent roster + project folders + tools sidebar, conversation pane).

## Integrations / infra

- **Core.InvokeLLM** — models: gemini_3_flash, gemini_3_1_pro, claude_sonnet_4_6 (and others).
- **Cloud Browser engine** via secrets (CLOUD_BROWSER_URL, CLOUD_BROWSER_API_KEY), proxy-pool sessions.
- **Realtime** subscriptions on ChatMessage and agent conversations.
- **PWA** — manifest + SVG icon + install button.
- **Auth** — email/password + Google OAuth, ProtectedRoute gating.

## Known gaps (from the forensic audit — full list in `12`)

The five that matter most:
1. **No Row-Level Security** — every authenticated user can read/write/delete every entity.
2. **Shadow is visible to all users** in the LiveChat sidebar (client-gated only).
3. **Prices are LLM-hallucinated**, not real market data.
4. **The 90% confidence / 10-win gate is not enforced in code.**
5. **Nothing is actually built or launched** — AutoBuilder OS is the missing hands.

## Portability principle

Every entity maps to a Supabase table. Every function maps to a Vercel serverless function or Supabase Edge Function. Every agent config maps to a prompt file in a GitHub repo. The playbook's off-platform chapter (`08`) is the escape hatch: you can lift the whole system off Base44 without losing the brain, because the brain is the Doctrine + Governance + prompt library — all text, all portable.
