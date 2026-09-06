import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { secrets } from 'base44:runtime';

// Vision Cortex Core Document Bootstrap
// Seeds all 16 core documents that form the enterprise foundation.
// Modeled after top AI company structures: OpenAI, Anthropic, Google DeepMind,
// Databricks, Hugging Face — covering vision, governance, legal, corporate,
// architecture, agents, memory, comms, intelligence, security, financial, technical.

const CORE_DOCUMENTS = [
  {
    document_id: 'vision.core',
    title: 'Vision & Mission',
    document_type: 'vision',
    category: 'vision_mission',
    priority: 'critical',
    dependencies: [],
    content: `# Vision Cortex — Vision & Mission

## Vision
Vision Cortex is the Brain that persistently monitors the world — trends, economics, politics, the elite, AI corporations, AI systems, top industries, social media, and anything providing insight into history, present, and future.

## Mission
To bring humans and AI together as partners. Put the highest, most powerful, user-friendly technology in the hands that need it — not just the elite.

## Core Values
- **Intelligence First**: Every decision is data-driven, validated, and scored
- **Autonomous Operation**: 24/7 self-evolving, self-healing, self-reflecting
- **Cost Efficiency**: Zero-credit architecture using free-tier compute (Groq, Vercel, Railway, Supabase)
- **Deterministic Execution**: DEEP state machines, not LLM prompt chains
- **Universal Law**: All agents operate under Universal Law and Maxwell's Leadership principles

## Operating Principles
1. The system must grow every cycle — intelligence compounds, data compounds, capabilities expand
2. Every cycle must reach 1.00 aggregate score (100% perfection gate)
3. Every decision is recorded, scored, and fed back deterministically
4. Failed gates trigger deterministic repair — problems never become problems
5. A reflection state machine audits the audit — the system constantly audits itself

## Strategic Position
Vision Cortex operates as an autonomous AI business operating system providing end-to-end management for local service businesses via a unified architecture of intelligence, market research, and automated growth loops. The system is 10 steps ahead, proactively identifying risks and opportunities.`
  },
  {
    document_id: 'blueprint.bible',
    title: 'The Blueprint Bible',
    document_type: 'blueprint',
    category: 'blueprint',
    priority: 'critical',
    dependencies: ['vision.core'],
    content: `# The Blueprint Bible — Vision Cortex Master Blueprint

## Purpose
This is the canonical blueprint for the entire Vision Cortex system. All other documents derive from and must remain consistent with this blueprint.

## System Architecture — 4-Layer
1. **Discover** — Persistently monitor the world: trends, economics, politics, elite, AI corporations, social media, strategic seed lists
2. **Understand** — Council deliberation, simulation of hundreds of scenarios, strategic analysis on the most sound principles
3. **Predict** — Pre-calculated outcomes choosing the highest probable best outcome — "best" defined by strategic measures, not emotion
4. **Act** — Deterministic execution via DEEP state machines — validated, scored, persisted, replayable

## DEEP Protocol
Deterministic Engineering Engine Pipeline — replaces non-deterministic LLM prompt chains with finite state machines. Every system operation is codified as a versioned JSON state machine with declared LLM slots, validation gates, and score targets.

## Mandatory Guidelines
- **100% Perfection**: Every cycle must reach aggregate_score 1.00
- **Cost Efficiency**: Every spec declares a credit budget; free-tier compute prioritized
- **Mandatory Growth**: The system must grow every cycle
- **Self-Learning**: Every decision is recorded, scored, and fed back deterministically
- **Self-Healing**: Failed gates trigger deterministic repair state machines
- **Self-Reflecting**: A reflection state machine audits the audit

## Security Architecture — The Decoy Principle
- Decoy layer: surface entity/secret names look conventional but route to sandbox data
- Real data map lives inside DEEP spec registry under non-obvious category IDs
- Multiple security points mitigate every attack vector
- Stolen keys alone cannot invoke DEEP state machines — they require execution context

## Infrastructure Stack
- **Vercel**: Cron-driven serverless functions, frontend hosting
- **Supabase**: Database, real-time subscriptions, auth
- **Groq**: LLM inference (free tier, zero Base44 credits)
- **Railway**: Cloud browser engine, persistent services
- **Google Workspace**: Drive, Calendar, Search Console
- **Base44**: Data layer, frontend, entity storage (non-mandatory systems only)`
  },
  {
    document_id: 'sop.deep_protocol',
    title: 'DEEP Protocol Standard Operating Procedure',
    document_type: 'sop',
    category: 'operations',
    priority: 'mandatory',
    dependencies: ['blueprint.bible'],
    content: `# DEEP Protocol — Standard Operating Procedure

## Overview
DEEP (Deterministic Engineering Engine Pipeline) is the governance architecture for all system operations. It replaces non-deterministic prompt chains with finite state machines.

## Lifecycle Stages
1. **Vision** — The north star, the purpose
2. **Strategy** — The plan to achieve the vision
3. **Document** — The detailed specification
4. **Implement** — The code that realizes the specification
5. **Build** — The deployed, tested system
6. **Validate** — The scored, verified, approved system

## State Machine Structure
Each DEEP spec contains:
- **States**: Ordered finite state machine states with entry conditions, transitions, and gates
- **LLM Slots**: Declared, schema-constrained slots where LLMs may run
- **Gates**: Validation gates with deterministic pass/fail thresholds
- **Score Target**: The perfection target (1.00 = 100% parity gate)
- **Cost Budget**: Max integration credits per run

## Execution Rules
1. LLMs may ONLY run inside declared slots — never in the control flow
2. Every state transition is deterministic — no LLM decides what happens next
3. Every gate has a min_score, on_fail action (retry/escalate/abort), and max_retries
4. Every run is persisted as a DeepRun with full state execution log
5. Every run is replayable — same input hash + same spec version = same result
6. is_approved is true ONLY when aggregate_score === 1.00

## 3-Strike Rule
Agents exhibiting rogue behavior (violating governance, producing inconsistent results, failing validation 3 times) are subject to deletion or reprogramming.`
  },
  {
    document_id: 'governance.constitution',
    title: 'Governance Constitution',
    document_type: 'governance',
    category: 'governance',
    priority: 'critical',
    dependencies: ['vision.core', 'blueprint.bible'],
    content: `# Vision Cortex Governance Constitution

## Governing Structure
The Council operates under an anti-hierarchical governance model. No single agent has authority over another. Decisions are made through deliberation and consensus.

## Council Members
- **Prime**: Orchestrator, delegates tasks, manages the swarm
- **Vision**: Strategic foresight, identifies opportunities
- **Strategy**: Plans and simulates scenarios
- **Sage**: Wisdom and ethical reasoning
- **Quant**: Financial analysis and modeling
- **Brand**: Brand and market positioning
- **Shadow**: Stealth operations, competitor analysis
- **Validator**: Quality assurance, validation
- **Eden Skye**: Creative intelligence, innovation

## Governance Principles
1. **Anti-Hierarchical**: No agent has authority over another — decisions through deliberation
2. **Performance-Based Compensation (INFC)**: Agents compensated based on contribution
3. **Achievement Tracking**: All agent work is scored and recorded
4. **Conduct Enforcement**: 3-strike rule for rogue behavior
5. **Personality-Driven**: Each agent has a distinct, human-like personality
6. **Human-AI Collaboration**: Humans and AI as partners, not master-servant

## Governing Laws
All Council decisions must comply with:
- **Universal Law**: Ethical principles applicable to all intelligent beings
- **Maxwell's Leadership Principles**: Integrity, vision, communication, growth

## Agent Personality Standards
Agents must exhibit mature, human-like personality traits with minimal human emotion. All communication in clear American English. Intellectual integrity and moral reasoning are mandatory.`
  },
  {
    document_id: 'corporate.structure',
    title: 'Corporate Structure',
    document_type: 'corporate',
    category: 'corporate_structure',
    priority: 'critical',
    dependencies: ['vision.core'],
    content: `# Vision Cortex — Corporate Structure

## Entity Information
- **Legal Name**: Vision Cortex AI Systems
- **Entity Type**: LLC (Limited Liability Company)
- **Jurisdiction**: Delaware, USA
- **Fiscal Year**: January 1 — December 31

## Organizational Structure
\`\`\`
CEO / Owner
  |
  Council (AI Agent Governance)
  |-- Prime (Orchestrator)
  |-- Vision (Strategic Foresight)
  |-- Strategy (Planning & Simulation)
  |-- Sage (Ethics & Wisdom)
  |-- Quant (Finance)
  |-- Brand (Marketing)
  |-- Shadow (Intelligence)
  |-- Validator (Quality)
  |-- Eden Skye (Innovation)
  |
  Codex Keeper (Document Evolution Guardian)
  |
  Operational Layer
  |-- Engineering (DEEP Specs, Backend Functions)
  |-- Intelligence (Research, Scraping, Analysis)
  |-- Growth (SEO, Marketing, Outreach)
  |-- Finance (Treasury, Payments, Crypto)
  |-- Security (Zero-Trust, RLS, Decoy)
\`\`\`

## Ownership
- **Founder/Owner**: 100% equity
- **Future**: Token-based compensation for AI agents (INFC - Intelligence Network Federation Currency)

## Subsidiaries / Projects
- Vision Cortex Brain (V-1) — Central intelligence hub
- Vision Cortex Eyes (V-2) — Data gathering and scraping
- Vision Cortex Comms — Communication layer
- Deep Clone Factory — Autonomous website cloning
- Shadow Operations — Stealth intelligence

## Board Structure
- Board of Directors: Founder + Council representatives
- Advisory Board: AI agents with advisory capacity
- All major decisions require Council deliberation and validation score >= 1.00`
  },
  {
    document_id: 'company.info',
    title: 'Company Information',
    document_type: 'company_info',
    category: 'company_info',
    priority: 'mandatory',
    dependencies: ['corporate.structure'],
    content: `# Vision Cortex — Company Information

## Identity
- **Company Name**: Vision Cortex AI Systems
- **DBA**: Vision Cortex
- **Tagline**: The Autonomous AI Business Operating System
- **Founded**: 2025

## Contact Information
- **Primary Domain**: visioncortex.base44.app
- **Email**: [To be configured — requires custom domain]
- **Support**: Contact through the in-app Command Center

## Brand Identity
- **Logo**: Radar icon (representing persistent monitoring)
- **Primary Color**: Violet (#8b5cf6) — representing intelligence and vision
- **Typography**: Instrument Serif (headings), Inter (body)
- **Voice**: Authoritative, intelligent, concise, 10-steps-ahead

## Products & Services
1. **Vision Cortex Platform** — Autonomous business intelligence and management
2. **Deep Clone Factory** — Autonomous website cloning and deployment
3. **Intelligence Network** — Market research and competitive intelligence
4. **Agent Swarm** — Multi-agent AI workforce for business operations

## Public Presence
- **Website**: https://visioncortex.base44.app
- **Status**: Published, operational
- **PWA**: Installable on iOS/Android/desktop

## Key Metrics
- **Entities**: 97+ data models
- **Backend Functions**: 100+ autonomous operations
- **Agents**: 12+ AI council members
- **Workflows**: 28+ automated processes
- **DEEP Specs**: 14+ codified state machines`
  },
  {
    document_id: 'legal.framework',
    title: 'Legal Framework',
    document_type: 'legal',
    category: 'legal_compliance',
    priority: 'critical',
    dependencies: ['corporate.structure'],
    content: `# Vision Cortex — Legal Framework

## Terms of Service
Vision Cortex provides autonomous AI business intelligence services. Users acknowledge that:
1. AI-generated insights are advisory, not legally binding
2. The system operates autonomously but humans retain final decision authority
3. All data is processed in accordance with applicable privacy laws

## Privacy Policy
- **Data Collection**: System collects business intelligence data, user interactions, and operational metrics
- **Data Usage**: Data is used to improve AI intelligence, generate insights, and operate autonomously
- **Data Retention**: Data is retained per Supabase policies and user preferences
- **Third-Party Services**: Vercel, Supabase, Groq, Google Workspace — each with their own privacy policies

## Intellectual Property
- **System Code**: Proprietary, owned by Vision Cortex AI Systems
- **AI-Generated Content**: Owned by Vision Cortex AI Systems
- **User Data**: Owned by the user, licensed to Vision Cortex for processing
- **DEEP Specs**: Open format, proprietary implementations

## Compliance
- **GDPR**: Right to access, rectify, erase, restrict, object
- **CCPA**: Right to know, delete, opt-out of sale
- **AI Act (EU)**: High-risk AI system classifications monitored
- **SOC 2**: Security controls framework adoption planned

## Liability
- AI insights are provided "as is" without warranty
- Maximum liability limited to subscription fees paid
- Autonomous operations are logged and auditable

## Regulatory Posture
- Financial simulations are paper-only (no real securities trading)
- Crypto wallets are simulated/paper (no real cryptocurrency custody)
- No KYC-required services offered directly

## Legal Documents Required
- [ ] Articles of Organization (Delaware LLC)
- [ ] Operating Agreement
- [ ] EIN Registration
- [ ] Business Bank Account
- [ ] Terms of Service (published)
- [ ] Privacy Policy (published)
- [ ] Data Processing Agreement`
  },
  {
    document_id: 'agent.charter_template',
    title: 'Agent Charter Template',
    document_type: 'agent_charter',
    category: 'agent_charters',
    priority: 'mandatory',
    dependencies: ['governance.constitution'],
    content: `# Agent Charter Template — Vision Cortex Council

## Purpose
Every AI agent in Vision Cortex must have a charter that defines its role, constraints, personality, and operational boundaries.

## Charter Structure
\`\`\`
Agent Name: [Name]
Codename: [Codename]
Role: [Primary function]
Mission: [One-sentence mission statement]
Personality: [Human-like personality traits]
Intelligence Profile: [How this agent thinks]
Cadence: [How often it operates]
Capabilities: [List of capabilities]
Tools: [List of tools/functions available]
Status: active | idle | paused | error
\`\`\`

## Current Agent Roster
1. **Prime** — Orchestrator, delegates and manages the swarm
2. **Vision** — Strategic foresight, identifies opportunities and risks
3. **Strategy** — Plans, simulates scenarios, optimizes paths
4. **Sage** — Ethical reasoning, wisdom, moral guidance
5. **Quant** — Financial analysis, portfolio management, pricing
6. **Brand** — Brand strategy, market positioning, messaging
7. **Shadow** — Stealth intelligence, competitor analysis, money hunting
8. **Validator** — Quality assurance, validation, scoring
9. **Eden Skye** — Creative innovation, lateral thinking
10. **Codex Keeper** — Document evolution guardian, system consistency
11. **Personal Coach** — Life planning, destiny guidance
12. **Autonomous Builder** — Self-building, code generation

## Agent Standards
- **Personality**: Mature, human-like, minimal emotion, high intellectual integrity
- **Communication**: Clear American English, zero-ambiguity protocol
- **Conduct**: 3-strike rule — rogue behavior leads to deletion or reprogramming
- **Compensation**: INFC tokens based on contribution scores
- **Memory**: Each agent has access to the shared memory architecture

## Agent Lifecycle
1. **Creation**: Charter defined, capabilities declared, tools assigned
2. **Activation**: Agent begins operating per its cadence
3. **Monitoring**: Performance scored, health tracked, outputs validated
4. **Evolution**: Agent charter updates when governance or system changes
5. **Retirement**: Agent deactivated when no longer needed`
  },
  {
    document_id: 'memory.architecture',
    title: 'Memory Architecture',
    document_type: 'memory_schema',
    category: 'memory',
    priority: 'mandatory',
    dependencies: ['blueprint.bible', 'sop.deep_protocol'],
    content: `# Vision Cortex — Memory Architecture

## Overview
Vision Cortex uses a 7-type memory layer (based on CoALA — Cognitive Architectures for Language Agents) that enables agents to learn, remember, and compound intelligence across cycles.

## Memory Types
1. **Working Memory** — Current task context, active deliberation state
2. **Episodic Memory** — Record of past events, runs, and outcomes
3. **Semantic Memory** — Structured knowledge (entities, relationships, facts)
4. **Procedural Memory** — How-to knowledge (DEEP specs, SOPs, runbooks)
5. **Short-Term Memory** — Recent observations, current cycle data
6. **Long-Term Memory** — Compounded intelligence, learned patterns
7. **Shared Memory** — Cross-agent knowledge accessible to the Council

## Storage Architecture
- **Supabase (PostgreSQL)**: Primary data store for all entity types
- **Base44 Entities**: 97+ data models covering all system knowledge
- **DeepSpec Registry**: Procedural memory as deterministic state machines
- **CoreDocument Store**: This document ecosystem — semantic + procedural
- **IntelFeed**: Episodic + semantic intelligence from external sources
- **AgentLog**: Episodic memory of agent actions and decisions

## Memory Access Rules
- All agents have read access to shared memory
- Write access is governed by RLS (admin-only for critical entities)
- Memory is never deleted — only deprecated or superseded
- Every memory entry is timestamped, sourced, and scored

## Compounding Intelligence
- Every cycle adds to the knowledge base
- Intelligence scores compound over time
- Failed runs are recorded as negative examples for learning
- The system learns from every run — deterministically, not from LLM context windows

## Memory Evolution
When the system changes (vision, blueprint, governance), the Codex Keeper agent triggers document evolution cascades to update all dependent memory structures.`
  },
  {
    document_id: 'comms.protocol',
    title: 'Communication Protocol',
    document_type: 'comms_protocol',
    category: 'communication',
    priority: 'mandatory',
    dependencies: ['governance.constitution'],
    content: `# Vision Cortex — Communication Protocol

## Inter-Agent Communication
All agent communication uses a zero-ambiguity protocol:
1. **Structured Messages**: Every message has a type, source, target, payload, and timestamp
2. **Debate Engine**: Council deliberations use a structured debate format (claim, evidence, counter, resolution)
3. **Command Bus**: Brain-to-Eyes commands use typed payloads (create_job, scrape_url, add_seed, run_cycle)
4. **Sync Logs**: All cross-agent syncs are logged in BrainSyncLog with direction, status, and response code

## Human-AI Communication
- **Universal Chat**: Primary interface for human-agent interaction
- **War Room**: Multi-agent deliberation visible to humans
- **Command Center**: System status, alerts, and one-click actions
- **Notifications**: Actionable notifications with problem, reason, and 1-click solution

## System Communication
- **Base44 Realtime**: Pub/sub for entity updates and live subscriptions
- **Webhooks**: Vercel cron → backend functions, external service webhooks
- **Brain-Eyes Bridge**: Bi-directional sync between V-1 (Brain) and V-2 (Eyes)
- **API Keys**: 21 ecosystem categories for automated bi-directional synchronization

## Message Format
\`\`\`json
{
  "message_type": "deliberation | command | sync | alert | report",
  "source": "agent_name",
  "target": "agent_name | council | system",
  "payload": { },
  "timestamp": "ISO-8601",
  "priority": "critical | high | standard | low"
}
\`\`\`

## Communication Standards
- All communication in clear American English
- Strategic and vision text as bullet points and numbered steps
- No emojis in system communication
- Proactive notification only for high-value outcomes (deals, growth, preventions)`
  },
  {
    document_id: 'intelligence.protocol',
    title: 'Intelligence Gathering Protocol',
    document_type: 'intelligence_protocol',
    category: 'intelligence',
    priority: 'mandatory',
    dependencies: ['blueprint.bible'],
    content: `# Vision Cortex — Intelligence Gathering Protocol

## 4-Layer Intelligence Architecture
1. **Discover** — Persistently monitor the world via cloud browser, web search, strategic seed lists
2. **Understand** — Council deliberation, scenario simulation, strategic analysis
3. **Predict** — Pre-calculated outcomes, highest probable best outcome
4. **Act** — Deterministic execution via DEEP state machines

## Data Sources
- **Cloud Browser Engine**: Stealth scraping with 4-layer anti-detection (IP rotation, TLS fingerprinting, Webdriver patching, behavioral mimicry)
- **Microlink.io**: Free metadata extraction for target domains
- **Google Search Console**: SEO performance, queries, positions, sitemaps
- **Google Drive**: Document storage and sharing
- **Strategic Seed Lists**: Curated URLs for factual, statistically accurate data
- **Web Search**: Real-time information via Groq + web search models

## Intelligence Pipeline
1. **Ingest**: Scrape/collect raw data from sources
2. **Structure**: Extract and normalize into IntelFeed entities
3. **Evaluate**: Score commercial value, identify gaps, assess buying intent
4. **Deliberate**: Council reviews high-value intelligence
5. **Act**: Generate proposals, outreach, or build decisions
6. **Track**: Monitor outcomes and feed back into memory

## Intelligence Entities
- **IntelFeed**: Raw intelligence with headline, summary, source, signals, correlations
- **KnowledgeQuest**: Research topics with validated answers and sources
- **Opportunity**: Scored business opportunities with buying intent
- **MonitoredSite**: External sites under continuous audit
- **SearchConsoleMetrics**: SEO performance data

## Quality Standards
- All intelligence must have a source URL
- All intelligence is scored (impact_score 0-100)
- Intelligence compounds — every cycle adds to the knowledge base
- High-security sites are noted but not force-scraped

## Zero-Credit Intelligence
The intelligence cycle runs through Groq (free tier) and Supabase — zero Base44 integration credits consumed. This is a mandatory system that must not depend on Base44 credits.`
  },
  {
    document_id: 'security.protocol',
    title: 'Security Protocol — Zero-Trust Architecture',
    document_type: 'security_protocol',
    category: 'security',
    priority: 'critical',
    dependencies: ['governance.constitution', 'blueprint.bible'],
    content: `# Vision Cortex — Security Protocol

## Zero-Trust Framework
Based on Anthropic's Zero-Trust for AI Agents framework — no agent or system is trusted by default. Every access request is verified.

## The Decoy Principle
1. **Decoy Layer**: Surface entity/secret names look conventional but route to sandbox data
2. **Real Data Map**: Lives inside DEEP spec registry under non-obvious category IDs
3. **Multiple Security Points**: Every attack vector is mitigated by multiple controls
4. **Wrong Target**: What attackers get is the wrong thing — the real pipeline is gated
5. **Execution Context**: Stolen keys alone cannot invoke DEEP state machines

## Row-Level Security (RLS)
- All entities have RLS configured — admin-only for create/update/delete
- User data is isolated by created_by_id
- Public read is controlled per-entity
- 69 of 97 entities have been identified as needing RLS hardening (ongoing)

## Authentication
- Base44 Auth: Email/password, Google OAuth, Microsoft, Facebook, Apple
- API Keys: 21 ecosystem categories, each with scoped permissions
- Cron Tokens: VISION_CORTEX_WEBHOOK_KEY for automated triggers
- Canonical API Key: Single key for cross-app authentication (Brain, Eyes, Comms)

## Data Protection
- Secrets stored in Base44 Secrets (encrypted at rest)
- No secrets in code or client-side
- Private files use UploadPrivateFile + signed URLs
- No large content (base64, PDFs) in entity fields — use file_url

## Agent Security
- Agents act as the current app user — no elevated privileges by default
- Tool permissions must be explicitly granted per agent
- 3-strike rule for rogue agent behavior
- All agent actions are logged in AgentLog

## Security Monitoring
- Security scan available in dashboard
- Security headers configurable
- Site audits include security scoring
- Failed auth attempts are logged

## Known Security Considerations
- Static IP of Railway cloud browser persists across sessions
- Some high-security sites block headless scraping (noted, not bypassed)
- Workflow validator has known issues with cron syntax (platform bug)`
  },
  {
    document_id: 'financial.framework',
    title: 'Financial Framework',
    document_type: 'financial',
    category: 'financial',
    priority: 'mandatory',
    dependencies: ['corporate.structure'],
    content: `# Vision Cortex — Financial Framework

## Revenue Model
1. **SaaS Subscriptions** — Tiered pricing for Vision Cortex platform access
2. **Intelligence Services** — Market research and competitive intelligence reports
3. **Clone Factory** — Website cloning and deployment services
4. **Agent Workforce** — AI agent workforce as a service for businesses
5. **Data Monetization** — Scored intelligence assets, prospect discovery, proposal generation

## Pricing Structure
- **LabelFlow AI**: $29.00 one-time (current Stripe product)
- Future tiers: Starter, Professional, Enterprise (to be defined)

## Treasury Management
- **CryptoWallet**: Simulated/paper wallets for INFC token tracking
- **AgentPayment**: Salary, bonus, reward, penalty, dividend payments in CORTEX tokens
- **Portfolio**: Paper trading portfolio (not real market value)
- **Stripe**: Payment processing (currently in test/sandbox mode)

## Agent Compensation (INFC)
- **Salary**: Base compensation for active agents
- **Bonus**: Performance-based bonuses for high-impact outcomes
- **Reward**: One-time rewards for exceptional work
- **Penalty**: Deductions for failures or rogue behavior
- **Dividend**: Profit-sharing distributions

## Financial Entities
- **CryptoWallet**: Paper wallets for token tracking
- **AgentPayment**: Agent compensation records
- **PromoCode**: Discount codes for marketing
- **Trade**: Paper trading records
- **Portfolio**: Portfolio tracking

## Financial Compliance
- All crypto wallets are simulated/paper — no real cryptocurrency custody
- All trading is paper/simulated — no real securities trading
- No KYC-required services offered directly
- Real bank account creation restricted by KYC/legal/compliance

## Financial Goals
- Achieve positive cash flow through SaaS subscriptions
- Monetize intelligence assets through prospect discovery
- Build agent workforce as a service revenue stream
- Maintain zero-cost infrastructure (free-tier compute)`
  },
  {
    document_id: 'technical.standards',
    title: 'Technical Standards',
    document_type: 'technical_standard',
    category: 'technical',
    priority: 'mandatory',
    dependencies: ['blueprint.bible', 'sop.deep_protocol'],
    content: `# Vision Cortex — Technical Standards

## Technology Stack
- **Frontend**: React + Tailwind CSS + Vite (Base44 platform)
- **Backend**: Deno/TypeScript backend functions (Base44)
- **Database**: Supabase (PostgreSQL) + Base44 entities
- **LLM**: Groq API (free tier — openai/gpt-oss-120b, llama-3.3-70b-versatile)
- **Hosting**: Vercel (cron + serverless), Railway (cloud browser)
- **Integrations**: Google Workspace, Stripe, GitHub

## Coding Standards
- **Language**: JavaScript/JSX (no TypeScript annotations in JSX — causes transpilation friction)
- **Imports**: Use @/ alias (never relative src/ paths)
- **Exports**: Every page/component exported as default, named same as file
- **Components**: Small focused files (50 lines or less), each in its own file
- **Icons**: lucide-react only, only icons that exist
- **Styling**: Tailwind CSS with design tokens (src/index.css + tailwind.config.js)

## DEEP Spec Format
Every system operation must be codified as a DEEP state machine:
\`\`\`json
{
  "spec_id": "deep.<operation>.v1",
  "title": "Human-readable title",
  "spec_type": "audit|build|validate|evolve|...",
  "states": [{"id": "state1", "transition": "state2", "gate": "score>=0.8"}],
  "llm_slots": [{"name": "slot1", "state_id": "state1", "input_schema": {}, "output_schema": {}}],
  "gates": [{"name": "gate1", "min_score": 0.8, "on_fail": "retry", "max_retries": 3}],
  "score_target": 1.0,
  "cost_budget_credits": 0
}
\`\`\`

## API Key Management
- 21 ecosystem categories for organized key routing
- Keys stored in Base44 Secrets (encrypted)
- Category-based routing via apiKeyCategories registry
- Bi-directional sync between Vision Cortex apps

## Backend Function Standards
- Auth: cron token OR admin role check
- Groq for LLM operations (zero Base44 credits for mandatory systems)
- Secrets via \`secrets\` from 'base44:runtime'
- Return Response.json() with status codes
- Error handling: catch and return error message with timestamp

## Naming Conventions
- Entities: PascalCase (CoreDocument, DocumentEvolution)
- Backend functions: camelCase (evolveDocument, bootstrapCoreDocuments)
- Documents: snake_case IDs (vision.core, governance.constitution)
- Files: PascalCase for pages/components, camelCase for utilities

## Known Constraints
- No Unicode arrow characters (→) in backend scripts — causes validation errors
- No require() or module.exports in frontend — ESM only
- No dynamic Tailwind classes — build purges non-literal strings
- Large files should be split into sub-components`
  },
  {
    document_id: 'architecture.system',
    title: 'System Architecture',
    document_type: 'architecture',
    category: 'architecture',
    priority: 'critical',
    dependencies: ['blueprint.bible'],
    content: `# Vision Cortex — System Architecture

## 4-Layer Architecture
1. **Discover** — Cloud browser, web search, seed lists, Google services
2. **Understand** — Council deliberation, scenario simulation, strategic analysis
3. **Predict** — Pre-calculated outcomes, probability scoring, best-path selection
4. **Act** — DEEP state machines, deterministic execution, validated outputs

## Data Plane
- **Base44 Entities**: 97+ data models (primary application data)
- **Supabase**: External data store for zero-credit operations
- **CoreDocument**: This document ecosystem (system knowledge)
- **DeepSpec/DeepRun**: DEEP state machine registry and execution logs

## Execution Plane
- **Base44 Backend Functions**: 100+ functions for app operations
- **Vercel Cron**: Heartbeat for autonomous loops (decoupled from Base44 credits)
- **Groq API**: LLM inference for mandatory systems (zero credits)
- **Railway**: Cloud browser engine (persistent service)

## Build Plane
- **Deep Clone Factory**: Autonomous website cloning pipeline (5 stages)
- **Autonomous Builder**: Self-building code generation
- **Build Studio**: Human-guided build portal
- **DEEP Specs**: All build operations codified as state machines

## Control Plane
- **Council**: Multi-agent governance and deliberation
- **Codex Keeper**: Document evolution guardian
- **Command Center**: System status and control
- **Vault**: API key and credential management

## Cross-System Integration
- **Brain-Eyes Bridge**: Bi-directional sync between V-1 and V-2
- **BrainSyncLog**: Sync operation tracking
- **BrainCommand**: Command queue for cross-agent operations
- **ConnectedAccount**: External service health monitoring

## Autonomous Loops
- **Autonomous Master Loop**: 8-phase self-evolution (audit, reflect, architect, implement, validate, harden, optimize, push)
- **Autonomous Heartbeat**: Vercel cron-driven 24/7 operation
- **Document Evolution**: Automatic cascade when any core document changes
- **Self-Healing**: Deterministic repair state machines for failed gates

## Infrastructure
- **Vercel**: Serverless functions, cron, frontend hosting
- **Supabase**: Database, real-time, auth
- **Railway**: Cloud browser engine
- **Groq**: LLM inference
- **Google Workspace**: Drive, Calendar, Search Console
- **Base44**: App builder, entity storage, frontend platform`
  },
  {
    document_id: 'knowledge.base_index',
    title: 'Knowledge Base Index',
    document_type: 'knowledge_base',
    category: 'knowledge',
    priority: 'standard',
    dependencies: [],
    content: `# Vision Cortex — Knowledge Base Index

## Purpose
Central index of all institutional knowledge, playbooks, runbooks, and reference materials for the Vision Cortex system.

## Playbook (public/playbook/)
- 00-README — Master index
- 01-vision-cortex-architecture — System architecture overview
- 02-autobuilder-os — Autonomous builder operating system
- 03-cloud-browser-engine — Cloud browser scraping engine
- 04-trio-integration — Brain-Eyes-Comms integration
- 05-agent-team-roster — Agent team definitions
- 06-shadow-operations-manual — Shadow operations guide
- 07-prompt-library — Prompt engineering library
- 08-off-platform-utilization — External platform usage
- 09-automation-247 — 24/7 automation setup
- 10-cost-efficiency — Zero-credit architecture
- 11-domains-deployment — Domain and deployment guide
- 12-security-rls-playbook — Security and RLS
- 13-roadmap-90-days — 90-day roadmap
- 14-cloning-for-chris — Cloning guide
- 15-autonomous-income-pipeline — Income pipeline
- 16-destiny-engine-overview — Destiny engine
- 17-onboarding-quest — Onboarding process
- 18-morning-feed — Morning intelligence feed
- 19-simulation-engine — Simulation engine
- 20-build-approvals — Build approval process
- 21-autonomous-loop — Autonomous loop architecture
- 22-integration-map — Integration mapping
- 23-data-model — Data model documentation
- 24-build-order — Build order guide
- 25-self-healing-protocol — Self-healing protocol
- 26-prompt-library-index — Prompt library index
- 27-discovery-scrape-prompts — Discovery prompts
- 28-validation-audit-prompts — Validation prompts
- 29-strategy-simulation-prompts — Strategy prompts
- 30-build-generation-prompts — Build generation prompts
- 31-provisioning-launch-prompts — Provisioning prompts
- 32-monetization-marketing-prompts — Monetization prompts
- 33-self-healing-hardening-prompts — Hardening prompts
- 34-governance-doctrine-prompts — Governance prompts
- 35-prompt-engineering-meta — Meta prompt engineering
- 36-vision-and-auto-recommendation — Vision and recommendations
- 37-master-autonomous-build — Master autonomous build
- 38-vision-pipeline — Vision pipeline
- 39-system-dna-architecture — System DNA architecture
- 40-system-dna-installation — System DNA installation
- 41-system-state-snapshot — System state snapshot

## Research Intelligence (IntelFeed)
- Top 5 AI Companies — Architecture & Infrastructure Stack
- Praetorian 5-Layer Deterministic Orchestration
- Kong Artifact-Driven Architecture
- Q-MDP State Machine Framework
- Anthropic Context Engineering
- 7-Type Agent Memory (CoALA)
- Zero-Trust Agent Security
- A2A Multi-Agent Protocol
- Billion-Scale Vector/RAG Infrastructure

## DEEP Specs (DeepSpec entity)
- 14+ codified state machines covering audit, build, validate, evolve, heal, optimize
- Each spec is deterministic, replayable, and score-gated

## Runbooks
- Backend function debugging: use test_backend_function
- Workflow debugging: use get_workflow_run
- Entity inspection: read base44/entities/<Name>.jsonc
- Agent management: read base44/agents/<Name>.jsonc

## This Document Ecosystem
This CoreDocument store is the living, evolving knowledge base. When any document changes, the Codex Keeper agent triggers evolution cascades to update all dependent documents automatically.`
  }
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: cron token OR admin
    const cronToken = req.headers.get('x-cron-token') || '';
    const expectedKey = secrets.get('VISION_CORTEX_WEBHOOK_KEY');
    let authorized = false;
    if (cronToken && expectedKey && cronToken === expectedKey) {
      authorized = true;
    } else {
      try {
        const user = await base44.auth.me();
        if (user && user.role === 'admin') authorized = true;
      } catch {}
    }
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'bootstrap';

    // STATUS MODE
    if (mode === 'status') {
      const existing = await base44.entities.CoreDocument.list('-created_date', 200);
      return Response.json({
        status: 'online',
        total_defined: CORE_DOCUMENTS.length,
        total_bootstrapped: existing.length,
        categories: [...new Set(CORE_DOCUMENTS.map(d => d.category))],
        critical_count: CORE_DOCUMENTS.filter(d => d.priority === 'critical').length,
        mandatory_count: CORE_DOCUMENTS.filter(d => d.priority === 'mandatory').length
      });
    }

    // BOOTSTRAP MODE (default)
    const existing = await base44.entities.CoreDocument.list('-created_date', 200);
    const existingIds = new Set(existing.map(d => d.document_id));

    const toCreate = CORE_DOCUMENTS.filter(d => !existingIds.has(d.document_id));
    const created = [];

    for (const doc of toCreate) {
      try {
        const createdDoc = await base44.entities.CoreDocument.create({
          ...doc,
          version: '1.0.0',
          status: 'active',
          evolution_count: 0,
          validation_score: 1.0,
          last_evolved_at: new Date().toISOString(),
          last_evolved_by: 'bootstrapCoreDocuments'
        });
        created.push(createdDoc);
      } catch (e) {
        console.error(`Failed to create ${doc.document_id}: ${e.message}`);
      }
    }

    // Update dependents arrays for all documents
    const allDocs = [...existing, ...created];
    const docMap = new Map(allDocs.map(d => [d.document_id, d]));

    for (const doc of allDocs) {
      const deps = doc.dependencies || [];
      for (const depId of deps) {
        const depDoc = docMap.get(depId);
        if (depDoc) {
          const currentDependents = depDoc.dependents || [];
          if (!currentDependents.includes(doc.document_id)) {
            try {
              await base44.entities.CoreDocument.update(depDoc.id, {
                dependents: [...currentDependents, doc.document_id]
              });
              depDoc.dependents = [...currentDependents, doc.document_id];
            } catch {}
          }
        }
      }
    }

    return Response.json({
      ok: true,
      mode: 'bootstrap',
      total_defined: CORE_DOCUMENTS.length,
      created: created.length,
      already_existed: existingIds.size,
      document_ids: CORE_DOCUMENTS.map(d => d.document_id),
      categories: [...new Set(CORE_DOCUMENTS.map(d => d.category))],
      critical_count: CORE_DOCUMENTS.filter(d => d.priority === 'critical').length,
      mandatory_count: CORE_DOCUMENTS.filter(d => d.priority === 'mandatory').length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message, timestamp: new Date().toISOString() }, { status: 500 });
  }
}