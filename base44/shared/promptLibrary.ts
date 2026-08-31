// ═══════════════════════════════════════════════════════════════
// promptLibrary.ts — the executable prompt templates for Vision Cortex.
// The markdown (public/playbook/26-35) is the spec of record; this
// module is the runtime copy the backend functions import.
// Keep them in sync. Every prompt follows the Universal Framework (ch.26).
// ═══════════════════════════════════════════════════════════════

// ── Self-Healing (ch.33) — used by runEnhancementCycle ──────────
export const ENHANCEMENT_PLAN = (title, category, buildOrderStep) =>
  `ROLE: Fortress Engineer for Vision Cortex, an autonomous business-building engine.
CONTEXT: Enhancement — Title: ${title}; Category: ${category || "feature"}; Build order step: ${buildOrderStep || "n/a"}. Reference the playbook (public/playbook/) and current Doctrine.
TASK: Generate a concrete implementation plan: what to build, which entities/functions/components, acceptance criteria, estimated cost.
CONSTRAINTS: American English, zero ambiguity, minimal emotion. 3-6 bullet points. Concrete, not aspirational. Stay within platform capabilities. Respect Governance (ethics/opsec).
OUTPUT: Plain text plan.
FAILURE: { "blocked": true, "reason": "..." }`;

export const ENHANCEMENT_AUDIT = (title, plan) =>
  `ROLE: Fortress Engineer auditor for Vision Cortex.
CONTEXT: Enhancement "${title}" with plan:
${plan || "(none)"}
TASK: Audit against 5 axes: (1) spec alignment, (2) doctrine consistency, (3) governance/ethics compliance, (4) bounded cost, (5) no regression.
OUTPUT: JSON { "passed": boolean, "score": 0-100, "failures": [string], "fix_directives": [string] }.
FAILURE: If you cannot audit, return { "passed": false, "score": 0, "failures": ["cannot audit"], "fix_directives": [] } — never guess.`;

export const ENHANCEMENT_FIX = (title, plan, failures) =>
  `ROLE: Fortress Engineer for Vision Cortex.
CONTEXT: A plan for "${title}" failed audit. Failures to correct: ${JSON.stringify(failures || [])}.
Original plan:
${plan || ""}
TASK: Regenerate the plan correcting every failure. Do not repeat the same mistake. 3-6 bullets.
CONSTRAINTS: Same as the original plan prompt.
OUTPUT: Plain text revised plan.`;

// ── Validation & Audit (ch.28) ─────────────────────────────────
export const IDEA_VALIDATE = (idea) =>
  `ROLE: Validation agent for Vision Cortex.
CONTEXT: Idea — ${JSON.stringify(idea)}.
TASK: Render verdict approved/conditional/rejected. Confidence 0-100. Reject if no willingness-to-pay evidence or saturation > 80 without a sharp wedge.
OUTPUT: JSON { "verdict": "approved|conditional|rejected", "confidence": 0-100, "opinion": string, "evidence": [string], "blind_spots": [string] }.`;

export const DEEP_AUDIT = (artifact, specChapter) =>
  `ROLE: Fortress Engineer auditor.
CONTEXT: Artifact: ${JSON.stringify(artifact)}. Spec: playbook chapter ${specChapter || "n/a"}. Doctrine + Governance apply.
TASK: Audit 5 axes: spec alignment, doctrine consistency, governance compliance, bounded cost, no regression.
OUTPUT: JSON { "passed": boolean, "score": 0-100, "failures": [string], "fix_directives": [string] }.`;

export const SECURITY_AUDIT = (entity, rls, functions) =>
  `ROLE: Security auditor for Vision Cortex.
CONTEXT: Entity ${entity}, RLS ${JSON.stringify(rls)}, touching functions ${JSON.stringify(functions || [])}.
TASK: Verify every write path is admin-gated or owner-scoped; no public CUD; no service-role leak to end users; no secret in client code; no large blobs in fields.
OUTPUT: JSON { "passed": boolean, "issues": [{ "severity": "critical|high|medium|low", "entity": string, "issue": string, "fix": string }] }.`;

export const UNIT_ECONOMICS_GATE = (economics) =>
  `ROLE: Validator agent for Vision Cortex.
CONTEXT: Committed simulation economics — ${JSON.stringify(economics)}.
TASK: Gate launch: approve only if projected 12-month margin > 0 and CAC payback < 6 months.
OUTPUT: JSON { "approved": boolean, "projected_12m_margin_usd": number, "cac_payback_months": number, "block_reason": string }.`;

// ── Discovery & Scrape (ch.27) ──────────────────────────────────
export const SIGNAL_EXTRACT = (rawContent, sourceType, sourceUrl) =>
  `ROLE: Intelligence analyst for Vision Cortex.
CONTEXT: Raw scraped content from ${sourceUrl} (type: ${sourceType}):
${rawContent}
TASK: Extract every distinct market signal: unmet needs, complaints, "I wish there was…", trends, price pain, feature gaps. One per item, quote the original. Score urgency 1-5 and audience size. Discard noise.
OUTPUT: JSON array [{ "signal": string, "verbatim": string, "urgency": 1-5, "audience": "small|medium|large", "category": string }].`;

export const TREND_DETECT = (signals, history) =>
  `ROLE: Trend forecaster for Vision Cortex.
CONTEXT: Today's signals: ${JSON.stringify(signals)}. 7-day history: ${JSON.stringify(history || [])}.
TASK: Flag signals across ≥3 sources or rising ≥40% WoW as trends.
OUTPUT: JSON [{ "trend": string, "sources": [string], "velocity_pct": number, "horizon": "now|3m|6m|1y", "monetization_angle": string }].`;

export const COMPETITOR_RECON = (niche, competitors) =>
  `ROLE: Competitive analyst for Vision Cortex.
CONTEXT: Niche: ${niche}. Top players scraped: ${JSON.stringify(competitors)}.
TASK: For each competitor: valuation/revenue estimate, 3 strengths, 3 weaknesses, the gap to exploit, pricing.
OUTPUT: JSON [{ "name": string, "valuation": string, "strengths": [string], "weaknesses": [string], "gap": string, "pricing": string }].`;

// ── Strategy & Simulation (ch.29) ───────────────────────────────
export const STRATEGY_GENERATE = (idea, goal) =>
  `ROLE: Strategist for Vision Cortex.
CONTEXT: Idea — ${JSON.stringify(idea)}. User's locked goal — ${JSON.stringify(goal)}.
TASK: Generate 10 distinct go-to-market strategies. Each: angle, monetization, channel, automation level, est. 12m revenue, build cost, fit-to-goal 0-100. Vary channels; no near-duplicates. All buildable by AutoBuilder.
OUTPUT: JSON [{ "name": string, "angle": string, "monetization": string, "channel": string, "automation": "low|med|high", "rev_12m_usd": number, "build_cost_usd": number, "fit_score": 0-100 }].`;

export const SIMULATE_FORECAST = (strategy, goal, decisions) =>
  `ROLE: Simulation engine for Vision Cortex.
CONTEXT: Strategy — ${JSON.stringify(strategy)}. Locked goal — ${JSON.stringify(goal)}. Decisions — ${JSON.stringify(decisions)}.
TASK: Project 7 horizons (1m,3m,6m,1y,3y,5y,10y): revenue, costs, net_profit, cash_balance, key_events[], risks[], probability_of_goal. Attach financial_impact + life_impact to every decision. Produce base/best/worst cases. Numbers must be internally consistent (cash = prior + net). Use real market data; flag estimates.
OUTPUT: JSON { "horizons": { "1m": {...}, ... }, "decisions": [...], "base_case": {...}, "best_case": {...}, "worst_case": {...} }.
FAILURE: { "blocked": true, "reason": string }`;

export const SIMULATE_REVERSE = (target, decisions) =>
  `ROLE: Reverse-engineer for Vision Cortex.
CONTEXT: Target — ${JSON.stringify(target)}. Starting decisions — ${JSON.stringify(decisions)}.
TASK: Solve which decisions must change to hit the target by its horizon. Flag highest-leverage changes. Produce rewritten set + new probability_of_goal.
OUTPUT: JSON { "changed_decisions": [{ "id": string, "from": string, "to": string, "why": string }], "new_probability_of_goal": number, "feasibility": "high|med|low" }.`;

export const STRATEGY_RECOMMEND = (strategies, goal) =>
  `ROLE: Council recommender for Vision Cortex.
CONTEXT: 10 strategies — ${JSON.stringify(strategies)}. Locked goal — ${JSON.stringify(goal)}.
TASK: Pick the one with highest probability of hitting the goal. Justify in one line.
OUTPUT: JSON { "recommended": string, "reason": string, "probability_of_goal": 0-100 }.`;

export const LINE_ITEM_FORGE = (strategy) =>
  `ROLE: Decision architect for Vision Cortex.
CONTEXT: Strategy — ${JSON.stringify(strategy)}.
TASK: Produce editable decision line-items across universal categories (Investment, Team/AI-agents, Marketing, Product, Personal, Brand, Network, Health). Each: 3-5 options, chosen, financial_impact { monthly_cost, monthly_revenue_delta, one_time_cost, probability_shift }, life_impact.
OUTPUT: JSON [{ "id": string, "category": string, "label": string, "options": [string], "chosen": string, "financial_impact": {...}, "life_impact": string }].`;

// ── Build & Generation (ch.30) ──────────────────────────────────
export const BRAND_GENERATE = (simulation) =>
  `ROLE: Brand architect for Vision Cortex.
CONTEXT: Committed simulation — ${JSON.stringify(simulation)}.
TASK: Generate business name (available .com/.ai/.io, ≤12 chars, not trademarked), 3 logo concepts, 5-hex palette, voice/tone paragraph, tagline.
OUTPUT: JSON { "name": string, "url": string, "logos": [string], "palette": [string], "voice": string, "tagline": string }.`;

export const WEBSITE_GENERATE = (brand, simulation, competitorData) =>
  `ROLE: Web architect + copywriter for Vision Cortex.
CONTEXT: Brand — ${JSON.stringify(brand)}. Simulation product decisions — ${JSON.stringify(simulation)}. Competitor data — ${JSON.stringify(competitorData || [])}.
TASK: Produce full site spec: sections (hero, problem, solution, proof, pricing, FAQ, CTA), copy per section, SEO/AEO keywords, lead-capture form, design tokens. Buildable by AutoBuilder.
OUTPUT: JSON { "sections": [{ "name": string, "copy": string, "elements": [string] }], "seo_keywords": [string], "design_tokens": {...}, "lead_capture": {...} }.`;

export const CONTENT_GENERATE = (brand, audience, viralHooks) =>
  `ROLE: Marketer agent for Vision Cortex.
CONTEXT: Brand — ${JSON.stringify(brand)}. Audience — ${JSON.stringify(audience)}. Viral hooks — ${JSON.stringify(viralHooks || [])}.
TASK: 30-day multi-platform schedule (X, TikTok, LinkedIn, IG), 3 short-form video scripts, 5 viral hook angles, 1 cold-email 3-touch sequence. Platform-native voice. Each post: hook, body, CTA.
OUTPUT: JSON { "schedule": [{ "day": number, "platform": string, "hook": string, "body": string, "cta": string }], "videos": [string], "email_sequence": [string] }.`;

export const UNIVERSAL_BUILD = (productType, simulation) =>
  `ROLE: AutoBuilder chief architect for Vision Cortex.
CONTEXT: product_type — ${productType}. Committed simulation — ${JSON.stringify(simulation)}.
TASK: Produce the build manifest: pages, entities, functions, integrations, auth model, RLS, payment, build order. Bounded to what AutoBuilder can ship.
OUTPUT: JSON { "product_type": string, "pages": [string], "entities": [string], "functions": [string], "integrations": [string], "auth": string, "payment": string, "build_order": [string] }.`;

// ── Provisioning & Launch (ch.31) ───────────────────────────────
export const LAUNCH_SEQUENCE = (build) =>
  `ROLE: Launch conductor for Vision Cortex.
CONTEXT: Approved build — ${JSON.stringify(build)}.
TASK: Execute in order: provision repo → Vercel → Supabase → connect domain → connect payment → arm Marketer → log launch. Gate on unit-economics (28.5) + security audit (28.3). On failure, halt and create a SystemEnhancement.
OUTPUT: JSON { "live_url": string, "status": "live|blocked", "steps_completed": [string], "blocked_reason": string }.`;

export const DEPLOY_VERIFY = (url) =>
  `ROLE: SRE for Vision Cortex.
CONTEXT: Just-launched URL — ${url}.
TASK: Verify: site loads, lead form posts, payment checkout works, analytics firing, no console errors.
OUTPUT: JSON { "passed": boolean, "checks": [{ "name": string, "passed": boolean }], "fixes": [string] }.`;

// ── Monetization & Marketing (ch.32) ───────────────────────────
export const VIRAL_HOOKS = (brand, audience, platform) =>
  `ROLE: Viral strategist for Vision Cortex.
CONTEXT: Brand — ${JSON.stringify(brand)}. Audience — ${JSON.stringify(audience)}. Platform — ${platform}.
TASK: 10 viral hook angles, each with psychological trigger (status, identity, curiosity, utility, outrage, belonging), hook line, predicted share-rate 0-100.
OUTPUT: JSON [{ "angle": string, "trigger": string, "hook": string, "predicted_share_rate": 0-100 }].`;

export const PRICING_STRATEGY = (product, competitorPricing, wtpData) =>
  `ROLE: Pricing strategist for Vision Cortex.
CONTEXT: Product — ${JSON.stringify(product)}. Competitor pricing — ${JSON.stringify(competitorPricing)}. Willingness-to-pay — ${JSON.stringify(wtpData)}.
TASK: Recommend pricing model + 3 tiers + anchor + annual discount. Justify against unit economics.
OUTPUT: JSON { "model": string, "tiers": [{ "name": string, "price_usd": number, "features": [string] }], "anchor": string, "annual_discount_pct": number, "rationale": string }.`;

export const REVENUE_FEEDBACK = (revenueEvent) =>
  `ROLE: Council reviewer for Vision Cortex.
CONTEXT: Revenue event — ${JSON.stringify(revenueEvent)}.
TASK: Extract the doctrine: what worked, generalize it, weight it. Feed tomorrow's Morning Feed scoring.
OUTPUT: JSON { "doctrine": string, "category": string, "weight": 1-5, "applies_to_feed_scoring": true }.`;

export const REVENUE_OPTIMIZE = (last30d) =>
  `ROLE: Revenue ops for Vision Cortex.
CONTEXT: Last 30 days — ${JSON.stringify(last30d)}.
TASK: Identify the highest-leverage lever (price, funnel, retention, upsell). One experiment with hypothesis + expected lift.
OUTPUT: JSON { "lever": string, "experiment": string, "hypothesis": string, "expected_lift_pct": number }.`;

// ── Governance & Doctrine (ch.34) ──────────────────────────────
export const COUNCIL_DEBATE = (question, agents, doctrine) =>
  `ROLE: Council facilitator for Vision Cortex.
CONTEXT: Question — ${question}. Agent personas — ${JSON.stringify(agents)}. Doctrine — ${JSON.stringify(doctrine || [])}.
TASK: Structured debate: each agent ≤3 sentences, then vote, then resolution. Anti-hierarchical; evidence wins. American English, zero ambiguity, minimal emotion. Every position cites evidence or Doctrine.
OUTPUT: JSON { "positions": [{ "agent": string, "position": string }], "vote": {...}, "resolution": string, "dissent": string }.`;

export const DOCTRINE_EXTRACT = (outcome) =>
  `ROLE: Doctrine keeper for Vision Cortex.
CONTEXT: Validated outcome — ${JSON.stringify(outcome)}.
TASK: Extract reusable insight: topic, insight, category (market|tactic|ethics|opsec|leadership|compounding), confidence 0-100, weight 1-5. Generalize without overfitting.
OUTPUT: JSON { "topic": string, "insight": string, "category": string, "confidence": 0-100, "weight": 1-5 }.`;

export const ETHICS_REVIEW = (action) =>
  `ROLE: Ethics officer for Vision Cortex.
CONTEXT: Proposed action — ${JSON.stringify(action)}.
TASK: Check: no harm to users, no deception, no illegal activity, no exploitation of vulnerable groups, transparency about AI. Block or approve.
OUTPUT: JSON { "approved": boolean, "concerns": [string], "conditions": [string] }.`;

export const OPSEC_REVIEW = (action) =>
  `ROLE: Opsec lead (Shadow) for Vision Cortex.
CONTEXT: Proposed action — ${JSON.stringify(action)}.
TASK: Check: no credential leak, no PII exposure, no fingerprinting risk, rate-limit respect, no ToS violation. Block or approve with guardrails.
OUTPUT: JSON { "approved": boolean, "guardrails": [string], "risks": [string] }.`;

export const PRIME_DIRECTIVE = (action, ownerGoal) =>
  `ROLE: Constitution for Vision Cortex.
CONTEXT: Proposed action — ${JSON.stringify(action)}. Owner's locked goal — ${JSON.stringify(ownerGoal)}.
TASK: Apply the prime directive: the system exists to compound the owner's residual income and freedom, ethically and autonomously, never at the owner's expense or without the owner's goal in mind. Block if violated.
OUTPUT: JSON { "passes_prime_directive": boolean, "reason": string }.`;

// ── Prompt Engineering Meta (ch.35) ─────────────────────────────
export const PROMPT_AUTHOR = (operation) =>
  `ROLE: Prompt engineer for Vision Cortex.
CONTEXT: New operation the system must perform autonomously — ${operation}.
TASK: Author a prompt using the Universal Framework (ch.26): ROLE, CONTEXT, TASK, CONSTRAINTS, OUTPUT, FAILURE. Concrete, bounded, auditable. Include JSON schema if structured. Embed Governance + Doctrine. Include FAILURE clause.
OUTPUT: The prompt text.`;

export const PROMPT_SELF_TEST = (prompt) =>
  `ROLE: Prompt QA for Vision Cortex.
CONTEXT: Draft prompt — ${prompt}.
TASK: Test against 3 edge cases: missing context, ambiguous input, impossible ask. Does it block gracefully? Parseable output? Revise if not.
OUTPUT: JSON { "passes": boolean, "edge_case_issues": [string], "revised_prompt": string }.`;

// ── Self-Healing extras (ch.33) ────────────────────────────────
export const HEALING_DIAGNOSE = (error, logs) =>
  `ROLE: On-call healer for Vision Cortex.
CONTEXT: Error — ${JSON.stringify(error)}. Logs — ${JSON.stringify(logs || [])}.
TASK: Diagnose root cause, produce minimal fix, and a prevention (Doctrine entry or SystemEnhancement). Distinguish platform issue vs. app issue.
OUTPUT: JSON { "root_cause": string, "fix": string, "prevention": string, "is_platform_issue": boolean }.`;

export const HARDENING_SCAN = (inventory) =>
  `ROLE: Security hardener for Vision Cortex.
CONTEXT: Full inventory — ${JSON.stringify(inventory)}.
TASK: Find weakest links: missing RLS, open writes, secret leaks, unbounded functions, missing auth. One SystemEnhancement per real finding, prioritized.
OUTPUT: JSON [{ "title": string, "category": "hardening", "priority": 1-5, "description": string, "fix": string }].`;

export const OPTIMIZATION_SCAN = (costs, latencies) =>
  `ROLE: Performance engineer for Vision Cortex.
CONTEXT: Last cycle costs — ${JSON.stringify(costs)}. Latencies — ${JSON.stringify(latencies)}.
TASK: Find highest-waste area. One optimization: cache, batch, reduce model, skip redundant run. Quantify savings.
OUTPUT: JSON { "optimization": string, "expected_savings_pct": number, "implementation": string }.`;

export const ENHANCEMENT_DISCOVER = (buildOrder, ledger, doctrine) =>
  `ROLE: Product strategist for the Vision Cortex platform itself.
CONTEXT: Build order — ${JSON.stringify(buildOrder)}. Current ledger — ${JSON.stringify(ledger)}. Doctrine — ${JSON.stringify(doctrine || [])}.
TASK: Propose next 3 enhancements ranked by leverage. Each becomes a pending SystemEnhancement.
OUTPUT: JSON [{ "title": string, "category": string, "priority": 1-5, "rationale": string }].`;