-- ============================================================================
-- Vision Cortex — Credit-Free Autonomous Loop Tables
-- Run in Supabase SQL Editor. These tables back the Vercel-cron-driven
-- autonomous loop that runs entirely on Vercel + Supabase + Groq — zero Base44
-- credits consumed.
-- ============================================================================

-- Task queue — mirrors the AgentSchedule entity. The Vercel cron picks the
-- highest-priority scheduled task, runs it through Groq, and marks it done.
CREATE TABLE IF NOT EXISTS agent_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL,
  task_title TEXT NOT NULL,
  task_description TEXT,
  task_category TEXT DEFAULT 'manage',
  system_target TEXT,
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'scheduled',
  scheduled_start TIMESTAMPTZ DEFAULT NOW(),
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  duration_minutes INTEGER,
  progress INTEGER DEFAULT 0,
  result TEXT,
  payment_amount NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent logs — mirrors AgentLog. Every cycle step writes a log row.
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL,
  level TEXT DEFAULT 'info',
  category TEXT,
  message TEXT NOT NULL,
  detail TEXT,
  auto_action TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deep runs — mirrors DeepRun. One row per completed cycle for traceability.
CREATE TABLE IF NOT EXISTS deep_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id TEXT NOT NULL,
  task_id UUID REFERENCES agent_schedule(id),
  spec_version TEXT DEFAULT '1.0.0',
  status TEXT DEFAULT 'pending',
  lifecycle_stage TEXT DEFAULT 'execute',
  states_executed JSONB DEFAULT '[]',
  aggregate_score NUMERIC DEFAULT 0,
  is_approved BOOLEAN DEFAULT false,
  severity TEXT DEFAULT 'PASS',
  failed_states TEXT[] DEFAULT '{}',
  errors TEXT[] DEFAULT '{}',
  triggered_by TEXT DEFAULT 'vercel-cron',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loop state — single-row table tracking the overall autonomous loop health.
CREATE TABLE IF NOT EXISTS loop_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_cycle_at TIMESTAMPTZ,
  last_task_title TEXT,
  last_score NUMERIC,
  last_status TEXT,
  total_cycles INTEGER DEFAULT 0,
  total_approved INTEGER DEFAULT 0,
  avg_score NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO loop_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Enable RLS + public read (the Base44 frontend reads these without auth)
ALTER TABLE agent_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deep_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loop_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read agent_schedule" ON agent_schedule FOR SELECT USING (true);
CREATE POLICY "Public read agent_logs" ON agent_logs FOR SELECT USING (true);
CREATE POLICY "Public read deep_runs" ON deep_runs FOR SELECT USING (true);
CREATE POLICY "Public read loop_state" ON loop_state FOR SELECT USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_loop_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_schedule_updated_at
  BEFORE UPDATE ON agent_schedule
  FOR EACH ROW EXECUTE FUNCTION update_loop_updated_at();

CREATE TRIGGER update_loop_state_updated_at
  BEFORE UPDATE ON loop_state
  FOR EACH ROW EXECUTE FUNCTION update_loop_updated_at();

-- Index for fast "pick next task" queries
CREATE INDEX IF NOT EXISTS idx_agent_schedule_status_priority
  ON agent_schedule (status, priority, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at
  ON agent_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deep_runs_created_at
  ON deep_runs (created_at DESC);