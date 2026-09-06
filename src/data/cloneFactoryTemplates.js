// Deep Clone Factory — rebrand + monetization reference templates.

export const BRAND_NAMING_PATTERNS = {
  prefixes: ['Nova', 'Apex', 'Quantum', 'Vertex', 'Helix', 'Forge', 'Pulse', 'Lumen', 'Strata', 'Nexus'],
  suffixes: ['Labs', 'Works', 'Forge', 'Stack', 'Grid', 'Hub', 'Core', 'Flow', 'Deck', 'Suite'],
  compounds: ['CloudForge', 'DataLoom', 'CodeMesh', 'WebKindle', 'SiteSpark', 'PixelCraft', 'BrandMint', 'CloneKit'],
  abstract: ['Korvex', 'Zentry', 'Brivia', 'Veloxa', 'Nodia', 'Orbital', 'Crelia', 'Vexor', 'Lumio', 'Stratos'],
};

export const TRADEMARK_SAFETY_CHECKLIST = [
  'Search USPTO TESS database for exact name matches',
  'Search EUIPO for European trademark coverage',
  'Check .com, .io, .ai, .co domain availability',
  'Verify no common-law usage via Google search (10+ pages)',
  'Confirm name is not descriptive of the service category',
  'Ensure name has no negative connotations in top 5 languages',
  'Check social media handle availability (Twitter, LinkedIn, Instagram)',
  'Verify name is pronounceable and under 3 syllables',
  'Run a Google Ads keyword conflict check',
  'Confirm name passes the "radio test" (can be spelled when heard)',
  'Check App Store and Google Play for conflicting app names',
  'Verify Crunchbase for existing startup name conflicts',
  'Search domain name aftermarket for premium pricing',
  'Ensure name works as a verb ("just X it")',
  'Check trademark classes 9, 35, 42 for software/SaaS conflicts',
  'Verify name has no homophone conflicts with existing brands',
  'Run a linguistics screening for global market expansion',
  'Check .ai domain availability (critical for tech brands)',
  'Confirm name length is under 12 characters for logo legibility',
  'Verify name is not a generic TLD keyword (e.g. app.com, cloud.com)',
];

export const SEO_AEO_OPTIMIZATION = {
  metaTags: [
    { tag: 'title', maxLength: 60, rule: 'Primary keyword + brand name, under 60 chars' },
    { tag: 'description', maxLength: 160, rule: 'Action-oriented summary with CTA, under 160 chars' },
    { tag: 'og:title', maxLength: 60, rule: 'Social card title, matches title tag' },
    { tag: 'og:description', maxLength: 160, rule: 'Social card description' },
    { tag: 'twitter:card', rule: 'summary_large_image for rich previews' },
  ],
  schemaMarkup: ['@type: Organization', '@type: SoftwareApplication', '@type: WebApplication', '@type: FAQPage', '@type: BreadcrumbList'],
  coreWebVitals: {
    LCP: { target: '2.5s', strategy: 'Preload hero image, inline critical CSS' },
    FID: { target: '100ms', strategy: 'Defer non-critical JS, code-split routes' },
    CLS: { target: '0.1', strategy: 'Reserve image dimensions, avoid dynamic inserts' },
    INP: { target: '200ms', strategy: 'Minimize main thread blocking' },
  },
};

export const BUSINESS_REGISTRATION_PATHS = {
  llc: {
    label: 'State LLC Filing',
    steps: [
      'Choose formation state (Delaware, Wyoming, or home state)',
      'File Articles of Organization with Secretary of State',
      'Appoint a Registered Agent',
      'Create Operating Agreement',
      'Obtain EIN from IRS (Form SS-4)',
      'File DBA if operating under a different name',
    ],
    typicalCost: '$50-$500',
    timeline: '1-7 business days',
  },
  dba: {
    label: 'DBA (Doing Business As) Registration',
    steps: [
      'Check name availability at county clerk office',
      'File fictitious business name statement',
      'Publish DBA in local newspaper (if required by state)',
      'Renew per state schedule (typically every 5 years)',
    ],
    typicalCost: '$10-$100',
    timeline: '1-4 weeks',
  },
  ein: {
    label: 'IRS EIN Acquisition',
    steps: [
      'Gather LLC formation documents or SSN',
      'Apply online at IRS.gov EIN Assistant',
      'Receive EIN immediately upon completion',
      'Save EIN confirmation letter (CP 575)',
      'Use EIN for banking, tax filings, and payroll',
    ],
    typicalCost: 'Free',
    timeline: 'Immediate (online)',
  },
};

export const REBRAND_REPLACEMENT_RULES = [
  { type: 'TRADEMARK', action: 'Replace all registered marks with generated brand name', severity: 'critical' },
  { type: 'COPYRIGHT', action: 'Replace copyright notices with new entity name + year', severity: 'critical' },
  { type: 'LOGO', action: 'Generate vector logo from design DNA tokens', severity: 'critical' },
  { type: 'BRAND_COLOR', action: 'Shift palette by 5-10 degrees on hue wheel', severity: 'warning' },
  { type: 'TYPOGRAPHY', action: 'Substitute with equivalent-weight open-source font', severity: 'warning' },
  { type: 'ASSET_REFERENCE', action: 'Replace all third-party asset URLs with self-hosted equivalents', severity: 'critical' },
];

export const PIPELINE_STAGES = [
  { id: 1, key: 'scrape', label: 'Scrape Target', description: 'Fetch target asset bundle + DOM' },
  { id: 2, key: 'discovery', label: 'Deep Discovery', description: 'Competitor analysis + financial projection' },
  { id: 3, key: 'parity', label: 'Parity Gate', description: 'Visual + functional compliance scoring (1.00 gate)' },
  { id: 4, key: 'provision', label: 'Railway Provision', description: 'Provision stateful container on Railway v2' },
  { id: 5, key: 'index', label: 'Search Console Sync', description: 'Submit domain + sitemap for indexing' },
];