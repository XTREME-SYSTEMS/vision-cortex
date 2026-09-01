/**
 * Growth OS Template — the canonical, repeatable blueprint for the
 * "AI Business Operating System" website described in the Construction
 * AI Growth OS manifesto.
 *
 * Principle: the industry changes; the operating system stays the same.
 * This module is the DETERMINISTIC SHELL. The generator function fills the
 * probabilistic core (industry-specific services, problems, property types)
 * via LLM, then stamps this shell hundreds of times.
 *
 * Every FactoryProject with product_type = "growth_os" gets this exact
 * architecture, customized only by industry + location + brand.
 */

// ── Page archetypes (the same structure for every client) ──
export const PAGE_ARCHETYPES = [
  { type: 'home', slug: '/', sections: ['hero_visual_quote', 'trust_bar', 'service_grid', 'problem_signals', 'project_showcase', 'process_steps', 'reviews', 'faq', 'visual_quote_cta', 'service_area_map'] },
  { type: 'services_index', slug: '/services', sections: ['service_catalog', 'visual_quote_cta'] },
  { type: 'service', slug: '/services/{service_slug}', sections: ['service_hero', 'problem_solved', 'process', 'project_gallery', 'pricing_tiers', 'faq', 'visual_quote_cta'] },
  { type: 'problem', slug: '/problems/{problem_slug}', sections: ['problem_hero', 'root_causes', 'our_solution', 'project_evidence', 'faq', 'visual_quote_cta'] },
  { type: 'property_type', slug: '/properties/{property_slug}', sections: ['property_hero', 'challenges', 'services_offered', 'project_evidence', 'faq', 'visual_quote_cta'] },
  { type: 'location', slug: '/locations/{location_slug}', sections: ['location_hero', 'local_services', 'local_projects', 'local_reviews', 'service_area_map', 'visual_quote_cta'] },
  { type: 'project', slug: '/projects/{project_slug}', sections: ['project_hero', 'before_after', 'scope', 'materials', 'timeline', 'testimonial', 'gallery', 'faq', 'visual_quote_cta'] },
  { type: 'visual_quote', slug: '/visualize', sections: ['upload_hero', 'color_selector', 'finish_selector', 'visualization_preview', 'lead_capture', 'proposal_preview'] },
  { type: 'faq', slug: '/faq', sections: ['faq_index', 'visual_quote_cta'] },
  { type: 'about', slug: '/about', sections: ['story', 'team', 'certifications', 'service_area', 'visual_quote_cta'] },
  { type: 'contact', slug: '/contact', sections: ['contact_form', 'hours', 'service_area_map', 'visual_quote_cta'] },
  { type: 'reviews', slug: '/reviews', sections: ['review_grid', 'rating_summary', 'visual_quote_cta'] },
  { type: 'privacy', slug: '/privacy', sections: ['policy_body'] },
  { type: 'terms', slug: '/terms', sections: ['terms_body'] },
];

// ── Section library (reusable building blocks) ──
export const SECTION_LIBRARY = {
  hero_visual_quote: 'Hero with "See Your New {surface}" visual quote CTA',
  trust_bar: 'Logos, certifications, ratings, years in business',
  service_grid: 'Grid of all services offered',
  problem_signals: 'Common problems we solve (cracked, peeling, dusting, etc.)',
  project_showcase: 'Featured before/after project transformations',
  process_steps: 'Numbered process: consult → prep → install → warranty',
  reviews: 'Customer reviews with star ratings',
  faq: 'Frequently asked questions with schema markup',
  visual_quote_cta: 'Primary CTA: upload photo → visualize → get quote',
  service_area_map: 'Interactive map of cities/regions served',
  service_catalog: 'Full list of services with descriptions',
  service_hero: 'Service-specific hero with value proposition',
  problem_solved: 'The specific problem this service solves',
  project_gallery: 'Photo gallery of completed work for this service',
  pricing_tiers: 'Good / Better / Best pricing presentation',
  problem_hero: 'Problem-focused hero (e.g., "Why is my concrete cracking?")',
  root_causes: 'Diagnostic root causes of the problem',
  our_solution: 'How this service solves the problem',
  project_evidence: 'Real project evidence proving the solution works',
  property_hero: 'Property-type hero (e.g., "Warehouse Flooring")',
  challenges: 'Challenges specific to this property type',
  services_offered: 'Services relevant to this property type',
  location_hero: 'Location-specific hero (e.g., "{service} in {city}")',
  local_services: 'Services offered in this location',
  local_projects: 'Projects completed in this area',
  local_reviews: 'Reviews from customers in this area',
  project_hero: 'Project case study hero with location + sq ft',
  before_after: 'Before/after photo comparison',
  scope: 'Detailed scope of work performed',
  materials: 'Materials and systems used',
  timeline: 'Project timeline and duration',
  testimonial: 'Customer testimonial for this project',
  gallery: 'Full project photo gallery',
  upload_hero: 'Visual Quote Engine: upload your photo',
  color_selector: 'Choose your floor/surface color',
  finish_selector: 'Choose your finish/system',
  visualization_preview: 'AI-generated before/after preview',
  lead_capture: 'Capture name/email/phone/ZIP before final proposal',
  proposal_preview: 'Good/Better/Best proposal with visualization',
  story: 'Company origin story',
  team: 'Team members and roles',
  certifications: 'Certifications, licenses, associations',
  contact_form: 'Contact form with service + location selection',
  hours: 'Business hours',
  policy_body: 'Privacy policy body text',
  terms_body: 'Terms of service body text',
  review_grid: 'Grid of all customer reviews',
  rating_summary: 'Aggregate rating and review count',
};

// ── Agent roster (24 specialized agents from the manifesto) ──
export const AGENT_ROSTER = [
  'Strategist', 'Source Scout', 'Demand Hunter', 'Project Hunter',
  'Entity Resolver', 'Lead Scorer', 'Enrichment Agent', 'CRM Agent',
  'Outreach Agent', 'Follow-up Agent', 'Sales Copilot', 'Content Strategist',
  'Writer', 'Visual Agent', 'Video Agent', 'Social Scheduler',
  'Community Agent', 'Reputation Agent', 'SEO Agent', 'AEO Agent',
  'Analytics Agent', 'CRO Agent', 'Client Success', 'System Auditor',
];

// ── Lead types (classification taxonomy) ──
export const LEAD_TYPES = [
  'DIRECT_DEMAND', 'PROBLEM_DEMAND', 'PROJECT_DEMAND', 'BID_DEMAND',
  'PARTNER_DEMAND', 'PROPERTY_SIGNAL', 'MARKET_SIGNAL', 'COMPETITOR_SIGNAL',
  'CONTENT_OPPORTUNITY', 'SEO_OPPORTUNITY', 'REFERRAL_OPPORTUNITY',
];

// ── Intent vocabulary (what signals demand) ──
export const INTENT_VOCABULARY = [
  'need', 'looking for', 'searching for', 'trying to find', 'recommend',
  'recommendation', 'who does', 'who can', 'does anyone know', 'hire',
  'hiring', 'contractor', 'subcontractor', 'vendor', 'quote', 'estimate',
  'pricing', 'price', 'cost', 'bid', 'RFP', 'RFQ', 'ITB', 'proposal',
  'renovation', 'remodel', 'replacement', 'repair', 'restore', 'resurface',
  'refinish', 'upgrade', 'build', 'construct', 'develop', 'acquired',
  'purchased', 'leased', 'opening', 'expanding', 'tenant improvement',
  'build-out', 'value-add',
];

// ── Problem vocabulary (infer service from problem) ──
export const PROBLEM_VOCABULARY = [
  'cracked', 'spalling', 'flaking', 'peeling', 'chipping', 'stained',
  'oil stained', 'dusty', 'dusting', 'worn', 'damaged', 'ugly', 'old',
  'slippery', 'uneven', 'failed', 'water damage', 'chemical damage',
  'maintenance problem', 'deterioration', 'unsafe',
];

// ── Source registry seed (recursive discovery starting points) ──
export const SOURCE_REGISTRY_SEED = {
  search_engines: ['Google', 'Bing', 'Google Maps'],
  classifieds: ['Craigslist', 'Facebook Marketplace'],
  social: ['Facebook Groups', 'Instagram', 'Threads', 'Reddit', 'X', 'TikTok', 'YouTube', 'Pinterest', 'Quora', 'Nextdoor', 'LinkedIn', 'Discord', 'Meetup', 'Alignable'],
  forums: ['homeowner forums', 'remodeling forums', 'DIY forums', 'contractor forums', 'trade-specific forums'],
  directories: ['chambers of commerce', 'professional associations', 'member directories', 'vendor directories', 'business directories'],
  bid_boards: ['Dodge', 'ConstructConnect', 'BuildingConnected', 'PlanHub', 'iSqFt', 'SmartBid', 'Procore', 'Blue Book'],
  procurement: ['municipal procurement', 'county procurement', 'state procurement', 'federal procurement', 'school districts', 'universities', 'hospitals', 'airports'],
  public_records: ['property records', 'permits', 'planning applications', 'zoning applications', 'development applications', 'public notices'],
  real_estate: ['commercial real estate', 'residential real estate', 'property auctions', 'foreclosure sources'],
  adjacent: ['architect websites', 'developer websites', 'GC websites', 'property manager websites', 'facility manager websites', 'restoration companies', 'adjacent trade websites'],
};

// ── SEO/AEO structure (avoid thin content, build topical authority) ──
export const SEO_AEO_STRUCTURE = {
  principles: [
    'Never generate city+service swap pages (doorway abuse).',
    'Each location page must have real local projects, photos, neighborhoods, local testimonials.',
    'Each page must answer a real question with first-party evidence.',
    'Optimize for AI Overviews (AEO) AND traditional organic results.',
    'Project case-study pages are the primary SEO weapon, not generic articles.',
    'Turn one project into: case study + video + 5 social posts + 10 images + FAQ + GBP post.',
  ],
  content_pillars: ['services', 'problems', 'property_types', 'projects', 'locations', 'faqs'],
  schema_types: ['LocalBusiness', 'Service', 'FAQPage', 'BreadcrumbList', 'ImageObject', 'VideoObject', 'Review', 'AggregateRating', 'Project'],
};

// ── Visual Quote Engine config (the killer differentiator) ──
export const VISUAL_QUOTE_ENGINE = {
  flow: ['upload_photo', 'ai_analysis', 'choose_color', 'choose_finish', 'generate_visualization', 'capture_lead', 'generate_proposal', 'send_proposal', 'follow_up'],
  target_time: 'under 1 hour, target minutes',
  proposal_tiers: ['Good', 'Better', 'Best'],
  lead_score_events: {
    uploaded_photo: 10,
    generated_visualization: 15,
    selected_finish: 10,
    entered_square_footage: 10,
    requested_quote: 20,
    opened_proposal: 10,
    viewed_pricing: 10,
    returned_to_proposal: 10,
    clicked_schedule: 15,
    started_checkout: 30,
  },
  hot_lead_threshold: 70,
  follow_up_cadence: ['1 hour', '24 hours', '3 days', '7 days', '14 days', '30 days'],
};

// ── Build the deterministic website_config shell from the template ──
export function buildGrowthOSWebsiteConfig({ industry, sub_industry, services, problems, property_types, locations, brand_pack, business_name }) {
  const surface = services[0]?.name || `${industry} services`;

  // Generate the full page list by expanding archetypes with industry content
  const pages = [];

  // Fixed pages (home, services index, visualize, faq, about, contact, reviews, privacy, terms)
  PAGE_ARCHETYPES.filter(a => !['service', 'problem', 'property_type', 'location', 'project'].includes(a.type)).forEach(a => {
    pages.push({ name: prettyName(a.type), slug: a.slug, sections: a.sections });
  });

  // Service pages
  services.forEach(s => {
    pages.push({
      name: s.name,
      slug: `/services/${slugify(s.name)}`,
      sections: ['service_hero', 'problem_solved', 'process', 'project_gallery', 'pricing_tiers', 'faq', 'visual_quote_cta'],
    });
  });

  // Problem pages
  problems.forEach(p => {
    pages.push({
      name: p.title,
      slug: `/problems/${slugify(p.title)}`,
      sections: ['problem_hero', 'root_causes', 'our_solution', 'project_evidence', 'faq', 'visual_quote_cta'],
    });
  });

  // Property-type pages
  property_types.forEach(pt => {
    pages.push({
      name: pt.name,
      slug: `/properties/${slugify(pt.name)}`,
      sections: ['property_hero', 'challenges', 'services_offered', 'project_evidence', 'faq', 'visual_quote_cta'],
    });
  });

  // Location pages (real local content, not doorway swaps)
  locations.forEach(loc => {
    pages.push({
      name: `${surface} in ${loc}`,
      slug: `/locations/${slugify(loc)}`,
      sections: ['location_hero', 'local_services', 'local_projects', 'local_reviews', 'service_area_map', 'visual_quote_cta'],
    });
  });

  return {
    pages,
    theme_tokens: {
      light: {
        background: brand_pack?.background_color || '#FFFFFF',
        foreground: '#0A0A0A',
        primary: brand_pack?.primary_color || '#0A0A0A',
        'primary-foreground': '#FFFFFF',
        accent: brand_pack?.accent_color || '#3B82F6',
        'accent-foreground': '#FFFFFF',
        muted: '#F4F4F5',
        'muted-foreground': '#71717A',
        border: '#E4E4E7',
        card: '#FFFFFF',
      },
      dark: {
        background: '#0A0A0A',
        foreground: '#FAFAFA',
        primary: brand_pack?.accent_color || '#3B82F6',
        'primary-foreground': '#0A0A0A',
        accent: brand_pack?.accent_color || '#3B82F6',
        'accent-foreground': '#0A0A0A',
        muted: '#18181B',
        'muted-foreground': '#A1A1AA',
        border: '#27272A',
        card: '#0F0F0F',
      },
    },
    pwa: {
      name: business_name || `${sub_industry} ${industry}`,
      short_name: (business_name || sub_industry).slice(0, 12),
      display: 'standalone',
      theme_color: brand_pack?.primary_color || '#0A0A0A',
      background_color: brand_pack?.background_color || '#FFFFFF',
    },
    responsive: true,
    has_dark_mode: true,
    template_type: 'growth_os',
    visual_quote_engine: VISUAL_QUOTE_ENGINE,
    seo_aeo: SEO_AEO_STRUCTURE,
    content_pillars: SEO_AEO_STRUCTURE.content_pillars,
    primary_cta: `See Your New ${surface}`,
    primary_cta_flow: 'upload_photo → visualize → quote',
  };
}

// ── Build the full Growth OS blueprint (stored on project) ──
export function buildGrowthOSBlueprint({ services, problems, property_types, locations }) {
  return {
    agent_roster: AGENT_ROSTER,
    lead_types: LEAD_TYPES,
    intent_vocabulary: INTENT_VOCABULARY,
    problem_vocabulary: PROBLEM_VOCABULARY,
    source_registry: SOURCE_REGISTRY_SEED,
    seo_aeo: SEO_AEO_STRUCTURE,
    visual_quote_engine: VISUAL_QUOTE_ENGINE,
    service_catalog: services,
    problem_catalog: problems,
    property_type_catalog: property_types,
    target_locations: locations,
    recursive_discovery: true,
    content_strategy: 'project_case_studies_over_thin_pages',
    follow_up_cadence: VISUAL_QUOTE_ENGINE.follow_up_cadence,
  };
}

// ── Helpers ──
function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function prettyName(type) {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}