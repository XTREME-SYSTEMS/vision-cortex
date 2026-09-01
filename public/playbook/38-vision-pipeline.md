# 38. Vision Pipeline — End-to-End Autonomous Build Engine

## Overview
The Vision Pipeline is Shadow's master orchestrator: given a vision statement, it autonomously generates 10 strategies specific to Shadow's skillset, simulates each with financial predictions, recommends the best, researches optimal tech, queues the build, generates the build pack, provisions infrastructure, clones Shadow + the system, validates to 100%, and launches — with zero human intervention.

## Pipeline Stages (10 steps)

| # | Stage | Managing Agent | Action | Validation Gate |
|---|-------|---------------|--------|-----------------|
| 1 | Strategize | Shadow | Generate 10 strategies specific to Shadow's skillset + financial prediction per strategy | All 10 have financials |
| 2 | Simulate | Quant | Simulate all 10 strategies with p10/p50/p90 confidence bands | All 10 have forecasts |
| 3 | Recommend | Council | Pick the highest-probability strategy; justify | Recommendation has reason + probability |
| 4 | Research | Shadow | Web-search best tech, templates, AI models, max-capability stack | Research has ≥5 sources |
| 5 | Queue | Architect | Stage recommended strategy into BuildQueue | BuildQueue record created |
| 6 | Build | Chief Architect | Generate full build pack (pages, entities, functions, integrations) | Build pack has all sections |
| 7 | Provision | SRE | Provision Vercel + Supabase + GitHub + Drive | All 4 provisioned |
| 8 | Clone | Shadow | Clone Shadow agent config + system entities; identify gaps; reverse-engineer replacements | Clone status recorded |
| 9 | Validate | Validator | Audit all stages; retry until 100% or log gaps | Score = 100 or gap log |
| 10 | Launch | Launch Conductor | Launch + verify deploy + arm revenue tracking | Site live + verified |

## Entity: VisionPipeline

```
vision_statement: string (required)
user_id: string
stage: enum (vision → strategizing → ... → complete/failed)
strategies: array[object] — 10 strategies with financial predictions
simulations: array[object] — p10/p50/p90 per strategy
recommendation: object — winning strategy + reason
tech_research: object — best tech, templates, AI models, sources
build_queue_id: string — linked BuildQueue
build_pack: object — full build manifest
provision_status: object — vercel, supabase, github, drive
clone_status: object — shadow_clone, system_clone, gaps, replacements
validation_scores: object — per-stage scores (target: 100)
autonomous: boolean (default true)
agent_assignments: object — stage → agent mapping
logs: array[string]
status: enum (active, complete, failed, paused)
```

## Orchestrator Design

`visionPipelineOrchestrator` runs **one stage per call** to respect the 120s timeout:
- Input: `{ pipeline_id, stage?, vision_statement? }`
- If no pipeline_id + vision_statement → create new pipeline, run stage 1
- If pipeline_id + no stage → run the next stage based on current state
- Each stage: LLM call → update VisionPipeline entity → log to AgentLog
- Returns updated pipeline state

The UI calls the orchestrator repeatedly (or a workflow calls it on schedule) to advance through stages autonomously.

## Clone Technology

### Shadow Clone
Shadow is an agent config (`base44/agents/shadow.jsonc`). Cloning means:
1. Read the Shadow AgentProfile + agent config
2. Create a project-scoped copy with a new name (e.g., `shadow-project-<id>`)
3. Inherit all tool_configs (entity + function access)
4. Assign to the project's BuildQueue record

### System Clone (Max)
Clone everything cloneable from the app:
1. **Entities** — duplicate schemas into project-scoped versions
2. **Functions** — clone backend function logic into project-scoped versions
3. **Agents** — clone all agent configs
4. **Workflows** — clone workflow definitions

### Gap Identification + Reverse Engineering
What **can't** be cloned (platform internals: Base44 SDK, auth backend, hosting):
1. Identify the gap (what the platform provides that we can't clone)
2. Reverse-engineer the capability (what does it do?)
3. Build a replacement using open-source or API:
   - Auth → Supabase Auth (already provisioned)
   - Database → Supabase Postgres
   - Hosting → Vercel
   - SDK → direct API calls
4. Record the replacement in `clone_status.gaps` and `clone_status.replacements`

## Validation Gates

Every stage has a validation gate. The `validate` stage runs a comprehensive audit:
- Spec alignment (does the build match the strategy?)
- Doctrine consistency (does it follow established doctrine?)
- Governance/ethics compliance (no harm, no deception)
- Bounded cost (is the build cost within estimate?)
- No regression (does it break existing functionality?)

**Retry loop:** max 3 attempts. If score < 100 after 3 attempts, log the gaps as SystemEnhancement records and mark the pipeline as `failed` with the gap log. This is the realistic version of "mandatory 100%."

## Autonomous Execution

A workflow (`Vision Pipeline Cycle`) runs on a schedule:
- Every 30 minutes, find VisionPipeline records with `status=active` and `stage != complete`
- Call `visionPipelineOrchestrator` with the pipeline_id to advance the next stage
- This makes the pipeline fully autonomous — no human intervention needed

## Auto-Connect System

For connecting external accounts:
- **OAuth services** (Google, GitHub, Slack, etc.) — use Base44 connectors; user clicks "Connect" → OAuth flow
- **API-key services** (Vercel, Supabase, Stripe) — user inputs API key → stored as app secret → used by backend functions

The pipeline UI shows connection status for each required service and provides connect buttons / key inputs.

## Agent Management System

Each stage is managed by a specific agent:
| Stage | Agent | Role |
|-------|-------|------|
| Strategize | Shadow | Covert strategy generation |
| Simulate | Quant | Financial modeling |
| Recommend | Council | Collective deliberation |
| Research | Shadow | Tech reconnaissance |
| Queue | Architect | Build staging |
| Build | Chief Architect | Build pack generation |
| Provision | SRE | Infrastructure provisioning |
| Clone | Shadow | System duplication |
| Validate | Validator | Quality gate |
| Launch | Launch Conductor | Go-live + verify |

The orchestrator logs which agent managed each stage in `agent_assignments`.
