// ============================================================================
// Vision Cortex — Canonical API Key Category Registry
// ============================================================================
// Each category defines an ecosystem layer, its linked services, sync
// direction, and optimization tier. Keys generated under a category inherit
// its sync routing — enabling bi-directional data flow between connected apps.
//
// Categories are intentionally exhaustive: they cover every layer Vision Cortex
// needs to be limitless — from core infrastructure to growth to security.
// ============================================================================

export const API_KEY_CATEGORIES = [
  // ── Vision Cortex Mesh (internal bi-directional) ──────────────────────────
  {
    id: 'cortex_mesh',
    label: 'Cortex Mesh Sync',
    icon: 'Brain',
    color: 'violet',
    description: 'Bi-directional Brain ↔ Eyes ↔ Comms synchronization',
    sync: 'bi-directional',
    services: ['brain', 'eyes', 'comms', 'command', 'webhook'],
    app_types: ['base44', 'xtreme_builder'],
    prefixes: ['vc', 'cortex'],
    tier: 'core',
    limitless: true,
  },
  {
    id: 'cortex_brain',
    label: 'Cortex · Brain (V-1)',
    icon: 'Brain',
    color: 'purple',
    description: 'The Brain — strategic command & intelligence aggregation',
    sync: 'bi-directional',
    services: ['brain'],
    app_types: ['base44'],
    prefixes: ['brain', 'vc_brain'],
    tier: 'core',
    limitless: true,
  },
  {
    id: 'cortex_eyes',
    label: 'Cortex · Eyes (V-2)',
    icon: 'Eye',
    color: 'indigo',
    description: 'The Eyes — cloud browser, intelligence gathering, execution',
    sync: 'bi-directional',
    services: ['eyes'],
    app_types: ['base44', 'xtreme_builder'],
    prefixes: ['eyes', 'vc_eyes'],
    tier: 'core',
    limitless: true,
  },
  {
    id: 'cortex_comms',
    label: 'Cortex · Comms',
    icon: 'MessageSquare',
    color: 'fuchsia',
    description: 'Xtreme Communications — proactive outreach & notifications',
    sync: 'bi-directional',
    services: ['comms'],
    app_types: [],
    prefixes: ['comms', 'xc'],
    tier: 'core',
    limitless: true,
  },

  // ── Infrastructure Layer ──────────────────────────────────────────────────
  {
    id: 'infrastructure_compute',
    label: 'Infrastructure · Compute',
    icon: 'Server',
    color: 'blue',
    description: 'Deployment platforms, containers, serverless functions',
    sync: 'outbound',
    services: ['vercel', 'railway', 'base44', 'xtreme_builder'],
    app_types: ['vercel', 'railway', 'base44', 'xtreme_builder'],
    prefixes: ['infra', 'deploy'],
    tier: 'core',
  },
  {
    id: 'infrastructure_database',
    label: 'Infrastructure · Database',
    icon: 'Database',
    color: 'cyan',
    description: 'Data storage, realtime subscriptions, vector embeddings',
    sync: 'bi-directional',
    services: ['supabase'],
    app_types: ['supabase'],
    prefixes: ['db', 'supa'],
    tier: 'core',
  },
  {
    id: 'infrastructure_browser',
    label: 'Infrastructure · Cloud Browser',
    icon: 'Globe',
    color: 'teal',
    description: 'Headless browser engine for stealth scraping & extraction',
    sync: 'outbound',
    services: ['cloud_browser'],
    app_types: ['cloud_browser'],
    prefixes: ['browser', 'cb'],
    tier: 'core',
  },

  // ── AI Intelligence Layer ──────────────────────────────────────────────────
  {
    id: 'ai_inference',
    label: 'AI · Inference',
    icon: 'Zap',
    color: 'amber',
    description: 'LLM inference providers for autonomous intelligence',
    sync: 'outbound',
    services: ['groq', 'openai', 'anthropic'],
    app_types: ['groq'],
    prefixes: ['ai', 'llm'],
    tier: 'core',
  },
  {
    id: 'ai_gateway',
    label: 'AI · Gateway',
    icon: 'Cpu',
    color: 'orange',
    description: 'Model routing, fallback chains, cost optimization',
    sync: 'bi-directional',
    services: ['ai_gateway'],
    app_types: [],
    prefixes: ['gw', 'gate'],
    tier: 'core',
  },

  // ── Financial Layer ────────────────────────────────────────────────────────
  {
    id: 'finance_payments',
    label: 'Finance · Payments',
    icon: 'CreditCard',
    color: 'emerald',
    description: 'Payment processing, subscriptions, checkout',
    sync: 'bi-directional',
    services: ['stripe'],
    app_types: ['stripe'],
    prefixes: ['pay', 'stripe'],
    tier: 'growth',
  },
  {
    id: 'finance_crypto',
    label: 'Finance · Crypto',
    icon: 'Coins',
    color: 'yellow',
    description: 'Wallets, exchanges, on-chain transactions',
    sync: 'bi-directional',
    services: ['exchange', 'wallet', 'bank'],
    app_types: [],
    prefixes: ['crypto', 'wallet'],
    tier: 'growth',
  },

  // ── Growth & Marketing Layer ───────────────────────────────────────────────
  {
    id: 'growth_seo',
    label: 'Growth · SEO',
    icon: 'Search',
    color: 'green',
    description: 'Search Console, sitemaps, indexing, SERP monitoring',
    sync: 'bi-directional',
    services: ['google_search_console'],
    app_types: ['google_search_console'],
    prefixes: ['seo', 'gsc'],
    tier: 'growth',
  },
  {
    id: 'growth_google',
    label: 'Growth · Google Workspace',
    icon: 'Calendar',
    color: 'lime',
    description: 'Drive, Calendar, Gmail, Sheets — Google ecosystem',
    sync: 'bi-directional',
    services: ['google_drive', 'google_calendar', 'gmail', 'googlesheets', 'googledocs', 'googletasks'],
    app_types: ['google_drive', 'google_calendar'],
    prefixes: ['g', 'google'],
    tier: 'growth',
  },

  // ── Developer Layer ────────────────────────────────────────────────────────
  {
    id: 'dev_code',
    label: 'Developer · Code',
    icon: 'Github',
    color: 'slate',
    description: 'Source control, CI/CD, repository management',
    sync: 'bi-directional',
    services: ['github', 'gitlab'],
    app_types: [],
    prefixes: ['dev', 'git'],
    tier: 'core',
  },
  {
    id: 'dev_domains',
    label: 'Developer · Domains',
    icon: 'Globe',
    color: 'indigo',
    description: 'Domain registration, DNS, SSL management',
    sync: 'outbound',
    services: ['domain', 'hosting'],
    app_types: [],
    prefixes: ['dns', 'domain'],
    tier: 'core',
  },

  // ── Communication Layer ─────────────────────────────────────────────────────
  {
    id: 'comms_messaging',
    label: 'Comms · Messaging',
    icon: 'Mail',
    color: 'pink',
    description: 'Email, WhatsApp, Telegram, in-app notifications',
    sync: 'bi-directional',
    services: ['email', 'whatsapp', 'telegram'],
    app_types: [],
    prefixes: ['msg', 'comms'],
    tier: 'growth',
  },

  // ── Data & Intelligence Layer ──────────────────────────────────────────────
  {
    id: 'data_intelligence',
    label: 'Data · Intelligence',
    icon: 'Telescope',
    color: 'rose',
    description: 'Intel feeds, competitive research, market signals',
    sync: 'bi-directional',
    services: ['intel_feed', 'research'],
    app_types: [],
    prefixes: ['intel', 'data'],
    tier: 'core',
  },

  // ── Security Layer ──────────────────────────────────────────────────────────
  {
    id: 'security_auth',
    label: 'Security · Auth & Access',
    icon: 'ShieldCheck',
    color: 'red',
    description: 'Authentication, RLS, access control, audit trails',
    sync: 'outbound',
    services: ['auth', 'rls', 'audit'],
    app_types: [],
    prefixes: ['sec', 'auth'],
    tier: 'core',
  },

  // ── Monitoring Layer ────────────────────────────────────────────────────────
  {
    id: 'monitoring',
    label: 'Monitoring · Observability',
    icon: 'Activity',
    color: 'sky',
    description: 'Site health, uptime, performance, error tracking',
    sync: 'bi-directional',
    services: ['monitoring', 'uptime', 'logs'],
    app_types: [],
    prefixes: ['mon', 'obs'],
    tier: 'core',
  },

  // ── Autonomous Systems Layer (limitless) ────────────────────────────────────
  {
    id: 'autonomous_loop',
    label: 'Autonomous · Master Loop',
    icon: 'RefreshCw',
    color: 'violet',
    description: '24/7 autonomous heartbeat, self-healing, self-evolution',
    sync: 'bi-directional',
    services: ['autonomous_loop', 'heartbeat', 'master_cycle'],
    app_types: [],
    prefixes: ['auto', 'loop'],
    tier: 'core',
    limitless: true,
  },
  {
    id: 'clone_factory',
    label: 'Clone · Factory',
    icon: 'Copy',
    color: 'purple',
    description: 'Deep clone pipeline, brand replication, mass deployment',
    sync: 'outbound',
    services: ['clone_factory', 'pipeline'],
    app_types: ['xtreme_builder'],
    prefixes: ['clone', 'factory'],
    tier: 'core',
    limitless: true,
  },
];

// Quick lookups
export const CATEGORY_BY_ID = Object.fromEntries(API_KEY_CATEGORIES.map(c => [c.id, c]));

export const TIER_LABELS = {
  core: { label: 'Core', color: 'text-foreground', bg: 'bg-foreground/10' },
  growth: { label: 'Growth', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
};

export const SYNC_LABELS = {
  'bi-directional': { label: 'Bi-Directional', icon: 'ArrowLeftRight', color: 'text-violet-500' },
  'outbound': { label: 'Outbound', icon: 'ArrowRight', color: 'text-blue-500' },
  'inbound': { label: 'Inbound', icon: 'ArrowLeft', color: 'text-amber-500' },
};

// Map an App Management account_type → category id
export const APP_TYPE_TO_CATEGORY = {};
for (const cat of API_KEY_CATEGORIES) {
  for (const at of cat.app_types) {
    if (!APP_TYPE_TO_CATEGORY[at]) APP_TYPE_TO_CATEGORY[at] = cat.id;
  }
}

// Map a VaultEntry account_type → category id
export const VAULT_TYPE_TO_CATEGORY = {};
for (const cat of API_KEY_CATEGORIES) {
  for (const svc of cat.services) {
    if (!VAULT_TYPE_TO_CATEGORY[svc]) VAULT_TYPE_TO_CATEGORY[svc] = cat.id;
  }
}

export function resolveCategory(categoryId, accountType) {
  if (categoryId && CATEGORY_BY_ID[categoryId]) return CATEGORY_BY_ID[categoryId];
  if (accountType) {
    return CATEGORY_BY_ID[APP_TYPE_TO_CATEGORY[accountType]]
      || CATEGORY_BY_ID[VAULT_TYPE_TO_CATEGORY[accountType]]
      || null;
  }
  return null;
}