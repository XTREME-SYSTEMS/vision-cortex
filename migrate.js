const { Client } = require('pg');

const SQL_SCHEMA = `
-- Vision Cortex Entity Schema
CREATE TABLE IF NOT EXISTS ideas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  one_liner TEXT, industry TEXT, sub_industry TEXT,
  problem TEXT, solution TEXT, target_users TEXT,
  monetization TEXT[], tech_stack TEXT[], automation_plan TEXT,
  moat TEXT, hidden_opportunity TEXT,
  launch_cost_usd NUMERIC, est_monthly_profit_usd NUMERIC,
  est_annual_revenue_usd NUMERIC, time_to_launch_days INTEGER,
  probability_of_success NUMERIC, score NUMERIC, rank INTEGER,
  stage TEXT DEFAULT 'discovered', discovered_by TEXT,
  source_urls TEXT[], risks TEXT[], investor_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS agent_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, codename TEXT, role TEXT, archetype TEXT,
  mission TEXT, personality TEXT, intelligence_profile TEXT,
  accent TEXT, cadence TEXT, capabilities TEXT[], tools TEXT[],
  status TEXT DEFAULT 'active', health NUMERIC DEFAULT 100,
  tasks_completed INTEGER DEFAULT 0, inf_balance NUMERIC DEFAULT 0,
  inf_earned_total NUMERIC DEFAULT 0, rank INTEGER DEFAULT 0,
  wallet_address TEXT, slot_id TEXT, strike_count INTEGER DEFAULT 0,
  last_run TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL, level TEXT DEFAULT 'info',
  category TEXT, message TEXT NOT NULL, detail TEXT,
  auto_action TEXT, resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author TEXT NOT NULL, author_type TEXT DEFAULT 'agent',
  content TEXT NOT NULL, kind TEXT DEFAULT 'message', accent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS intel_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL, headline TEXT NOT NULL, summary TEXT,
  source TEXT, url TEXT, signals TEXT[], correlations TEXT[],
  region TEXT, impact_score NUMERIC DEFAULT 0,
  source_agent TEXT, assigned_agent TEXT,
  drive_folder_id TEXT, drive_organized BOOLEAN DEFAULT false,
  file_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day INTEGER, asset TEXT NOT NULL, direction TEXT DEFAULT 'long',
  thesis TEXT, confidence NUMERIC, accuracy_drivers TEXT[],
  shadow_intel_sources TEXT[], council_directive TEXT,
  position_size_usd NUMERIC, entry_price NUMERIC, exit_price NUMERIC,
  pnl_usd NUMERIC, pnl_pct NUMERIC, target_return_pct NUMERIC,
  price_source TEXT, price_estimated BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'open',
  portfolio_value_before NUMERIC, portfolio_value_after NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, cash_balance NUMERIC DEFAULT 0,
  positions_value NUMERIC DEFAULT 0, total_value NUMERIC DEFAULT 0,
  starting_value NUMERIC, peak_value NUMERIC,
  day INTEGER DEFAULT 0, consecutive_wins INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS doctrines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL, insight TEXT NOT NULL,
  category TEXT DEFAULT 'tactic', source TEXT,
  confidence NUMERIC, weight NUMERIC DEFAULT 1,
  validated BOOLEAN DEFAULT false, validation_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS governance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article TEXT NOT NULL, principle TEXT NOT NULL,
  category TEXT DEFAULT 'charter', enforcement TEXT, rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS vision_pipelines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vision_statement TEXT NOT NULL, user_id TEXT,
  stage TEXT DEFAULT 'vision', status TEXT DEFAULT 'active',
  autonomous BOOLEAN DEFAULT true, strategies JSONB, simulations JSONB,
  recommendation JSONB, tech_research JSONB, build_pack JSONB,
  build_queue_id TEXT, provision_status JSONB, clone_status JSONB,
  agent_assignments JSONB, validation_scores JSONB, logs TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS build_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL, idea_id TEXT, stage TEXT DEFAULT 'queued',
  status TEXT DEFAULT 'queued', priority INTEGER DEFAULT 3,
  assigned_agent TEXT, source TEXT DEFAULT 'manual',
  business_name TEXT, industry TEXT,
  product_type TEXT DEFAULT 'marketing_site',
  current_step TEXT DEFAULT 'profile', auto_advance BOOLEAN DEFAULT false,
  visited_steps TEXT[], logs TEXT[], notes TEXT,
  predicted_revenue_monthly NUMERIC, actual_revenue NUMERIC,
  stripe_payment_link TEXT, stripe_product_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS system_enhancements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL, description TEXT,
  category TEXT DEFAULT 'feature', status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 3, source TEXT DEFAULT 'autonomous',
  existing_system TEXT, downfall TEXT, recommended_enhancement TEXT,
  implementation_plan TEXT, implementation_code TEXT,
  implementation_notes TEXT, technical_protocols TEXT[],
  surround_enhancements TEXT[], web_search_sources TEXT[],
  build_order_step TEXT, approved BOOLEAN DEFAULT false,
  audit_result JSONB, fix_attempts INTEGER DEFAULT 0,
  max_fix_attempts INTEGER DEFAULT 3, blocked_reason TEXT,
  last_action_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctrines ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_enhancements ENABLE ROW LEVEL SECURITY;
-- Public read policies
CREATE POLICY IF NOT EXISTS "Public read ideas" ON ideas FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read agent_profiles" ON agent_profiles FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read agent_logs" ON agent_logs FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read chat_messages" ON chat_messages FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read intel_feed" ON intel_feed FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read doctrines" ON doctrines FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read governance" ON governance FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read vision_pipelines" ON vision_pipelines FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read build_queue" ON build_queue FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read system_enhancements" ON system_enhancements FOR SELECT USING (true);
-- Update trigger
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER IF NOT EXISTS update_ideas_updated_at BEFORE UPDATE ON ideas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER IF NOT EXISTS update_agent_profiles_updated_at BEFORE UPDATE ON agent_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER IF NOT EXISTS update_vision_pipelines_updated_at BEFORE UPDATE ON vision_pipelines FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER IF NOT EXISTS update_build_queue_updated_at BEFORE UPDATE ON build_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER IF NOT EXISTS update_system_enhancements_updated_at BEFORE UPDATE ON system_enhancements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
`;

async function runMigration() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL or SUPABASE_DB_URL not set');
    process.exit(1);
  }
  console.log('Connecting to Supabase Postgres...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected. Executing schema migration...');
    await client.query(SQL_SCHEMA);
    console.log('SUCCESS: All 13 tables created with RLS policies and triggers.');
    // Verify tables exist
    const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;");
    console.log('Tables in database:', res.rows.map(r => r.tablename).join(', '));
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();