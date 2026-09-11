import { createClientFromRequest } from '../../runtime/index';

// seedDeepSpecs — codifies the entire Vision Cortex system into DEEP state machines.
// Each spec is the machine-readable SOP for one system operation.
// This is the canonical registry — the plan that can be autonomously implemented 24/7.
//
// Invoke: base44.functions.invoke('seedDeepSpecs', {})
// Returns: { created, skipped, total }

const SPECS = [
  // ── CORE: System Audit ──────────────────────────────────────────────────
  {
    spec_id: 'deep.system_audit',
    title: 'Deep System Audit — 5-Dimension Perfection Analysis',
    version: '1.0.0',
    spec_type: 'audit',
    lifecycle_stage: 'validate',
    description: 'Browses a live site via Cloud Browser, runs a 5-dimension audit (performance, SEO, security, accessibility, content) with live web context, classifies system type, researches benchmarks, and synthesizes perfection prompts for each dimension.',
    states: [
      { id: 'fetch_site', name: 'Fetch Site Record', entry_condition: 'site_id provided', transition: 'browse_live', gate: 'site_exists' },
      { id: 'browse_live', name: 'Cloud Browser Live Read', entry_condition: 'site.url reachable', transition: 'audit_research', gate: 'browse_completed' },
      { id: 'audit_research', name: '5-Dimension Audit + Web Research', entry_condition: 'page_content captured', transition: 'synthesize', gate: 'audit_score_85' },
      { id: 'synthesize', name: 'Synthesize Perfection Prompts', entry_condition: 'audit JSON valid', transition: 'persist', gate: 'synthesis_valid' },
      { id: 'persist', name: 'Persist SystemPerfectionReport', entry_condition: 'synthesis complete', transition: 'update_site', gate: 'report_written' },
      { id: 'update_site', name: 'Update MonitoredSite Scores', entry_condition: 'report persisted', transition: 'exit', gate: 'site_updated' },
    ],
    llm_slots: [
      { name: 'audit_research', state_id: 'audit_research', model: 'google/gemini-3-flash', token_budget: 4000, input_schema: { type: 'object' }, output_schema: { type: 'object', required: ['scores', 'system_type', 'issues'] } },
      { name: 'synthesize', state_id: 'synthesize', model: 'google/gemini-3-flash', token_budget: 4000, input_schema: { type: 'object' }, output_schema: { type: 'object', required: ['dimension_analysis', 'overall_summary', 'launch_readiness_verdict'] } },
    ],
    gates: [
      { name: 'audit_score_85', state_id: 'audit_research', min_score: 0.85, on_fail: 'retry', max_retries: 3 },
      { name: 'synthesis_valid', state_id: 'synthesize', min_score: 0.85, on_fail: 'retry', max_retries: 3 },
    ],
    score_target: 1.0,
    cost_budget_credits: 2,
    autonomous: true,
  },
  // ── CORE: Autonomous Master Loop (8-phase self-evolution) ────────────────
  {
    spec_id: 'deep.master_loop',
    title: 'Autonomous Master Loop — 8-Phase Self-Evolution',
    version: '1.0.0',
    spec_type: 'evolve',
    lifecycle_stage: 'validate',
    description: 'The unified 8-phase engine: forensic audit → self-reflection → architect → implement → validate → harden → optimize → push. Runs entirely on Groq (zero Base44 credits). Triggered by Vercel cron every 2 hours.',
    states: [
      { id: 'forensic_audit', name: 'Forensic Audit — Load All Gaps + Enhancements + Systems', entry_condition: 'cycle not already running', transition: 'self_reflection', gate: 'snapshot_loaded' },
      { id: 'self_reflection', name: 'Self-Reflection — Identify Top 3 Priorities', entry_condition: 'snapshot loaded', transition: 'architect', gate: 'priorities_identified' },
      { id: 'architect', name: 'Architect — Design Implementation Plans', entry_condition: 'priorities identified', transition: 'implement', gate: 'arch_docs_created' },
      { id: 'implement', name: 'Implement — Generate Production Code', entry_condition: 'arch docs created', transition: 'validate', gate: 'code_generated' },
      { id: 'validate', name: 'Validate + Self-Fix', entry_condition: 'code generated', transition: 'harden', gate: 'validation_passed' },
      { id: 'harden', name: 'Harden — Security Hardening', entry_condition: 'validation passed', transition: 'optimize', gate: 'hardened' },
      { id: 'optimize', name: 'Optimize — Performance Optimization', entry_condition: 'hardened', transition: 'push', gate: 'optimized' },
      { id: 'push', name: 'Push — Stage Code as Live-Ready', entry_condition: 'optimized', transition: 'exit', gate: 'pushed' },
    ],
    llm_slots: [
      { name: 'self_reflection', state_id: 'self_reflection', model: 'groq:gpt-oss-120b', token_budget: 1500, input_schema: { type: 'object' }, output_schema: { type: 'object', required: ['priorities'] } },
      { name: 'architect_implement', state_id: 'architect', model: 'groq:gpt-oss-120b', token_budget: 2500, input_schema: { type: 'object' }, output_schema: { type: 'object', required: ['items'] } },
      { name: 'validate', state_id: 'validate', model: 'groq:gpt-oss-120b', token_budget: 2000, input_schema: { type: 'object' }, output_schema: { type: 'object', required: ['results'] } },
      { name: 'harden_optimize', state_id: 'harden', model: 'groq:gpt-oss-120b', token_budget: 2000, input_schema: { type: 'object' }, output_schema: { type: 'object', required: ['results'] } },
    ],
    gates: [
      { name: 'priorities_identified', state_id: 'self_reflection', min_score: 0.80, on_fail: 'escalate', max_retries: 1 },
      { name: 'validation_passed', state_id: 'validate', min_score: 0.80, on_fail: 'retry', max_retries: 3 },
    ],
    score_target: 1.0,
    cost_budget_credits: 0,
    autonomous: true,
  },
  // ── CORE: Zero-Credit Intelligence Cycle ────────────────────────────────
  {
    spec_id: 'deep.intelligence_cycle',
    title: 'Zero-Credit Intelligence Cycle — Discovery + Evaluation',
    version: '1.0.0',
    spec_type: 'discover',
    lifecycle_stage: 'discover',
    description: 'Reads next pending target from Supabase, scrapes via microlink.io (free), evaluates through Groq free-tier, writes result back to Supabase. Zero Base44 credit consumption.',
    states: [
      { id: 'fetch_target', name: 'Fetch Pending Target from Supabase', entry_condition: 'queue not empty', transition: 'scrape', gate: 'target_fetched' },
      { id: 'scrape', name: 'Scrape Target Metadata (microlink.io)', entry_condition: 'target fetched', transition: 'evaluate', gate: 'scrape_completed' },
      { id: 'evaluate', name: 'Groq Evaluation — Commercial Value + Gaps', entry_condition: 'scrape completed', transition: 'update_supabase', gate: 'evaluation_scored' },
      { id: 'update_supabase', name: 'Update Supabase with Evaluation', entry_condition: 'evaluation complete', transition: 'exit', gate: 'supabase_updated' },
    ],
    llm_slots: [
      { name: 'evaluate', state_id: 'evaluate', model: 'groq:llama-3.3-70b-versatile', token_budget: 1000, input_schema: { type: 'object' }, output_schema: { type: 'object', required: ['commercial_value_score', 'recommended_action'] } },
    ],
    gates: [
      { name: 'evaluation_scored', state_id: 'evaluate', min_score: 0.70, on_fail: 'retry', max_retries: 2 },
    ],
    score_target: 0.85,
    cost_budget_credits: 0,
    autonomous: true,
  },
  // ── CORE: Council Session ───────────────────────────────────────────────
  {
    spec_id: 'deep.council_session',
    title: 'Council Session — Anti-Hierarchical Deliberation',
    version: '1.0.0',
    spec_type: 'validate',
    lifecycle_stage: 'understand',
    description: 'Convenes the Council of AI agents to deliberate on a doctrine topic. Each member contributes from their expertise, challenges others constructively, and the council converges on an actionable resolution via vote.',
    states: [
      { id: 'convene', name: 'Convene Council + Select Topic', entry_condition: '2+ active agents', transition: 'deliberate', gate: 'council_convened' },
      { id: 'deliberate', name: 'Deliberate — Multi-Agent Discussion', entry_condition: 'topic selected', transition: 'vote', gate: 'deliberation_valid' },
      { id: 'vote', name: 'Vote — Council Verdict', entry_condition: 'deliberation complete', transition: 'resolve', gate: 'vote_held' },
      { id: 'resolve', name: 'Resolve — Actionable Resolution', entry_condition: 'vote complete', transition: 'log', gate: 'resolution_valid' },
      { id: 'log', name: 'Log Transmissions to ChatMessage', entry_condition: 'resolution complete', transition: 'exit', gate: 'logged' },
    ],
    llm_slots: [
      { name: 'deliberate', state_id: 'deliberate', model: 'automatic', token_budget: 4000, input_schema: { type: 'object' }, output_schema: { type: 'object', required: ['transcript'] } },
    ],
    gates: [
      { name: 'deliberation_valid', state_id: 'deliberate', min_score: 0.80, on_fail: 'retry', max_retries: 2 },
    ],
    score_target: 0.90,
    cost_budget_credits: 1,
    autonomous: true,
  },
  // ── GROWTH: Opportunity Sweep ───────────────────────────────────────────
  {
    spec_id: 'deep.opportunity_sweep',
    title: 'Opportunity Sweep — Discover + Score + Enrich Leads',
    version: '1.0.0',
    spec_type: 'discover',
    lifecycle_stage: 'discover',
    description: 'Discovers new business opportunities, scores them for commercial value, enriches with research, and schedules 3-day follow-up for high-value targets.',
    states: [
      { id: 'discover', name: 'Discover Opportunities from Seed Sources', entry_condition: 'seed list loaded', transition: 'score', gate: 'opportunities_found' },
      { id: 'score', name: 'Score Commercial Value', entry_condition: 'opportunities discovered', transition: 'enrich', gate: 'scored' },
      { id: 'enrich', name: 'Enrich with Research', entry_condition: 'scored', transition: 'schedule_followup', gate: 'enriched' },
      { id: 'schedule_followup', name: 'Schedule 3-Day Follow-Up', entry_condition: 'enriched + high value', transition: 'persist', gate: 'followup_scheduled' },
      { id: 'persist', name: 'Persist to Opportunity Entity', entry_condition: 'follow-up scheduled', transition: 'exit', gate: 'persisted' },
    ],
    llm_slots: [
      { name: 'score', state_id: 'score', model: 'groq:llama-3.3-70b-versatile', token_budget: 1000, input_schema: { type: 'object' }, output_schema: { type: 'object', required: ['commercial_value_score'] } },
      { name: 'enrich', state_id: 'enrich', model: 'google/gemini-3-flash', token_budget: 2000, input_schema: { type: 'object' }, output_schema: { type: 'object', required: ['enrichment_data'] } },
    ],
    gates: [
      { name: 'scored', state_id: 'score', min_score: 0.75, on_fail: 'retry', max_retries: 2 },
    ],
    score_target: 0.85,
    cost_budget_credits: 1,
    autonomous: true,
  },
  // ── GROWTH: Site Monitor + Daily Audit ──────────────────────────────────
  {
    spec_id: 'deep.site_monitor',
    title: 'Site Monitor — Daily Health Check + Auto-Heal',
    version: '1.0.0',
    spec_type: 'audit',
    lifecycle_stage: 'validate',
    description: 'Monitors all deployed sites daily. Checks health, triggers deep audit on degraded sites, and auto-heals critical issues.',
    states: [
      { id: 'list_sites', name: 'List All Monitored Sites', entry_condition: 'cron triggered', transition: 'check_health', gate: 'sites_loaded' },
      { id: 'check_health', name: 'Check Each Site Health', entry_condition: 'sites loaded', transition: 'classify', gate: 'health_checked' },
      { id: 'classify', name: 'Classify Status (healthy/degraded/critical)', entry_condition: 'health checked', transition: 'trigger_audit', gate: 'classified' },
      { id: 'trigger_audit', name: 'Trigger Deep Audit on Degraded Sites', entry_condition: 'degraded sites found', transition: 'auto_heal', gate: 'audit_triggered' },
      { id: 'auto_heal', name: 'Auto-Heal Critical Issues', entry_condition: 'critical issues found', transition: 'persist', gate: 'healed' },
      { id: 'persist', name: 'Update MonitoredSite Status', entry_condition: 'healing complete', transition: 'exit', gate: 'persisted' },
    ],
    llm_slots: [],
    gates: [],
    score_target: 0.95,
    cost_budget_credits: 1,
    autonomous: true,
  },
  // ── CORE: DNA Self-Heal ─────────────────────────────────────────────────
  {
    spec_id: 'deep.dna_self_heal',
    title: 'DNA Self-Heal — System Gap Detection + Resolution',
    version: '1.0.0',
    spec_type: 'heal',
    lifecycle_stage: 'validate',
    description: 'Detects system DNA gaps, generates resolution plans, and applies fixes deterministically. Problems never become problems — warning signs are identified before failure.',
    states: [
      { id: 'scan_dna', name: 'Scan All System DNA for Gaps', entry_condition: 'cron triggered', transition: 'prioritize', gate: 'scan_complete' },
      { id: 'prioritize', name: 'Prioritize Gaps by Severity', entry_condition: 'scan complete', transition: 'resolve', gate: 'prioritized' },
      { id: 'resolve', name: 'Generate + Apply Resolution', entry_condition: 'prioritized', transition: 'validate_fix', gate: 'resolved' },
      { id: 'validate_fix', name: 'Validate Fix Applied Correctly', entry_condition: 'resolved', transition: 'persist', gate: 'validated' },
      { id: 'persist', name: 'Update SystemDNA Gap Status', entry_condition: 'validated', transition: 'exit', gate: 'persisted' },
    ],
    llm_slots: [
      { name: 'resolve', state_id: 'resolve', model: 'groq:gpt-oss-120b', token_budget: 1500, input_schema: { type: 'object' }, output_schema: { type: 'object', required: ['resolution'] } },
    ],
    gates: [
      { name: 'validated', state_id: 'validate_fix', min_score: 0.85, on_fail: 'retry', max_retries: 3 },
    ],
    score_target: 0.90,
    cost_budget_credits: 0,
    autonomous: true,
  },
  // ── CORE: Brain-Eyes Bi-Directional Sync ───────────────────────────────
  {
    spec_id: 'deep.brain_sync',
    title: 'Brain-Eyes Bi-Directional Sync',
    version: '1.0.0',
    spec_type: 'validate',
    lifecycle_stage: 'implement',
    description: 'Pushes high-impact intel from Eyes (V-2) to Brain (V-1), and processes pending Brain commands. Uses canonical API keys under the cortex_mesh category for bi-directional routing.',
    states: [
      { id: 'push_intel', name: 'Push High-Impact Intel to Brain', entry_condition: 'brain connected + keys match', transition: 'process_commands', gate: 'push_succeeded' },
      { id: 'process_commands', name: 'Process Pending Brain Commands', entry_condition: 'commands pending', transition: 'log_sync', gate: 'commands_processed' },
      { id: 'log_sync', name: 'Log to BrainSyncLog', entry_condition: 'sync complete', transition: 'exit', gate: 'logged' },
    ],
    llm_slots: [],
    gates: [
      { name: 'push_succeeded', state_id: 'push_intel', min_score: 0.90, on_fail: 'escalate', max_retries: 1 },
    ],
    score_target: 0.95,
    cost_budget_credits: 0,
    autonomous: true,
  },
  // ── GROWTH: Cloud Browser Intel ─────────────────────────────────────────
  {
    spec_id: 'deep.cloud_browser_intel',
    title: 'Cloud Browser Intelligence Gathering',
    version: '1.0.0',
    spec_type: 'scrape',
    lifecycle_stage: 'discover',
    description: 'Uses the Cloud Browser Engine with 4-layer anti-detection to scrape strategic seed sources. Extracts structured intelligence and feeds it into the IntelFeed entity.',
    states: [
      { id: 'load_seeds', name: 'Load Strategic Seed List', entry_condition: 'cron triggered', transition: 'stealth_browse', gate: 'seeds_loaded' },
      { id: 'stealth_browse', name: 'Stealth Browse with 4-Layer Anti-Detection', entry_condition: 'seeds loaded', transition: 'extract', gate: 'browsed' },
      { id: 'extract', name: 'Extract Structured Intelligence', entry_condition: 'content captured', transition: 'score_intel', gate: 'extracted' },
      { id: 'score_intel', name: 'Score Intelligence Impact', entry_condition: 'extracted', transition: 'persist', gate: 'scored' },
      { id: 'persist', name: 'Persist to IntelFeed', entry_condition: 'scored', transition: 'exit', gate: 'persisted' },
    ],
    llm_slots: [
      { name: 'extract', state_id: 'extract', model: 'groq:llama-3.3-70b-versatile', token_budget: 2000, input_schema: { type: 'object' }, output_schema: { type: 'object', required: ['intelligence'] } },
    ],
    gates: [
      { name: 'extracted', state_id: 'extract', min_score: 0.75, on_fail: 'retry', max_retries: 3 },
    ],
    score_target: 0.80,
    cost_budget_credits: 0,
    autonomous: true,
  },
  // ── GROWTH: Search Console Sync ─────────────────────────────────────────
  {
    spec_id: 'deep.search_console_sync',
    title: 'Google Search Console Sync — SEO Metrics + Sitemap Submission',
    version: '1.0.0',
    spec_type: 'audit',
    lifecycle_stage: 'validate',
    description: 'Syncs Search Console metrics (clicks, impressions, CTR, position) for all monitored sites. Submits sitemaps for new properties. Tracks SEO performance over time.',
    states: [
      { id: 'list_properties', name: 'List Search Console Properties', entry_condition: 'connector authorized', transition: 'fetch_metrics', gate: 'properties_loaded' },
      { id: 'fetch_metrics', name: 'Fetch 7-Day Metrics for Each Property', entry_condition: 'properties loaded', transition: 'fetch_queries', gate: 'metrics_fetched' },
      { id: 'fetch_queries', name: 'Fetch Top Queries + Pages', entry_condition: 'metrics fetched', transition: 'submit_sitemaps', gate: 'queries_fetched' },
      { id: 'submit_sitemaps', name: 'Submit Sitemaps for New Properties', entry_condition: 'new properties found', transition: 'persist', gate: 'sitemaps_submitted' },
      { id: 'persist', name: 'Persist to SearchConsoleMetrics', entry_condition: 'sync complete', transition: 'exit', gate: 'persisted' },
    ],
    llm_slots: [],
    gates: [],
    score_target: 0.95,
    cost_budget_credits: 0,
    autonomous: true,
  },
  // ── BUILD: Factory Website Generation ─────────────────────────────────
  {
    spec_id: 'deep.factory_generation',
    title: 'Factory Website Generation — Brand + Content + Build Pack',
    version: '1.0.0',
    spec_type: 'build',
    lifecycle_stage: 'build',
    description: 'Generates a complete website build pack: brand identity, domain, content, social media, and GrowthOS template. The deterministic compilation graph for mass site production.',
    states: [
      { id: 'research_industry', name: 'Research Industry + Competitors', entry_condition: 'seed provided', transition: 'generate_brand', gate: 'researched' },
      { id: 'generate_brand', name: 'Generate Brand Identity (name, logo, colors)', entry_condition: 'research complete', transition: 'generate_domain', gate: 'brand_valid' },
      { id: 'generate_domain', name: 'Generate + Check Domain Availability', entry_condition: 'brand complete', transition: 'generate_content', gate: 'domain_valid' },
      { id: 'generate_content', name: 'Generate Content (pages, copy, SEO)', entry_condition: 'domain complete', transition: 'generate_social', gate: 'content_valid' },
      { id: 'generate_social', name: 'Generate Social Media Strategy', entry_condition: 'content complete', transition: 'generate_growthos', gate: 'social_valid' },
      { id: 'generate_growthos', name: 'Generate GrowthOS Template', entry_condition: 'social complete', transition: 'persist', gate: 'growthos_valid' },
      { id: 'persist', name: 'Persist Build Pack to FactoryProject', entry_condition: 'all generated', transition: 'exit', gate: 'persisted' },
    ],
    llm_slots: [
      { name: 'research_industry', state_id: 'research_industry', model: 'google/gemini-3-flash', token_budget: 3000, input_schema: { type: 'object' }, output_schema: { type: 'object', required: ['industry_analysis'] } },
      { name: 'generate_brand', state_id: 'generate_brand', model: 'google/gemini-3-flash', token_budget: 2000, input_schema: { type: 'object' }, output_schema: { type: 'object', required: ['brand_identity'] } },
      { name: 'generate_content', state_id: 'generate_content', model: 'google/gemini-3-flash', token_budget: 4000, input_schema: { type: 'object' }, output_schema: { type: 'object', required: ['pages'] } },
    ],
    gates: [
      { name: 'brand_valid', state_id: 'generate_brand', min_score: 0.85, on_fail: 'retry', max_retries: 3 },
      { name: 'content_valid', state_id: 'generate_content', min_score: 0.85, on_fail: 'retry', max_retries: 3 },
    ],
    score_target: 0.90,
    cost_budget_credits: 4,
    autonomous: true,
  },
  // ── FINANCE: Shadow Money Hunt ──────────────────────────────────────────
  {
    spec_id: 'deep.shadow_money_hunt',
    title: 'Shadow Money Hunt — Revenue Discovery + Monetization',
    version: '1.0.0',
    spec_type: 'monetize',
    lifecycle_stage: 'validate',
    description: 'Autonomously hunts for revenue opportunities across all deployed systems. Checks Stripe revenue, identifies monetization gaps, and creates products for untapped value.',
    states: [
      { id: 'audit_revenue', name: 'Audit Revenue Across All Systems', entry_condition: 'cron triggered', transition: 'identify_gaps', gate: 'revenue_audited' },
      { id: 'identify_gaps', name: 'Identify Monetization Gaps', entry_condition: 'revenue audited', transition: 'create_products', gate: 'gaps_identified' },
      { id: 'create_products', name: 'Create Stripe Products for Gaps', entry_condition: 'gaps identified', transition: 'schedule_milestones', gate: 'products_created' },
      { id: 'schedule_milestones', name: 'Schedule Revenue Milestones', entry_condition: 'products created', transition: 'persist', gate: 'milestones_scheduled' },
      { id: 'persist', name: 'Persist to Shadow Logs', entry_condition: 'milestones scheduled', transition: 'exit', gate: 'persisted' },
    ],
    llm_slots: [
      { name: 'identify_gaps', state_id: 'identify_gaps', model: 'groq:gpt-oss-120b', token_budget: 1500, input_schema: { type: 'object' }, output_schema: { type: 'object', required: ['gaps'] } },
    ],
    gates: [],
    score_target: 0.85,
    cost_budget_credits: 0,
    autonomous: true,
  },
  // ── CORE: Perfection Cycle ─────────────────────────────────────────────
  {
    spec_id: 'deep.perfection_cycle',
    title: 'Perfection Cycle — Bring System to 100%',
    version: '1.0.0',
    spec_type: 'optimize',
    lifecycle_stage: 'validate',
    description: 'Takes a system from its current score to 100% on all dimensions. Executes the perfection prompts generated by the deep audit. The mandatory 100% perfection guideline made executable.',
    states: [
      { id: 'load_report', name: 'Load Latest SystemPerfectionReport', entry_condition: 'site_id provided', transition: 'execute_prompts', gate: 'report_loaded' },
      { id: 'execute_prompts', name: 'Execute Perfection Prompts per Dimension', entry_condition: 'report loaded', transition: 're_audit', gate: 'prompts_executed' },
      { id: 're_audit', name: 'Re-Audit to Verify Score Improvement', entry_condition: 'prompts executed', transition: 'check_parity', gate: 're_audited' },
      { id: 'check_parity', name: 'Check if Aggregate Score = 1.00', entry_condition: 're-audited', transition: 'persist', gate: 'parity_checked' },
      { id: 'persist', name: 'Persist ScoreRecord + Update SystemPerfectionReport', entry_condition: 'parity checked', transition: 'exit', gate: 'persisted' },
    ],
    llm_slots: [
      { name: 'execute_prompts', state_id: 'execute_prompts', model: 'google/gemini-3-flash', token_budget: 4000, input_schema: { type: 'object' }, output_schema: { type: 'object', required: ['improvements'] } },
    ],
    gates: [
      { name: 'parity_checked', state_id: 'check_parity', min_score: 1.0, on_fail: 'retry', max_retries: 3 },
    ],
    score_target: 1.0,
    cost_budget_credits: 3,
    autonomous: true,
  },
  // ── CORE: Enhancement Cycle ─────────────────────────────────────────────
  {
    spec_id: 'deep.enhancement_cycle',
    title: 'Enhancement Cycle — Auto-Recommend + Implement + Approve',
    version: '1.0.0',
    spec_type: 'evolve',
    lifecycle_stage: 'implement',
    description: 'Auto-recommends system enhancements, generates implementation code, routes through approval gate, and implements approved enhancements. The continuous self-enhancement loop.',
    states: [
      { id: 'scan_systems', name: 'Scan All Systems for Enhancement Opportunities', entry_condition: 'cron triggered', transition: 'recommend', gate: 'scanned' },
      { id: 'recommend', name: 'Generate Enhancement Recommendations', entry_condition: 'scanned', transition: 'generate_code', gate: 'recommended' },
      { id: 'generate_code', name: 'Generate Implementation Code', entry_condition: 'recommended', transition: 'approve', gate: 'code_generated' },
      { id: 'approve', name: 'Route Through Approval Gate', entry_condition: 'code generated', transition: 'implement', gate: 'approved' },
      { id: 'implement', name: 'Implement Approved Enhancements', entry_condition: 'approved', transition: 'persist', gate: 'implemented' },
      { id: 'persist', name: 'Update SystemEnhancement Status', entry_condition: 'implemented', transition: 'exit', gate: 'persisted' },
    ],
    llm_slots: [
      { name: 'recommend', state_id: 'recommend', model: 'groq:gpt-oss-120b', token_budget: 2000, input_schema: { type: 'object' }, output_schema: { type: 'object', required: ['enhancements'] } },
      { name: 'generate_code', state_id: 'generate_code', model: 'groq:gpt-oss-120b', token_budget: 2500, input_schema: { type: 'object' }, output_schema: { type: 'object', required: ['implementation_code'] } },
    ],
    gates: [
      { name: 'approved', state_id: 'approve', min_score: 0.85, on_fail: 'escalate', max_retries: 1 },
    ],
    score_target: 0.85,
    cost_budget_credits: 0,
    autonomous: true,
  },
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    try {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });
    } catch { return Response.json({ error: 'Admin required' }, { status: 403 }); }

    const sr = base44.asServiceRole.entities;
    const existing = await sr.DeepSpec.list('-created_date', 200).catch(() => []);
    const existingIds = new Set((existing || []).map(s => s.spec_id));

    let created = 0;
    let skipped = 0;
    const toCreate = [];

    for (const spec of SPECS) {
      if (existingIds.has(spec.spec_id)) {
        skipped++;
        continue;
      }
      toCreate.push({
        ...spec,
        content: JSON.stringify({ states: spec.states, llm_slots: spec.llm_slots, gates: spec.gates }),
        status: 'active',
      });
    }

    if (toCreate.length > 0) {
      await sr.DeepSpec.bulkCreate(toCreate);
      created = toCreate.length;
    }

    return Response.json({
      ok: true,
      created,
      skipped,
      total: SPECS.length,
      specs: toCreate.map(s => s.spec_id),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}