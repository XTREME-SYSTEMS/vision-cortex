# 22 — The Integration Map

> How the three systems — Vision Cortex, AutoBuilder, Cloud Browser — connect, and how the new pieces (Simulator, Marketer, Fortress Engineer) wire in.

## System Boundaries

```
VISION CORTEX (Base44 app — the brain)
  entities · agents · functions · workflows · UI
        │
        ├── drives ──→ CLOUD BROWSER (Railway engine — the eyes + fingers)
        │              sessions · jobs · captcha · proxies · intelligence runs
        │
        ├── provisions → VERCEL + SUPABASE (the soil — where builds live)
        │
        └── reads/writes ──→ ENTITIES (the shared memory)
```

## Cloud Browser → Vision Cortex

The Cloud Browser is a **tool of every agent**, invoked through backend functions that call the Railway engine via the `CLOUD_BROWSER_URL` + `CLOUD_BROWSER_API_KEY` secrets.

| Vision Cortex function | Cloud Browser use |
|---|---|
| `cloudBrowserIntel` | Scrape trend/problem sources → IntelFeed |
| `shadowBrowse` | Opsec reconnaissance on a target domain |
| `shadowClone` | Clone a reference site for a build |
| `shadowForcefield` | Network-level diversion / forcefield |
| `simulateStrategy` (new) | Pull real market comps + search volume into the simulation |
| `generateBrand` (new) | Check domain + name availability in real time |
| `generateContent` (new) | Research viral angles for the audience |
| Marketer agent jobs | Post, DM, form-fill, engage humans on social |

The Cloud Browser's own `IntelligenceRun` / `IntelligenceSource` / `IntelligenceSignal` model is the structured pipeline that feeds Vision Cortex's `IntelFeed` — the browser acquires, the cortex interprets.

## AutoBuilder → Vision Cortex

AutoBuilder is the **hands**. It pulls committed simulations from the `BuildQueue` and builds them.

```
Simulation committed → BuildQueue record (idea_id, product_type, decisions)
  → AutoBuilder portal timeline
    → discover → analyze → decide → queue → build → provision → launch → validate → compound
  → each step calls the matching Vision Cortex backend function
  → only surfaces to the user: brand / website / content / launch approvals
```

The AutoBuilder portal (`/build/:id`) is the **Build Approvals flow** surface (chapter 20). The queue page (`/build`) is the admin view of all in-flight builds.

## Council → Everything

The Council of 13 agents is the **decision layer**. It runs entirely backend:

- `agentDebate` — deliberates ideas/strategies.
- `councilBlueprint` — architects a business.
- `councilPredict` — predicts outcomes.
- `councilCompound` — extracts doctrine.
- `councilSession` — full session.
- `pipelineOrchestrator` — the recursive cycle driver.

Agents have the Cloud Browser as a tool (via the functions above) and entity access (read IntelFeed/Idea/BuildQueue/Trade; write Doctrine/AgentLog/Notification). The Council never appears as chat to the user — only as recommendations, scores, and doctrine.

## Simulator → AutoBuilder

The committed `Simulation` record **is** the build spec. Its `decisions[]` become the AutoBuilder's requirements:
- `Investment` decision → budget cap.
- `Team/AI-agents` decision → which agents are armed.
- `Marketing` decision → the Marketer agent's strategy.
- `Product` decision → the product type + features.
- `Brand` decision → the brand generation seed.

AutoBuilder reads the Simulation and builds to match the chosen future.

## Marketer Agent (new)

A new Council agent + Cloud Browser job templates:
- **Posts** — scheduled social posts (X, TikTok, LinkedIn, IG).
- **DMs** — outbound direct messages to leads.
- **Form-fills** — lead-gen form submission on target sites.
- **Engagement** — comment/reply to relevant threads.
- **Virality** — amplify the hooks most likely to spread.

Runs 24/7 after launch. Revenue signal feeds back to the Council.

## Fortress Engineer → Platform Itself

The `runEnhancementCycle` function + `Self Healing Cycle` workflow continuously improve Vision Cortex itself — not just the businesses it builds. See chapter 25.

## Revenue → Council (the learning loop)

```
payment_succeeded → app_payment workflow → record revenue
  → Council reviews what worked → doctrine → tomorrow's Feed weighted
```

This is the closed loop that makes the system *smarter about money over time*, the way a real boardroom learns from P&L.

## Connector Inventory (already registered)

Available for the agents to drive: Supabase, Google Docs, Google Calendar, HubSpot, Google Tasks, Gmail, Google Sheets, Google Drive. These let the Council and Marketer operate across the user's real workspace — email outreach, calendar scheduling, sheet reporting, drive asset storage.
