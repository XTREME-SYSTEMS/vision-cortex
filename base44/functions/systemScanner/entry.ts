import { createClientFromRequest, secrets } from '../../runtime/index';

// System Scanner — scans the entire Vision Cortex system and produces a
// comprehensive report of every entity, agent, task, function, and page.
// Identifies gaps: unassigned tasks, missing agents, broken workflows.

// Known entities in the system (for record counting)
const KNOWN_ENTITIES = [
  'AgentProfile', 'AgentSchedule', 'SystemTaskRegistry', 'TimeClockEntry',
  'CapabilityToggle', 'VaultEntry', 'VaultAuditLog', 'ApiKey', 'EmailAccount',
  'McpServer', 'CoreDocument', 'DocumentEvolution', 'DeepSpec', 'DeepRun',
  'MasterPlan', 'ArchitecturalDocument', 'AutonomousCycle', 'MonitoredSite',
  'BrainSyncLog', 'BrainCommand', 'SitemapIngestion', 'SystemGap',
  'ScoreRecord', 'KnowledgeQuest', 'AgentPayment', 'CryptoWallet',
  'ConnectedAccount', 'ProjectFolder', 'SearchConsoleMetrics', 'MasterBlueprint',
  'SystemPerfectionReport', 'SystemDNA_System', 'SystemDNA_SystemRule',
  'SiteAuditLog', 'CapabilityMatrix', 'SystemEnhancement', 'AgentAward',
  'AgentScore', 'SystemDNA_Requirement', 'SystemDNA_Action', 'SystemDNA_Gap',
  'SystemDNA_Capability', 'BuildQueue', 'Opportunity', 'Gap', 'FactoryProject',
  'VisionPipeline', 'ChatMessage', 'PersonaProfile', 'LifePlan', 'Doctrine',
  'IntelFeed', 'Simulation', 'UserProfile', 'Governance', 'Idea', 'AgentLog',
  'Trade', 'Portfolio', 'Notification'
];

// Known backend functions (for coverage check)
const KNOWN_FUNCTIONS = [
  'DeepDiscoveryScan', 'agentDebate', 'aiAssist', 'aiGatewayGenerate', 'appManagementSync',
  'auditDestinyEngine', 'auditExternalSite', 'autoEnhanceAll', 'autoRecommend',
  'autoRecommendAllSystems', 'autonomousHeartbeat', 'autonomousMasterLoop',
  'bootstrapArchitecture', 'bootstrapCoreDocuments', 'calculateInfinityReward',
  'calculateScore', 'calendarRoadmap', 'cloudBrowserHealth', 'cloudBrowserIntel',
  'companyOrchestrator', 'councilBlueprint', 'councilCompound', 'councilPredict',
  'councilSession', 'councilSiteAudit', 'dailySiteAudit', 'deepSystemAudit',
  'detectLifeDrift', 'dispatchToBuilder', 'dnaGapEngine', 'dnaScoreSystem',
  'dnaSelfHeal', 'dnaTraceability', 'enhancementApprover', 'evolveDocument',
  'executeMasterPlan', 'factoryBrandGenerator', 'factoryBrandPack',
  'factoryContentGenerator', 'factoryDomainGenerator', 'factoryGrowthOSGenerator',
  'factoryResearchIndustry', 'factorySeedGenerator', 'factorySocialAI',
  'factoryWebsiteGenerator', 'financialAdvisor', 'forensicAudit',
  'freeIntelligenceGatherer', 'gapRecommender', 'generateApiKey', 'generateBuildPack',
  'generateDailyBrief', 'generateStrategies', 'healDestinyEngine',
  'implementEnhancement', 'ingestIntel', 'intelligenceGatherer', 'launchPipelineBuild',
  'lifeChoiceGenerator', 'lockLifePlan', 'manageApiKeys', 'manageCapabilities',
  'manageMcpServers', 'masterAutonomousCycle', 'masterLoopOrchestrator',
  'masterSystemAnalysis', 'metasystemWatchdog', 'monthlyAwardCeremony',
  'nightlyPipelinePrep', 'onboardApp', 'onboardingQuest', 'opportunityFollowUp',
  'opportunityResearch', 'opportunityRespond', 'opportunitySweep', 'ownerDigest',
  'personalOnboarding', 'pipelineOrchestrator', 'primusOrchestrate',
  'processBrainCommands', 'provisionSupabase', 'provisionVercel',
  'railwayProvisioner', 'receiveBrainCommand', 'reguShield', 'runDestinyCycle',
  'runEnhancementCycle', 'runIntelligenceCycle', 'runMarketer',
  'runPerfectionCycle', 'scoreIdeaToProfile', 'searchConsoleSync', 'seedDeepSpecs',
  'shadowBrowse', 'shadowBuildStrategy', 'shadowClone', 'shadowCreateStripeProducts',
  'shadowForcefield', 'shadowMoneyHunt', 'shadowPerformanceLog',
  'shadowRevenueCheck', 'shadowSaveToDrive', 'shadowScheduleMilestones',
  'shadowSentiment', 'simulateLife', 'simulateOutcomes', 'simulateStrategy',
  'simulateTopic', 'simulateUserJourney', 'stealthBrowse', 'syncFromEyes',
  'syncLifePlanToCalendar', 'syncProjectBrain', 'syncToBrain', 'systemAnalyst',
  'systemSync', 'testBrainConnection', 'trackReality', 'universalAgentChat',
  'vaultSecurity', 'visionPipelineOrchestrator', 'visionSweep', 'wealthSweep',
  'xtremeMasterBlueprint', 'xtremePerfectionStrategy', 'zeroFailurePipeline',
  'systemScanner', 'timeclockManager'
];

// Known pages (for coverage check)
const KNOWN_PAGES = [
  { path: '/', name: 'Dashboard' },
  { path: '/agents', name: 'Agents' },
  { path: '/chat', name: 'WarRoom' },
  { path: '/ops', name: 'Ops' },
  { path: '/intel', name: 'Intel' },
  { path: '/council', name: 'Council' },
  { path: '/shadow', name: 'Shadow' },
  { path: '/paper', name: 'PaperTrade' },
  { path: '/queue', name: 'Queue' },
  { path: '/live', name: 'LiveChat' },
  { path: '/playbook', name: 'Playbook' },
  { path: '/codebase', name: 'Codebase' },
  { path: '/build', name: 'Build' },
  { path: '/onboarding', name: 'Onboarding' },
  { path: '/simulation', name: 'Simulation' },
  { path: '/approvals', name: 'BuildApprovals' },
  { path: '/marketer', name: 'Marketer' },
  { path: '/audit', name: 'Audit' },
  { path: '/destiny', name: 'DestinyFlow' },
  { path: '/lifelab', name: 'LifeLab' },
  { path: '/usersim', name: 'UserSimulator' },
  { path: '/gaps', name: 'Gaps' },
  { path: '/forensic', name: 'ForensicAudit' },
  { path: '/system-analyst', name: 'SystemAnalyst' },
  { path: '/factory', name: 'Factory' },
  { path: '/autonomous', name: 'AutonomousBuilder' },
  { path: '/capabilities', name: 'Capabilities' },
  { path: '/dna', name: 'DNA' },
  { path: '/dna-audit', name: 'DnaAudit' },
  { path: '/performance', name: 'Performance' },
  { path: '/dna-actions', name: 'DnaActions' },
  { path: '/rewards', name: 'Rewards' },
  { path: '/site-monitor', name: 'SiteMonitor' },
  { path: '/xtreme-ai', name: 'XtremeAI' },
  { path: '/xtreme-factory', name: 'XtremeFactory' },
  { path: '/xtreme-perfection', name: 'XtremePerfection' },
  { path: '/intelligence', name: 'IntelligenceSeeker' },
  { path: '/management', name: 'AppManagement' },
  { path: '/command', name: 'CommandCenter' },
  { path: '/vault', name: 'Vault' },
  { path: '/vision', name: 'Vision' },
  { path: '/clone-factory', name: 'CloneFactory' },
  { path: '/zero-credit', name: 'ZeroCreditEngine' },
  { path: '/autonomous-loop', name: 'AutonomousLoop' },
  { path: '/blueprint', name: 'Blueprint' },
  { path: '/company', name: 'Company' },
  { path: '/registry', name: 'SystemRegistry' }
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
    const mode = body.mode || 'full';
    const sr = base44.asServiceRole.entities;

    // ─── SEED REGISTRY ─────────────────────────────────────────────────
    if (mode === 'seed') {
      // Check if already seeded
      const existing = await sr.SystemTaskRegistry.list('-created_date', 1);
      if (existing.length > 0) {
        return Response.json({
          ok: true,
          mode: 'seed',
          message: 'Registry already seeded. Delete existing records to re-seed.',
          total_seeded: 0
        });
      }

      const TASK_DEFINITIONS = [
        // ── AUDIT ──────────────────────────────────────────────
        { task_type: 'forensic_audit', name: 'Forensic System Audit', category: 'audit', assigned_agent: 'The Inquisitor', source_page: 'ForensicAudit', source_function: 'forensicAudit', trigger_type: 'scheduled', estimated_duration_minutes: 45, payment_amount: 50, priority: 'critical' },
        { task_type: 'deep_system_audit', name: 'Deep System Audit', category: 'audit', assigned_agent: 'The Inquisitor', source_page: 'SystemAnalyst', source_function: 'deepSystemAudit', trigger_type: 'scheduled', estimated_duration_minutes: 60, payment_amount: 60, priority: 'critical' },
        { task_type: 'site_audit', name: 'External Site Audit', category: 'audit', assigned_agent: 'The Inspector', source_page: 'Audit', source_function: 'auditExternalSite', trigger_type: 'scheduled', estimated_duration_minutes: 30, payment_amount: 30, priority: 'high' },
        { task_type: 'daily_site_audit', name: 'Daily Site Audit Cycle', category: 'audit', assigned_agent: 'The Inspector', source_page: 'SiteMonitor', source_function: 'dailySiteAudit', trigger_type: 'scheduled', trigger_schedule: 'daily', estimated_duration_minutes: 20, payment_amount: 20, priority: 'high' },
        { task_type: 'council_site_audit', name: 'Council Site Audit', category: 'audit', assigned_agent: 'The Arbiter', source_page: 'Council', source_function: 'councilSiteAudit', trigger_type: 'manual', estimated_duration_minutes: 40, payment_amount: 40, priority: 'medium' },
        { task_type: 'dna_audit', name: 'System DNA Audit', category: 'audit', assigned_agent: 'The Inquisitor', source_page: 'DnaAudit', source_function: 'dnaScoreSystem', trigger_type: 'scheduled', estimated_duration_minutes: 35, payment_amount: 35, priority: 'high' },
        { task_type: 'destiny_audit', name: 'Destiny Engine Audit', category: 'audit', assigned_agent: 'The Validator', source_page: 'DestinyFlow', source_function: 'auditDestinyEngine', trigger_type: 'scheduled', estimated_duration_minutes: 25, payment_amount: 25, priority: 'medium' },
        { task_type: 'master_system_analysis', name: 'Master System Analysis', category: 'audit', assigned_agent: 'The Oracle', source_page: 'SystemAnalyst', source_function: 'masterSystemAnalysis', trigger_type: 'scheduled', estimated_duration_minutes: 90, payment_amount: 80, priority: 'critical' },

        // ── FIX / HEAL ─────────────────────────────────────────
        { task_type: 'self_heal', name: 'DNA Self-Healing', category: 'fix', assigned_agent: 'The Healer', source_page: 'Ops', source_function: 'dnaSelfHeal', trigger_type: 'event_driven', estimated_duration_minutes: 30, payment_amount: 40, priority: 'critical' },
        { task_type: 'destiny_heal', name: 'Destiny Engine Healing', category: 'fix', assigned_agent: 'The Healer', source_page: 'DestinyFlow', source_function: 'healDestinyEngine', trigger_type: 'manual', estimated_duration_minutes: 20, payment_amount: 25, priority: 'high' },
        { task_type: 'regu_shield', name: 'Regulatory Shield Check', category: 'fix', assigned_agent: 'The Sentinel', source_page: 'Ops', source_function: 'reguShield', trigger_type: 'scheduled', estimated_duration_minutes: 15, payment_amount: 15, priority: 'high' },
        { task_type: 'shadow_forcefield', name: 'Shadow Forcefield', category: 'fix', assigned_agent: 'Shadow', source_page: 'Shadow', source_function: 'shadowForcefield', trigger_type: 'scheduled', estimated_duration_minutes: 20, payment_amount: 25, priority: 'high' },

        // ── HARDEN ──────────────────────────────────────────────
        { task_type: 'vault_security', name: 'Vault Security Audit', category: 'harden', assigned_agent: 'The Sentinel', source_page: 'Vault', source_function: 'vaultSecurity', trigger_type: 'scheduled', estimated_duration_minutes: 25, payment_amount: 30, priority: 'critical' },
        { task_type: 'capability_review', name: 'Capability Toggle Review', category: 'harden', assigned_agent: 'The Architect', source_page: 'Capabilities', source_function: 'manageCapabilities', trigger_type: 'manual', estimated_duration_minutes: 15, payment_amount: 15, priority: 'medium' },

        // ── INTELLIGENCE ────────────────────────────────────────
        { task_type: 'intelligence_gather', name: 'Intelligence Gathering', category: 'intelligence', assigned_agent: 'The Oracle', source_page: 'IntelligenceSeeker', source_function: 'intelligenceGatherer', trigger_type: 'scheduled', estimated_duration_minutes: 40, payment_amount: 45, priority: 'high' },
        { task_type: 'free_intelligence', name: 'Free Intelligence Sweep', category: 'intelligence', assigned_agent: 'The Oracle', source_page: 'Intel', source_function: 'freeIntelligenceGatherer', trigger_type: 'scheduled', trigger_schedule: 'daily', estimated_duration_minutes: 30, payment_amount: 30, priority: 'medium' },
        { task_type: 'deep_discovery', name: 'Deep Discovery Scan', category: 'intelligence', assigned_agent: 'The Seeker', source_page: 'Intel', source_function: 'DeepDiscoveryScan', trigger_type: 'scheduled', estimated_duration_minutes: 50, payment_amount: 50, priority: 'high' },
        { task_type: 'intel_ingest', name: 'Intel Feed Ingestion', category: 'intelligence', assigned_agent: 'The Seeker', source_page: 'Intel', source_function: 'ingestIntel', trigger_type: 'event_driven', estimated_duration_minutes: 15, payment_amount: 15, priority: 'medium' },
        { task_type: 'stealth_browse', name: 'Stealth Browse & Scrape', category: 'intelligence', assigned_agent: 'Shadow', source_page: 'Intel', source_function: 'stealthBrowse', trigger_type: 'manual', estimated_duration_minutes: 25, payment_amount: 25, priority: 'medium' },
        { task_type: 'shadow_browse', name: 'Shadow Browse', category: 'intelligence', assigned_agent: 'Shadow', source_page: 'Shadow', source_function: 'shadowBrowse', trigger_type: 'manual', estimated_duration_minutes: 20, payment_amount: 20, priority: 'medium' },
        { task_type: 'cloud_browser_intel', name: 'Cloud Browser Intelligence', category: 'intelligence', assigned_agent: 'The Seeker', source_page: 'Intel', source_function: 'cloudBrowserIntel', trigger_type: 'manual', estimated_duration_minutes: 30, payment_amount: 30, priority: 'medium' },
        { task_type: 'vision_sweep', name: 'Vision Sweep', category: 'intelligence', assigned_agent: 'Vision', source_page: 'Vision', source_function: 'visionSweep', trigger_type: 'scheduled', trigger_schedule: 'daily', estimated_duration_minutes: 20, payment_amount: 20, priority: 'medium' },

        // ── RESEARCH ─────────────────────────────────────────────
        { task_type: 'opportunity_sweep', name: 'Opportunity Sweep', category: 'research', assigned_agent: 'The Seeker', source_page: 'Dashboard', source_function: 'opportunitySweep', trigger_type: 'scheduled', trigger_schedule: 'daily', estimated_duration_minutes: 30, payment_amount: 30, priority: 'high' },
        { task_type: 'opportunity_research', name: 'Opportunity Research', category: 'research', assigned_agent: 'The Oracle', source_page: 'Dashboard', source_function: 'opportunityResearch', trigger_type: 'event_driven', estimated_duration_minutes: 25, payment_amount: 25, priority: 'medium' },
        { task_type: 'opportunity_followup', name: 'Opportunity Follow-Up', category: 'outreach', assigned_agent: 'The Diplomat', source_page: 'Dashboard', source_function: 'opportunityFollowUp', trigger_type: 'scheduled', estimated_duration_minutes: 15, payment_amount: 15, priority: 'medium' },
        { task_type: 'opportunity_respond', name: 'Opportunity Response', category: 'outreach', assigned_agent: 'The Diplomat', source_page: 'Dashboard', source_function: 'opportunityRespond', trigger_type: 'event_driven', estimated_duration_minutes: 20, payment_amount: 20, priority: 'medium' },
        { task_type: 'gap_recommender', name: 'Gap Analysis & Recommendations', category: 'research', assigned_agent: 'The Analyst', source_page: 'Gaps', source_function: 'gapRecommender', trigger_type: 'scheduled', estimated_duration_minutes: 25, payment_amount: 25, priority: 'medium' },
        { task_type: 'factory_research_industry', name: 'Factory Industry Research', category: 'research', assigned_agent: 'The Analyst', source_page: 'Factory', source_function: 'factoryResearchIndustry', trigger_type: 'manual', estimated_duration_minutes: 35, payment_amount: 35, priority: 'medium' },

        // ── STRATEGY ─────────────────────────────────────────────
        { task_type: 'council_session', name: 'Council Deliberation Session', category: 'strategy', assigned_agent: 'The Arbiter', source_page: 'Council', source_function: 'councilSession', trigger_type: 'manual', estimated_duration_minutes: 90, payment_amount: 100, priority: 'high' },
        { task_type: 'council_blueprint', name: 'Council Blueprint Strategy', category: 'strategy', assigned_agent: 'The Architect', source_page: 'Council', source_function: 'councilBlueprint', trigger_type: 'manual', estimated_duration_minutes: 60, payment_amount: 60, priority: 'high' },
        { task_type: 'council_predict', name: 'Council Prediction', category: 'strategy', assigned_agent: 'The Oracle', source_page: 'Council', source_function: 'councilPredict', trigger_type: 'manual', estimated_duration_minutes: 40, payment_amount: 40, priority: 'medium' },
        { task_type: 'agent_debate', name: 'Agent Debate Session', category: 'strategy', assigned_agent: 'The Arbiter', source_page: 'WarRoom', source_function: 'agentDebate', trigger_type: 'manual', estimated_duration_minutes: 60, payment_amount: 50, priority: 'medium' },
        { task_type: 'master_plan_execution', name: 'Master Plan Execution', category: 'strategy', assigned_agent: 'The Architect', source_page: 'Vision', source_function: 'executeMasterPlan', trigger_type: 'scheduled', estimated_duration_minutes: 45, payment_amount: 50, priority: 'critical' },
        { task_type: 'xtreme_master_blueprint', name: 'Xtreme Master Blueprint', category: 'strategy', assigned_agent: 'The Architect', source_page: 'XtremeAI', source_function: 'xtremeMasterBlueprint', trigger_type: 'scheduled', estimated_duration_minutes: 60, payment_amount: 60, priority: 'high' },
        { task_type: 'shadow_build_strategy', name: 'Shadow Build Strategy', category: 'strategy', assigned_agent: 'Shadow', source_page: 'Shadow', source_function: 'shadowBuildStrategy', trigger_type: 'manual', estimated_duration_minutes: 35, payment_amount: 35, priority: 'medium' },
        { task_type: 'generate_strategies', name: 'Strategy Generation', category: 'strategy', assigned_agent: 'The Oracle', source_page: 'DestinyFlow', source_function: 'generateStrategies', trigger_type: 'manual', estimated_duration_minutes: 30, payment_amount: 30, priority: 'medium' },

        // ── BUILD / DEPLOY ──────────────────────────────────────
        { task_type: 'factory_seed_gen', name: 'Factory Seed Generation', category: 'build', assigned_agent: 'The Builder', source_page: 'Factory', source_function: 'factorySeedGenerator', trigger_type: 'manual', estimated_duration_minutes: 30, payment_amount: 35, priority: 'high' },
        { task_type: 'factory_website_gen', name: 'Factory Website Generation', category: 'build', assigned_agent: 'The Builder', source_page: 'Factory', source_function: 'factoryWebsiteGenerator', trigger_type: 'manual', estimated_duration_minutes: 45, payment_amount: 50, priority: 'high' },
        { task_type: 'factory_brand_gen', name: 'Factory Brand Generation', category: 'build', assigned_agent: 'The Designer', source_page: 'Factory', source_function: 'factoryBrandGenerator', trigger_type: 'manual', estimated_duration_minutes: 25, payment_amount: 30, priority: 'medium' },
        { task_type: 'factory_brand_pack', name: 'Factory Brand Pack', category: 'build', assigned_agent: 'The Designer', source_page: 'Factory', source_function: 'factoryBrandPack', trigger_type: 'manual', estimated_duration_minutes: 20, payment_amount: 25, priority: 'medium' },
        { task_type: 'factory_content_gen', name: 'Factory Content Generation', category: 'build', assigned_agent: 'The Scribe', source_page: 'Factory', source_function: 'factoryContentGenerator', trigger_type: 'manual', estimated_duration_minutes: 30, payment_amount: 30, priority: 'medium' },
        { task_type: 'factory_social_ai', name: 'Factory Social AI', category: 'build', assigned_agent: 'The Scribe', source_page: 'Factory', source_function: 'factorySocialAI', trigger_type: 'manual', estimated_duration_minutes: 25, payment_amount: 25, priority: 'medium' },
        { task_type: 'factory_domain_gen', name: 'Factory Domain Generation', category: 'build', assigned_agent: 'The Builder', source_page: 'Factory', source_function: 'factoryDomainGenerator', trigger_type: 'manual', estimated_duration_minutes: 10, payment_amount: 10, priority: 'low' },
        { task_type: 'factory_growth_os', name: 'Factory Growth OS', category: 'build', assigned_agent: 'The Architect', source_page: 'Factory', source_function: 'factoryGrowthOSGenerator', trigger_type: 'manual', estimated_duration_minutes: 40, payment_amount: 45, priority: 'high' },
        { task_type: 'build_pack_gen', name: 'Build Pack Generation', category: 'build', assigned_agent: 'The Builder', source_page: 'Build', source_function: 'generateBuildPack', trigger_type: 'manual', estimated_duration_minutes: 35, payment_amount: 40, priority: 'high' },
        { task_type: 'pipeline_build', name: 'Pipeline Build Launch', category: 'deployment', assigned_agent: 'The Builder', source_page: 'Build', source_function: 'launchPipelineBuild', trigger_type: 'manual', estimated_duration_minutes: 50, payment_amount: 55, priority: 'high' },
        { task_type: 'provision_vercel', name: 'Vercel Provisioning', category: 'deployment', assigned_agent: 'The Builder', source_page: 'Build', source_function: 'provisionVercel', trigger_type: 'event_driven', estimated_duration_minutes: 10, payment_amount: 15, priority: 'medium' },
        { task_type: 'provision_supabase', name: 'Supabase Provisioning', category: 'deployment', assigned_agent: 'The Builder', source_page: 'Build', source_function: 'provisionSupabase', trigger_type: 'event_driven', estimated_duration_minutes: 10, payment_amount: 15, priority: 'medium' },
        { task_type: 'railway_provision', name: 'Railway Provisioning', category: 'deployment', assigned_agent: 'The Builder', source_page: 'Build', source_function: 'railwayProvisioner', trigger_type: 'event_driven', estimated_duration_minutes: 10, payment_amount: 15, priority: 'medium' },
        { task_type: 'dispatch_to_builder', name: 'Dispatch to Builder', category: 'build', assigned_agent: 'The Builder', source_page: 'Build', source_function: 'dispatchToBuilder', trigger_type: 'event_driven', estimated_duration_minutes: 15, payment_amount: 15, priority: 'medium' },
        { task_type: 'shadow_clone', name: 'Shadow Clone Operation', category: 'build', assigned_agent: 'Shadow', source_page: 'CloneFactory', source_function: 'shadowClone', trigger_type: 'manual', estimated_duration_minutes: 40, payment_amount: 45, priority: 'high' },

        // ── OPTIMIZE / ENHANCE ───────────────────────────────────
        { task_type: 'auto_enhance', name: 'Auto-Enhance All Systems', category: 'optimize', assigned_agent: 'The Optimizer', source_page: 'AutonomousBuilder', source_function: 'autoEnhanceAll', trigger_type: 'scheduled', estimated_duration_minutes: 45, payment_amount: 50, priority: 'high' },
        { task_type: 'run_enhancement_cycle', name: 'Enhancement Cycle', category: 'optimize', assigned_agent: 'The Optimizer', source_page: 'AutonomousBuilder', source_function: 'runEnhancementCycle', trigger_type: 'scheduled', estimated_duration_minutes: 30, payment_amount: 35, priority: 'medium' },
        { task_type: 'auto_recommend', name: 'Auto-Recommend', category: 'optimize', assigned_agent: 'The Analyst', source_page: 'Gaps', source_function: 'autoRecommend', trigger_type: 'scheduled', estimated_duration_minutes: 20, payment_amount: 20, priority: 'medium' },
        { task_type: 'auto_recommend_all', name: 'Auto-Recommend All Systems', category: 'optimize', assigned_agent: 'The Analyst', source_page: 'Gaps', source_function: 'autoRecommendAllSystems', trigger_type: 'scheduled', estimated_duration_minutes: 35, payment_amount: 35, priority: 'medium' },
        { task_type: 'enhancement_approver', name: 'Enhancement Approval', category: 'governance', assigned_agent: 'The Arbiter', source_page: 'BuildApprovals', source_function: 'enhancementApprover', trigger_type: 'event_driven', estimated_duration_minutes: 15, payment_amount: 15, priority: 'high' },
        { task_type: 'implement_enhancement', name: 'Implement Enhancement', category: 'build', assigned_agent: 'The Builder', source_page: 'AutonomousBuilder', source_function: 'implementEnhancement', trigger_type: 'event_driven', estimated_duration_minutes: 25, payment_amount: 30, priority: 'medium' },
        { task_type: 'xtreme_perfection', name: 'Xtreme Perfection Strategy', category: 'optimize', assigned_agent: 'The Perfectionist', source_page: 'XtremePerfection', source_function: 'xtremePerfectionStrategy', trigger_type: 'scheduled', estimated_duration_minutes: 50, payment_amount: 55, priority: 'critical' },
        { task_type: 'run_perfection_cycle', name: 'Perfection Cycle Execution', category: 'optimize', assigned_agent: 'The Perfectionist', source_page: 'XtremePerfection', source_function: 'runPerfectionCycle', trigger_type: 'scheduled', estimated_duration_minutes: 40, payment_amount: 45, priority: 'high' },

        // ── EVOLUTION / DOCUMENTATION ───────────────────────────
        { task_type: 'evolve_document', name: 'Document Evolution Cascade', category: 'evolution', assigned_agent: 'The Codex Keeper', source_page: 'Blueprint', source_function: 'evolveDocument', trigger_type: 'event_driven', estimated_duration_minutes: 30, payment_amount: 35, priority: 'high' },
        { task_type: 'bootstrap_core_docs', name: 'Bootstrap Core Documents', category: 'documentation', assigned_agent: 'The Codex Keeper', source_page: 'Blueprint', source_function: 'bootstrapCoreDocuments', trigger_type: 'manual', estimated_duration_minutes: 40, payment_amount: 40, priority: 'critical' },
        { task_type: 'bootstrap_architecture', name: 'Bootstrap Architecture', category: 'documentation', assigned_agent: 'The Architect', source_page: 'Blueprint', source_function: 'bootstrapArchitecture', trigger_type: 'manual', estimated_duration_minutes: 35, payment_amount: 35, priority: 'high' },
        { task_type: 'seed_deep_specs', name: 'Seed DEEP Specs', category: 'documentation', assigned_agent: 'The Architect', source_page: 'Blueprint', source_function: 'seedDeepSpecs', trigger_type: 'manual', estimated_duration_minutes: 25, payment_amount: 25, priority: 'medium' },

        // ── MONITORING ───────────────────────────────────────────
        { task_type: 'master_loop', name: 'Master Loop Orchestration', category: 'monitoring', assigned_agent: 'Prime', source_page: 'AutonomousLoop', source_function: 'masterLoopOrchestrator', trigger_type: 'autonomous', trigger_schedule: '60s', estimated_duration_minutes: 5, payment_amount: 10, priority: 'critical' },
        { task_type: 'autonomous_master_loop', name: 'Autonomous Master Loop', category: 'monitoring', assigned_agent: 'Prime', source_page: 'AutonomousLoop', source_function: 'autonomousMasterLoop', trigger_type: 'autonomous', trigger_schedule: '60s', estimated_duration_minutes: 5, payment_amount: 10, priority: 'critical' },
        { task_type: 'autonomous_heartbeat', name: 'Autonomous Heartbeat', category: 'monitoring', assigned_agent: 'Prime', source_page: 'AutonomousLoop', source_function: 'autonomousHeartbeat', trigger_type: 'scheduled', trigger_schedule: '60s', estimated_duration_minutes: 2, payment_amount: 5, priority: 'critical' },
        { task_type: 'metasystem_watchdog', name: 'Metasystem Watchdog', category: 'monitoring', assigned_agent: 'The Sentinel', source_page: 'AutonomousLoop', source_function: 'metasystemWatchdog', trigger_type: 'scheduled', trigger_schedule: '5m', estimated_duration_minutes: 10, payment_amount: 15, priority: 'critical' },
        { task_type: 'zero_failure_pipeline', name: 'Zero-Failure Pipeline', category: 'monitoring', assigned_agent: 'The Validator', source_page: 'AutonomousLoop', source_function: 'zeroFailurePipeline', trigger_type: 'event_driven', estimated_duration_minutes: 20, payment_amount: 25, priority: 'critical' },
        { task_type: 'cloud_browser_health', name: 'Cloud Browser Health Check', category: 'monitoring', assigned_agent: 'The Sentinel', source_page: 'SiteMonitor', source_function: 'cloudBrowserHealth', trigger_type: 'scheduled', trigger_schedule: '5m', estimated_duration_minutes: 5, payment_amount: 5, priority: 'medium' },
        { task_type: 'system_sync', name: 'System Sync', category: 'monitoring', assigned_agent: 'Prime', source_page: 'CommandCenter', source_function: 'systemSync', trigger_type: 'scheduled', estimated_duration_minutes: 10, payment_amount: 10, priority: 'medium' },
        { task_type: 'app_management_sync', name: 'App Management Sync', category: 'monitoring', assigned_agent: 'Prime', source_page: 'AppManagement', source_function: 'appManagementSync', trigger_type: 'scheduled', estimated_duration_minutes: 15, payment_amount: 15, priority: 'medium' },
        { task_type: 'track_reality', name: 'Track Reality', category: 'monitoring', assigned_agent: 'The Validator', source_page: 'DestinyFlow', source_function: 'trackReality', trigger_type: 'scheduled', estimated_duration_minutes: 10, payment_amount: 10, priority: 'low' },

        // ── COMMS ────────────────────────────────────────────────
        { task_type: 'universal_agent_chat', name: 'Universal Agent Chat', category: 'comms', assigned_agent: 'Prime', source_page: 'WarRoom', source_function: 'universalAgentChat', trigger_type: 'event_driven', estimated_duration_minutes: 5, payment_amount: 5, priority: 'medium' },
        { task_type: 'primus_orchestrate', name: 'Primus Orchestration', category: 'comms', assigned_agent: 'Prime', source_page: 'CommandCenter', source_function: 'primusOrchestrate', trigger_type: 'event_driven', estimated_duration_minutes: 10, payment_amount: 10, priority: 'high' },
        { task_type: 'owner_digest', name: 'Owner Digest', category: 'comms', assigned_agent: 'Prime', source_page: 'CommandCenter', source_function: 'ownerDigest', trigger_type: 'scheduled', trigger_schedule: 'daily', estimated_duration_minutes: 15, payment_amount: 15, priority: 'medium' },
        { task_type: 'daily_brief', name: 'Daily Brief Generation', category: 'comms', assigned_agent: 'Prime', source_page: 'CommandCenter', source_function: 'generateDailyBrief', trigger_type: 'scheduled', trigger_schedule: 'daily', estimated_duration_minutes: 15, payment_amount: 15, priority: 'medium' },
        { task_type: 'company_orchestrate', name: 'Company Orchestration', category: 'comms', assigned_agent: 'Prime', source_page: 'Company', source_function: 'companyOrchestrator', trigger_type: 'autonomous', estimated_duration_minutes: 10, payment_amount: 15, priority: 'critical' },

        // ── FINANCIAL ─────────────────────────────────────────────
        { task_type: 'shadow_money_hunt', name: 'Shadow Money Hunt', category: 'financial', assigned_agent: 'Shadow', source_page: 'Shadow', source_function: 'shadowMoneyHunt', trigger_type: 'scheduled', estimated_duration_minutes: 30, payment_amount: 40, priority: 'high' },
        { task_type: 'shadow_revenue_check', name: 'Shadow Revenue Check', category: 'financial', assigned_agent: 'The Treasurer', source_page: 'Shadow', source_function: 'shadowRevenueCheck', trigger_type: 'scheduled', estimated_duration_minutes: 15, payment_amount: 15, priority: 'medium' },
        { task_type: 'shadow_stripe_products', name: 'Shadow Stripe Products', category: 'financial', assigned_agent: 'The Treasurer', source_page: 'Shadow', source_function: 'shadowCreateStripeProducts', trigger_type: 'manual', estimated_duration_minutes: 20, payment_amount: 25, priority: 'medium' },
        { task_type: 'wealth_sweep', name: 'Wealth Sweep', category: 'financial', assigned_agent: 'The Treasurer', source_page: 'PaperTrade', source_function: 'wealthSweep', trigger_type: 'scheduled', estimated_duration_minutes: 20, payment_amount: 20, priority: 'medium' },
        { task_type: 'financial_advisor', name: 'Financial Advisor', category: 'financial', assigned_agent: 'The Treasurer', source_page: 'PaperTrade', source_function: 'financialAdvisor', trigger_type: 'manual', estimated_duration_minutes: 25, payment_amount: 25, priority: 'medium' },
        { task_type: 'calculate_inf_reward', name: 'Calculate INF Rewards', category: 'financial', assigned_agent: 'The Treasurer', source_page: 'Rewards', source_function: 'calculateInfinityReward', trigger_type: 'event_driven', estimated_duration_minutes: 10, payment_amount: 10, priority: 'medium' },
        { task_type: 'monthly_awards', name: 'Monthly Award Ceremony', category: 'financial', assigned_agent: 'The Arbiter', source_page: 'Rewards', source_function: 'monthlyAwardCeremony', trigger_type: 'scheduled', trigger_schedule: 'monthly', estimated_duration_minutes: 30, payment_amount: 50, priority: 'medium' },

        // ── SIMULATION ───────────────────────────────────────────
        { task_type: 'simulate_life', name: 'Life Simulation', category: 'simulation', assigned_agent: 'The Oracle', source_page: 'Simulation', source_function: 'simulateLife', trigger_type: 'manual', estimated_duration_minutes: 30, payment_amount: 25, priority: 'low' },
        { task_type: 'simulate_outcomes', name: 'Outcome Simulation', category: 'simulation', assigned_agent: 'The Oracle', source_page: 'Simulation', source_function: 'simulateOutcomes', trigger_type: 'manual', estimated_duration_minutes: 20, payment_amount: 20, priority: 'low' },
        { task_type: 'simulate_strategy', name: 'Strategy Simulation', category: 'simulation', assigned_agent: 'The Oracle', source_page: 'Simulation', source_function: 'simulateStrategy', trigger_type: 'manual', estimated_duration_minutes: 20, payment_amount: 20, priority: 'low' },
        { task_type: 'simulate_topic', name: 'Topic Simulation', category: 'simulation', assigned_agent: 'The Oracle', source_page: 'Simulation', source_function: 'simulateTopic', trigger_type: 'manual', estimated_duration_minutes: 15, payment_amount: 15, priority: 'low' },
        { task_type: 'simulate_user_journey', name: 'User Journey Simulation', category: 'simulation', assigned_agent: 'The Oracle', source_page: 'UserSimulator', source_function: 'simulateUserJourney', trigger_type: 'manual', estimated_duration_minutes: 25, payment_amount: 25, priority: 'low' },

        // ── OUTREACH / MARKETING ─────────────────────────────────
        { task_type: 'run_marketer', name: 'Marketer Campaign', category: 'outreach', assigned_agent: 'The Diplomat', source_page: 'Marketer', source_function: 'runMarketer', trigger_type: 'scheduled', estimated_duration_minutes: 30, payment_amount: 35, priority: 'medium' },
        { task_type: 'shadow_sentiment', name: 'Shadow Sentiment Analysis', category: 'research', assigned_agent: 'The Analyst', source_page: 'Shadow', source_function: 'shadowSentiment', trigger_type: 'scheduled', estimated_duration_minutes: 15, payment_amount: 15, priority: 'low' },
        { task_type: 'shadow_milestones', name: 'Shadow Schedule Milestones', category: 'comms', assigned_agent: 'The Diplomat', source_page: 'Shadow', source_function: 'shadowScheduleMilestones', trigger_type: 'scheduled', estimated_duration_minutes: 15, payment_amount: 15, priority: 'low' },
        { task_type: 'shadow_save_drive', name: 'Shadow Save to Drive', category: 'documentation', assigned_agent: 'The Scribe', source_page: 'Shadow', source_function: 'shadowSaveToDrive', trigger_type: 'event_driven', estimated_duration_minutes: 10, payment_amount: 10, priority: 'low' },
        { task_type: 'shadow_performance_log', name: 'Shadow Performance Log', category: 'monitoring', assigned_agent: 'The Analyst', source_page: 'Shadow', source_function: 'shadowPerformanceLog', trigger_type: 'scheduled', estimated_duration_minutes: 10, payment_amount: 10, priority: 'low' },

        // ── PIPELINE / VISION ────────────────────────────────────
        { task_type: 'vision_pipeline', name: 'Vision Pipeline Orchestration', category: 'build', assigned_agent: 'The Architect', source_page: 'Vision', source_function: 'visionPipelineOrchestrator', trigger_type: 'scheduled', estimated_duration_minutes: 40, payment_amount: 45, priority: 'high' },
        { task_type: 'nightly_pipeline_prep', name: 'Nightly Pipeline Prep', category: 'build', assigned_agent: 'The Builder', source_page: 'Build', source_function: 'nightlyPipelinePrep', trigger_type: 'scheduled', trigger_schedule: 'daily', estimated_duration_minutes: 20, payment_amount: 20, priority: 'medium' },
        { task_type: 'pipeline_orchestrator', name: 'Pipeline Orchestration', category: 'build', assigned_agent: 'The Builder', source_page: 'Build', source_function: 'pipelineOrchestrator', trigger_type: 'event_driven', estimated_duration_minutes: 30, payment_amount: 30, priority: 'medium' },
        { task_type: 'master_autonomous_cycle', name: 'Master Autonomous Cycle', category: 'monitoring', assigned_agent: 'Prime', source_page: 'AutonomousLoop', source_function: 'masterAutonomousCycle', trigger_type: 'scheduled', estimated_duration_minutes: 45, payment_amount: 50, priority: 'critical' },

        // ── ONBOARDING / LIFE ─────────────────────────────────────
        { task_type: 'personal_onboarding', name: 'Personal Onboarding', category: 'other', assigned_agent: 'The Guide', source_page: 'Onboarding', source_function: 'personalOnboarding', trigger_type: 'manual', estimated_duration_minutes: 30, payment_amount: 25, priority: 'medium' },
        { task_type: 'onboarding_quest', name: 'Onboarding Quest', category: 'other', assigned_agent: 'The Guide', source_page: 'Onboarding', source_function: 'onboardingQuest', trigger_type: 'manual', estimated_duration_minutes: 20, payment_amount: 20, priority: 'low' },
        { task_type: 'life_choice_gen', name: 'Life Choice Generation', category: 'simulation', assigned_agent: 'The Oracle', source_page: 'DestinyFlow', source_function: 'lifeChoiceGenerator', trigger_type: 'manual', estimated_duration_minutes: 20, payment_amount: 20, priority: 'low' },
        { task_type: 'lock_life_plan', name: 'Lock Life Plan', category: 'governance', assigned_agent: 'The Arbiter', source_page: 'DestinyFlow', source_function: 'lockLifePlan', trigger_type: 'manual', estimated_duration_minutes: 10, payment_amount: 10, priority: 'low' },
        { task_type: 'run_destiny_cycle', name: 'Destiny Cycle', category: 'other', assigned_agent: 'The Guide', source_page: 'DestinyFlow', source_function: 'runDestinyCycle', trigger_type: 'scheduled', estimated_duration_minutes: 25, payment_amount: 25, priority: 'medium' },
        { task_type: 'detect_life_drift', name: 'Detect Life Drift', category: 'monitoring', assigned_agent: 'The Sentinel', source_page: 'LifeLab', source_function: 'detectLifeDrift', trigger_type: 'scheduled', estimated_duration_minutes: 15, payment_amount: 15, priority: 'medium' },
        { task_type: 'calendar_roadmap', name: 'Calendar Roadmap', category: 'comms', assigned_agent: 'The Guide', source_page: 'DestinyFlow', source_function: 'calendarRoadmap', trigger_type: 'manual', estimated_duration_minutes: 15, payment_amount: 15, priority: 'low' },
        { task_type: 'sync_life_calendar', name: 'Sync Life Plan to Calendar', category: 'comms', assigned_agent: 'The Guide', source_page: 'DestinyFlow', source_function: 'syncLifePlanToCalendar', trigger_type: 'manual', estimated_duration_minutes: 10, payment_amount: 10, priority: 'low' },

        // ── BRAIN SYNC ───────────────────────────────────────────
        { task_type: 'sync_to_brain', name: 'Sync to Brain', category: 'comms', assigned_agent: 'Prime', source_page: 'Vision', source_function: 'syncToBrain', trigger_type: 'scheduled', estimated_duration_minutes: 10, payment_amount: 10, priority: 'medium' },
        { task_type: 'sync_from_eyes', name: 'Sync from Eyes', category: 'comms', assigned_agent: 'Prime', source_page: 'Vision', source_function: 'syncFromEyes', trigger_type: 'scheduled', estimated_duration_minutes: 10, payment_amount: 10, priority: 'medium' },
        { task_type: 'sync_project_brain', name: 'Sync Project Brain', category: 'comms', assigned_agent: 'Prime', source_page: 'Vision', source_function: 'syncProjectBrain', trigger_type: 'event_driven', estimated_duration_minutes: 10, payment_amount: 10, priority: 'low' },
        { task_type: 'test_brain_connection', name: 'Test Brain Connection', category: 'monitoring', assigned_agent: 'The Sentinel', source_page: 'Vision', source_function: 'testBrainConnection', trigger_type: 'manual', estimated_duration_minutes: 5, payment_amount: 5, priority: 'low' },
        { task_type: 'receive_brain_command', name: 'Receive Brain Command', category: 'comms', assigned_agent: 'Prime', source_page: 'Vision', source_function: 'receiveBrainCommand', trigger_type: 'webhook', estimated_duration_minutes: 5, payment_amount: 5, priority: 'medium' },
        { task_type: 'process_brain_commands', name: 'Process Brain Commands', category: 'comms', assigned_agent: 'Prime', source_page: 'Vision', source_function: 'processBrainCommands', trigger_type: 'event_driven', estimated_duration_minutes: 10, payment_amount: 10, priority: 'medium' },

        // ── VAULT / SECURITY ─────────────────────────────────────
        { task_type: 'manage_api_keys', name: 'Manage API Keys', category: 'security', assigned_agent: 'The Sentinel', source_page: 'Vault', source_function: 'manageApiKeys', trigger_type: 'manual', estimated_duration_minutes: 15, payment_amount: 15, priority: 'high' },
        { task_type: 'generate_api_key', name: 'Generate API Key', category: 'security', assigned_agent: 'The Sentinel', source_page: 'Vault', source_function: 'generateApiKey', trigger_type: 'manual', estimated_duration_minutes: 5, payment_amount: 5, priority: 'medium' },
        { task_type: 'manage_mcp_servers', name: 'Manage MCP Servers', category: 'security', assigned_agent: 'The Architect', source_page: 'Vault', source_function: 'manageMcpServers', trigger_type: 'manual', estimated_duration_minutes: 15, payment_amount: 15, priority: 'medium' },

        // ── ONBOARD APP ──────────────────────────────────────────
        { task_type: 'onboard_app', name: 'Onboard New App', category: 'build', assigned_agent: 'The Builder', source_page: 'AppManagement', source_function: 'onboardApp', trigger_type: 'manual', estimated_duration_minutes: 25, payment_amount: 30, priority: 'medium' },

        // ── AI ASSIST ────────────────────────────────────────────
        { task_type: 'ai_assist', name: 'AI Assist', category: 'other', assigned_agent: 'Prime', source_page: 'DestinyFlow', source_function: 'aiAssist', trigger_type: 'manual', estimated_duration_minutes: 10, payment_amount: 10, priority: 'low' },
        { task_type: 'score_idea_profile', name: 'Score Idea to Profile', category: 'research', assigned_agent: 'The Analyst', source_page: 'Dashboard', source_function: 'scoreIdeaToProfile', trigger_type: 'event_driven', estimated_duration_minutes: 10, payment_amount: 10, priority: 'low' },

        // ── SEARCH CONSOLE ───────────────────────────────────────
        { task_type: 'search_console_sync', name: 'Search Console Sync', category: 'monitoring', assigned_agent: 'The Analyst', source_page: 'SiteMonitor', source_function: 'searchConsoleSync', trigger_type: 'scheduled', trigger_schedule: 'daily', estimated_duration_minutes: 15, payment_amount: 15, priority: 'medium' },

        // ── TIMECLOCK / SCANNER ──────────────────────────────────
        { task_type: 'system_scan', name: 'Full System Scan', category: 'audit', assigned_agent: 'The Inquisitor', source_page: 'SystemRegistry', source_function: 'systemScanner', trigger_type: 'scheduled', estimated_duration_minutes: 15, payment_amount: 20, priority: 'high' },
        { task_type: 'timeclock_manage', name: 'Timeclock Management', category: 'monitoring', assigned_agent: 'Prime', source_page: 'SystemRegistry', source_function: 'timeclockManager', trigger_type: 'autonomous', estimated_duration_minutes: 5, payment_amount: 5, priority: 'high' },
      ];

      // Bulk create all task definitions
      const records = TASK_DEFINITIONS.map(t => ({
        ...t,
        status: 'active',
        last_status: 'never',
        run_count: 0,
        fail_count: 0,
        requires_google_task: true,
        requires_calendar_event: t.trigger_type === 'scheduled'
      }));

      await sr.SystemTaskRegistry.bulkCreate(records);

      return Response.json({
        ok: true,
        mode: 'seed',
        total_seeded: records.length,
        message: `Seeded ${records.length} task types across ${new Set(records.map(r => r.category)).size} categories`
      });
    }

    const scan = {
      timestamp: new Date().toISOString(),
      mode,
      entities: {},
      agents: {},
      task_registry: {},
      timeclock: {},
      functions: {},
      pages: {},
      gaps: [],
      health_score: 0,
      summary: {}
    };

    // 1. Scan entities — count records in each
    const entityCounts = {};
    for (const entityName of KNOWN_ENTITIES) {
      try {
        const records = await sr[entityName].list('-created_date', 1);
        entityCounts[entityName] = records.length;
      } catch {
        entityCounts[entityName] = -1; // entity doesn't exist or error
      }
    }
    scan.entities = {
      total_entities: KNOWN_ENTITIES.length,
      active_entities: Object.values(entityCounts).filter(c => c >= 0).length,
      counts: entityCounts,
      total_records: Object.values(entityCounts).reduce((a, b) => a + Math.max(0, b), 0)
    };

    // 2. Scan agents
    const agents = await sr.AgentProfile.list('-order', 100);
    const activeAgents = agents.filter(a => a.status === 'active');
    const idleAgents = agents.filter(a => a.status === 'idle');
    const errorAgents = agents.filter(a => a.status === 'error');
    const pausedAgents = agents.filter(a => a.status === 'paused');
    scan.agents = {
      total: agents.length,
      active: activeAgents.length,
      idle: idleAgents.length,
      error: errorAgents.length,
      paused: pausedAgents.length,
      total_inf_earned: agents.reduce((sum, a) => sum + (a.inf_earned_total || 0), 0),
      total_tasks_completed: agents.reduce((sum, a) => sum + (a.tasks_completed || 0), 0),
      agents_with_strikes: agents.filter(a => (a.strike_count || 0) > 0).length,
      list: agents.map(a => ({
        name: a.name,
        codename: a.codename,
        archetype: a.archetype,
        status: a.status,
        health: a.health,
        tasks_completed: a.tasks_completed || 0,
        inf_balance: a.inf_balance || 0,
        strike_count: a.strike_count || 0
      }))
    };

    // 3. Scan task registry
    const taskRegistry = await sr.SystemTaskRegistry.list('-created_date', 200);
    const assignedTasks = taskRegistry.filter(t => t.status === 'active' && t.assigned_agent);
    const unassignedTasks = taskRegistry.filter(t => t.status === 'unassigned' || !t.assigned_agent);
    const deprecatedTasks = taskRegistry.filter(t => t.status === 'deprecated');
    const neverRun = taskRegistry.filter(t => t.last_status === 'never');
    const failedTasks = taskRegistry.filter(t => t.last_status === 'failed');

    // Category breakdown
    const categoryBreakdown = {};
    for (const task of taskRegistry) {
      const cat = task.category || 'other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    }

    scan.task_registry = {
      total_tasks: taskRegistry.length,
      assigned: assignedTasks.length,
      unassigned: unassignedTasks.length,
      deprecated: deprecatedTasks.length,
      never_run: neverRun.length,
      failed: failedTasks.length,
      coverage_percent: taskRegistry.length > 0
        ? Math.round((assignedTasks.length / taskRegistry.length) * 100)
        : 0,
      category_breakdown: categoryBreakdown,
      unassigned_list: unassignedTasks.map(t => ({
        task_type: t.task_type,
        name: t.name,
        category: t.category
      }))
    };

    // 4. Scan timeclock
    const activeClocks = await sr.TimeClockEntry.filter({ status: 'active' }, '-clock_in', 50);
    const recentClocks = await sr.TimeClockEntry.list('-created_date', 50);
    const completedClocks = recentClocks.filter(c => c.status === 'completed');
    const totalMinutes = completedClocks.reduce((sum, c) => sum + (c.duration_minutes || 0), 0);
    const totalPayments = completedClocks.reduce((sum, c) => sum + (c.payment_amount || 0), 0);
    const unpaidEntries = completedClocks.filter(c => c.payment_status === 'unpaid' || c.payment_status === 'pending');

    scan.timeclock = {
      active_entries: activeClocks.length,
      total_entries: recentClocks.length,
      completed_entries: completedClocks.length,
      total_hours: Math.round((totalMinutes / 60) * 10) / 10,
      total_inf_payments: totalPayments,
      unpaid_count: unpaidEntries.length,
      active_list: activeClocks.map(c => ({
        agent_name: c.agent_name,
        task_type: c.task_type,
        clock_in: c.clock_in,
        google_task_id: c.google_task_id ? true : false
      }))
    };

    // 5. Scan schedules
    const schedules = await sr.AgentSchedule.list('-created_date', 100);
    const scheduleStatus = {};
    for (const s of schedules) {
      scheduleStatus[s.status] = (scheduleStatus[s.status] || 0) + 1;
    }
    scan.schedules = {
      total: schedules.length,
      by_status: scheduleStatus
    };

    // 6. Functions coverage
    scan.functions = {
      total_known: KNOWN_FUNCTIONS.length,
      list: KNOWN_FUNCTIONS
    };

    // 7. Pages coverage
    scan.pages = {
      total_known: KNOWN_PAGES.length,
      list: KNOWN_PAGES
    };

    // 8. Capability toggles
    const capabilities = await sr.CapabilityToggle.list('-created_date', 100);
    const enabledCaps = capabilities.filter(c => c.enabled);
    scan.capabilities = {
      total: capabilities.length,
      enabled: enabledCaps.length,
      disabled: capabilities.length - enabledCaps.length
    };

    // 9. Core documents
    const docs = await sr.CoreDocument.list('-created_date', 100);
    scan.documents = {
      total: docs.length,
      active: docs.filter(d => d.status === 'active').length,
      draft: docs.filter(d => d.status === 'draft').length,
      average_validation_score: docs.length > 0
        ? Math.round((docs.reduce((s, d) => s + (d.validation_score || 0), 0) / docs.length) * 100) / 100
        : 0
    };

    // 10. DEEP specs
    const specs = await sr.DeepSpec.list('-created_date', 100);
    const runs = await sr.DeepRun.list('-created_date', 20);
    scan.deep = {
      total_specs: specs.length,
      active_specs: specs.filter(s => s.status === 'active').length,
      total_runs: runs.length,
      passed_runs: runs.filter(r => r.status === 'passed').length,
      failed_runs: runs.filter(r => r.status === 'failed').length,
      approved_runs: runs.filter(r => r.is_approved).length
    };

    // 11. Monitored sites
    const sites = await sr.MonitoredSite.list('-created_date', 50);
    scan.sites = {
      total: sites.length,
      healthy: sites.filter(s => s.status === 'healthy' || s.status === 'active').length,
      degraded: sites.filter(s => s.status === 'degraded').length,
      critical: sites.filter(s => s.status === 'critical').length,
      average_audit_score: sites.length > 0
        ? Math.round(sites.reduce((s, si) => s + (si.audit_score || 0), 0) / sites.length)
        : 0
    };

    // 12. Compute gaps
    const gaps = [];

    if (scan.task_registry.coverage_percent < 100) {
      gaps.push({
        severity: 'high',
        area: 'task_registry',
        message: `${unassignedTasks.length} task types have no agent assigned`,
        recommendation: 'Assign agents to all unregistered task types in the System Registry'
      });
    }

    if (scan.agents.error > 0) {
      gaps.push({
        severity: 'critical',
        area: 'agents',
        message: `${scan.agents.error} agents in error state`,
        recommendation: 'Review and reset error agents or apply 3-strike rule'
      });
    }

    if (scan.agents.agents_with_strikes > 0) {
      gaps.push({
        severity: 'warning',
        area: 'agents',
        message: `${scan.agents.agents_with_strikes} agents have conduct strikes`,
        recommendation: 'Review strike history; 3 strikes triggers deletion/reprogramming'
      });
    }

    if (scan.timeclock.unpaid_count > 0) {
      gaps.push({
        severity: 'medium',
        area: 'timeclock',
        message: `${scan.timeclock.unpaid_count} completed time entries awaiting payment`,
        recommendation: 'Process pending agent payments via the timeclock manager'
      });
    }

    if (scan.documents.average_validation_score < 0.9 && scan.documents.total > 0) {
      gaps.push({
        severity: 'medium',
        area: 'documents',
        message: `Document validation score is ${scan.documents.average_validation_score} (target: 1.0)`,
        recommendation: 'Run document evolution cascade to improve consistency'
      });
    }

    if (scan.deep.failed_runs > 0) {
      gaps.push({
        severity: 'medium',
        area: 'deep',
        message: `${scan.deep.failed_runs} DEEP runs have failed`,
        recommendation: 'Review failed runs and re-execute with corrected specs'
      });
    }

    if (scan.sites.critical > 0) {
      gaps.push({
        severity: 'critical',
        area: 'sites',
        message: `${scan.sites.critical} monitored sites in critical state`,
        recommendation: 'Run healing pipeline on critical sites immediately'
      });
    }

    if (scan.entities.active_entities < scan.entities.total_entities) {
      const missing = scan.entities.total_entities - scan.entities.active_entities;
      gaps.push({
        severity: 'low',
        area: 'entities',
        message: `${missing} entities are inaccessible or missing`,
        recommendation: 'Verify entity schemas and database connectivity'
      });
    }

    if (scan.capabilities.enabled < scan.capabilities.total && scan.capabilities.total > 0) {
      gaps.push({
        severity: 'low',
        area: 'capabilities',
        message: `${scan.capabilities.total - scan.capabilities.enabled} capabilities are disabled`,
        recommendation: 'Review disabled capabilities and enable as needed'
      });
    }

    scan.gaps = gaps;

    // 13. Compute health score (0-100)
    let healthScore = 100;
    for (const gap of gaps) {
      if (gap.severity === 'critical') healthScore -= 15;
      else if (gap.severity === 'high') healthScore -= 10;
      else if (gap.severity === 'medium') healthScore -= 5;
      else if (gap.severity === 'warning') healthScore -= 3;
      else healthScore -= 1;
    }
    scan.health_score = Math.max(0, healthScore);

    // 14. Summary
    scan.summary = {
      health_score: scan.health_score,
      total_gaps: gaps.length,
      critical_gaps: gaps.filter(g => g.severity === 'critical').length,
      total_agents: scan.agents.total,
      active_agents: scan.agents.active,
      total_tasks_registered: scan.task_registry.total_tasks,
      task_coverage_percent: scan.task_registry.coverage_percent,
      active_timeclock_entries: scan.timeclock.active_entries,
      total_hours_logged: scan.timeclock.total_hours,
      total_entities: scan.entities.active_entities,
      total_records: scan.entities.total_records,
      total_functions: scan.functions.total_known,
      total_pages: scan.pages.total_known
    };

    return Response.json(scan);
  } catch (error) {
    return Response.json({ error: error.message, timestamp: new Date().toISOString() }, { status: 500 });
  }
}