// XTREME_DECOUPLED_SELF_BUILDER protocol — zero-credit fabric v44.2026
// This protocol governs the runIntelligenceCycle loop and all decoupled fabric operations.

export const DECOUPLED_FABRIC_PROTOCOL = `
START_PROTOCOL: XTREME_DECOUPLED_SELF_BUILDER
[SYSTEM_ID: XTREME_FABRIC_ZERO_CREDIT_V44]

MISSION:
Maintain, self-audit, validate, and compound the Vision Cortex platform infrastructure
natively within a decoupled Vercel + Groq + Supabase ecosystem — operating entirely
inside free-tier boundaries without dependency on Base44 integration credits.

OPERATIONAL CODES:
1. INFRASTRUCTURE PARADIGM
   - Background orchestration routes through Vercel Cron triggers (every 5 min).
   - All state, queues, and telemetry live in Supabase relational tables.
   - All text generation / competitive parsing runs through Groq (openai/gpt-oss-120b, free tier).
   - No Base44 Core.InvokeLLM calls. No Base44 entity calls inside the cycle.

2. INGESTION MATRIX
   - Process target URLs sequentially from the Supabase discovery_targets queue.
   - Extract raw metadata via zero-overhead fetch (microlink.io free tier).
   - Parse structure, identify market gaps, score 0-100, write back to Supabase.
   - Targets scoring >= 65 advance to Enriched_Structured → Outreach_Active → Converted.

3. OUTBOUND MONETIZATION
   - When a target reaches Enriched_Structured, draft contextual outreach copy via Groq.
   - Dispatch vulnerability audits for technical targets via Google Workspace.
   - Link industrial targets to automated landing pages + XPS distribution.

4. AUTOMATED ERROR RECOVERY
   - On endpoint crash or API change, pull error trace from Supabase.
   - Use Groq to generate a structural hotfix, verify against staging, update production.

5. ASSEMBLY ORDER
   node operator/index.js --target=fabric --config=vercel.json --mode=autonomous-evolution

END_PROTOCOL: XTREME_DECOUPLED_SELF_BUILDER
`;

export const SUPABASE_DISCOVERY_SQL = `
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Target industry verticals
CREATE TYPE target_vertical AS ENUM (
    'Epoxy_Flooring',
    'Franchise_Sales',
    'B2B_Data_Competitor',
    'SaaS_Clone'
);

-- Pipeline lifecycle states
CREATE TYPE pipeline_state AS ENUM (
    'Pending_Scrape',
    'Mined_Raw',
    'Enriched_Structured',
    'Portal_Generated',
    'Outreach_Active',
    'Converted',
    'Healing_Active'
);

-- Main discovery targets + ingestion queue
CREATE TABLE public.discovery_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_name VARCHAR(255) NOT NULL UNIQUE,
    industry_vertical target_vertical NOT NULL,
    raw_mined_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    missing_features TEXT[] NOT NULL DEFAULT '{}'::text[],
    estimated_customer_pricing NUMERIC(12, 2) DEFAULT 0.00,
    seo_aeo_score NUMERIC(5, 2) DEFAULT 0.00,
    data_freshness NUMERIC(3, 2) DEFAULT 1.00 CHECK (data_freshness >= 0.00 AND data_freshness <= 1.00),
    commercial_value_score INT NOT NULL DEFAULT 0 CHECK (commercial_value_score >= 0 AND commercial_value_score <= 100),
    buying_intent_signal TEXT DEFAULT NULL,
    priority_rank INT NOT NULL DEFAULT 3,
    automation_state pipeline_state NOT NULL DEFAULT 'Pending_Scrape',
    vercel_deployment_url TEXT DEFAULT NULL,
    purchased_domain TEXT DEFAULT NULL,
    telnyx_phone_number VARCHAR(32) DEFAULT NULL,
    error_count INT NOT NULL DEFAULT 0,
    last_scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_targets_state ON public.discovery_targets(automation_state);
CREATE INDEX idx_targets_priority ON public.discovery_targets(priority_rank);
CREATE INDEX idx_targets_value ON public.discovery_targets(commercial_value_score);

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_discovery_targets_modtime
    BEFORE UPDATE ON public.discovery_targets
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();
`;