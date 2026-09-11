-- Vision Cortex — hardened initial schema
-- Generated from 84 entity definitions. Idempotent-ish; safe to run on empty project.
create extension if not exists pgcrypto;

-- updated_date trigger
create or replace function public.set_updated_date() returns trigger as $$
begin new.updated_date = now(); return new; end;
$$ language plpgsql;

create table if not exists public."AgentAward" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "agent_name" text,
  "award_type" text default 'bonus',
  "title" text,
  "reason" text,
  "evidence" text,
  "bonus_points" double precision default 0,
  "ceremony_month" text,
  "letter_content" text,
  "awarded_at" text
);
drop trigger if exists trg_updated on public."AgentAward";
create trigger trg_updated before update on public."AgentAward" for each row execute function public.set_updated_date();
alter table public."AgentAward" enable row level security;
drop policy if exists own_rows_select on public."AgentAward";
create policy own_rows_select on public."AgentAward" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."AgentAward";
create policy own_rows_insert on public."AgentAward" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."AgentAward";
create policy own_rows_update on public."AgentAward" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."AgentAward";
create policy own_rows_delete on public."AgentAward" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."AgentLog" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "agent_name" text,
  "level" text default 'info',
  "category" text,
  "message" text,
  "detail" text,
  "auto_action" text,
  "resolved" boolean default false
);
drop trigger if exists trg_updated on public."AgentLog";
create trigger trg_updated before update on public."AgentLog" for each row execute function public.set_updated_date();
alter table public."AgentLog" enable row level security;
drop policy if exists own_rows_select on public."AgentLog";
create policy own_rows_select on public."AgentLog" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."AgentLog";
create policy own_rows_insert on public."AgentLog" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."AgentLog";
create policy own_rows_update on public."AgentLog" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."AgentLog";
create policy own_rows_delete on public."AgentLog" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."AgentPayment" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "agent_name" text,
  "amount" double precision default 0,
  "payment_type" text default 'salary',
  "memo" text default '',
  "wallet_address" text,
  "validated" boolean default false,
  "validator_notes" text default ''
);
drop trigger if exists trg_updated on public."AgentPayment";
create trigger trg_updated before update on public."AgentPayment" for each row execute function public.set_updated_date();
alter table public."AgentPayment" enable row level security;
drop policy if exists own_rows_select on public."AgentPayment";
create policy own_rows_select on public."AgentPayment" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."AgentPayment";
create policy own_rows_insert on public."AgentPayment" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."AgentPayment";
create policy own_rows_update on public."AgentPayment" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."AgentPayment";
create policy own_rows_delete on public."AgentPayment" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."AgentProfile" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "name" text,
  "codename" text,
  "role" text,
  "mission" text,
  "personality" text,
  "intelligence_profile" text,
  "cadence" text,
  "capabilities" jsonb,
  "tools" jsonb,
  "status" text default 'active',
  "health" double precision,
  "tasks_completed" double precision,
  "last_run" text,
  "accent" text,
  "order" double precision,
  "archetype" text,
  "slot_id" text,
  "wallet_address" text,
  "avatar_url" text,
  "strike_count" double precision default 0,
  "strikes" jsonb,
  "inf_balance" double precision default 0,
  "inf_earned_total" double precision default 0,
  "rank" double precision default 0,
  "drive_folder_id" text
);
drop trigger if exists trg_updated on public."AgentProfile";
create trigger trg_updated before update on public."AgentProfile" for each row execute function public.set_updated_date();
alter table public."AgentProfile" enable row level security;
drop policy if exists own_rows_select on public."AgentProfile";
create policy own_rows_select on public."AgentProfile" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."AgentProfile";
create policy own_rows_insert on public."AgentProfile" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."AgentProfile";
create policy own_rows_update on public."AgentProfile" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."AgentProfile";
create policy own_rows_delete on public."AgentProfile" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."AgentSchedule" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "agent_name" text,
  "agent_codename" text,
  "task_title" text,
  "task_description" text,
  "task_category" text default 'other',
  "playbook_phase" text,
  "status" text default 'scheduled',
  "priority" double precision default 3,
  "scheduled_start" text,
  "scheduled_end" text,
  "actual_start" text,
  "actual_end" text,
  "duration_minutes" double precision default 0,
  "progress" double precision default 0,
  "result" text,
  "output_artifacts" jsonb,
  "payment_amount" double precision default 0,
  "payment_status" text default 'unpaid',
  "calendar_event_id" text,
  "calendar_event_url" text,
  "google_task_id" text,
  "task_list_id" text,
  "whatsapp_notified" boolean default false,
  "parent_task_id" text,
  "depends_on" jsonb,
  "system_target" text
);
drop trigger if exists trg_updated on public."AgentSchedule";
create trigger trg_updated before update on public."AgentSchedule" for each row execute function public.set_updated_date();
alter table public."AgentSchedule" enable row level security;
drop policy if exists own_rows_select on public."AgentSchedule";
create policy own_rows_select on public."AgentSchedule" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."AgentSchedule";
create policy own_rows_insert on public."AgentSchedule" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."AgentSchedule";
create policy own_rows_update on public."AgentSchedule" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."AgentSchedule";
create policy own_rows_delete on public."AgentSchedule" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."AgentScore" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "agent_name" text,
  "test_date" text,
  "score" double precision default 0,
  "max_score" double precision default 100,
  "tests_passed" double precision default 0,
  "tests_total" double precision default 0,
  "success_rate" double precision default 0,
  "failures" jsonb,
  "reflection" text,
  "capabilities_tested" jsonb,
  "proactive_actions" double precision default 0,
  "tasks_completed" double precision default 0,
  "rank" double precision
);
drop trigger if exists trg_updated on public."AgentScore";
create trigger trg_updated before update on public."AgentScore" for each row execute function public.set_updated_date();
alter table public."AgentScore" enable row level security;
drop policy if exists own_rows_select on public."AgentScore";
create policy own_rows_select on public."AgentScore" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."AgentScore";
create policy own_rows_insert on public."AgentScore" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."AgentScore";
create policy own_rows_update on public."AgentScore" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."AgentScore";
create policy own_rows_delete on public."AgentScore" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."AgentSettings" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "user_name" text,
  "about_user" text,
  "response_style" text,
  "personality_traits" jsonb,
  "conversation_rules" jsonb,
  "memory_enabled" boolean default true,
  "memories" jsonb,
  "voice" text default 'alloy',
  "tone" text default 'concise',
  "model" text default 'gpt-4o-realtime-preview',
  "auto_submit_voice" boolean default false,
  "language" text default 'en',
  "temperature" double precision default 0.7,
  "xtreme_comms_from_number" text,
  "xtreme_comms_from_email" text
);
drop trigger if exists trg_updated on public."AgentSettings";
create trigger trg_updated before update on public."AgentSettings" for each row execute function public.set_updated_date();
alter table public."AgentSettings" enable row level security;
drop policy if exists own_rows_select on public."AgentSettings";
create policy own_rows_select on public."AgentSettings" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."AgentSettings";
create policy own_rows_insert on public."AgentSettings" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."AgentSettings";
create policy own_rows_update on public."AgentSettings" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."AgentSettings";
create policy own_rows_delete on public."AgentSettings" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."ApiKey" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "name" text,
  "key_hash" text,
  "key_preview" text,
  "prefix" text default 'vc',
  "category" text,
  "vault_entry_id" text,
  "assigned_to" text,
  "status" text default 'active',
  "permissions" jsonb,
  "scopes" jsonb,
  "rate_limit" double precision default 1000,
  "expires_at" text,
  "last_used" text,
  "last_used_ip" text,
  "last_rotated" text,
  "rotation_count" double precision default 0,
  "usage_count" double precision default 0,
  "notes" text default ''
);
drop trigger if exists trg_updated on public."ApiKey";
create trigger trg_updated before update on public."ApiKey" for each row execute function public.set_updated_date();
alter table public."ApiKey" enable row level security;
drop policy if exists own_rows_select on public."ApiKey";
create policy own_rows_select on public."ApiKey" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."ApiKey";
create policy own_rows_insert on public."ApiKey" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."ApiKey";
create policy own_rows_update on public."ApiKey" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."ApiKey";
create policy own_rows_delete on public."ApiKey" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."ArchitecturalDocument" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "title" text,
  "doc_type" text default 'implementation_plan',
  "target_system" text,
  "content" text,
  "implementation_code" text,
  "status" text default 'draft',
  "cycle_id" text,
  "priority" double precision default 3,
  "validation_score" double precision default 0,
  "validation_failures" jsonb,
  "fix_attempts" double precision default 0,
  "hardening_notes" text,
  "optimization_notes" text
);
drop trigger if exists trg_updated on public."ArchitecturalDocument";
create trigger trg_updated before update on public."ArchitecturalDocument" for each row execute function public.set_updated_date();
alter table public."ArchitecturalDocument" enable row level security;
drop policy if exists own_rows_select on public."ArchitecturalDocument";
create policy own_rows_select on public."ArchitecturalDocument" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."ArchitecturalDocument";
create policy own_rows_insert on public."ArchitecturalDocument" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."ArchitecturalDocument";
create policy own_rows_update on public."ArchitecturalDocument" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."ArchitecturalDocument";
create policy own_rows_delete on public."ArchitecturalDocument" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."AutoBuild" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "business_name" text,
  "industry" text,
  "product_type" text default 'marketing_site',
  "profile" jsonb,
  "vision" jsonb,
  "strategy" jsonb,
  "current_step" text default 'profile',
  "status" text default 'queued',
  "auto_advance" boolean default false,
  "visited_steps" jsonb,
  "logs" jsonb,
  "generated_assets" jsonb,
  "deploy_url" text,
  "error_message" text
);
drop trigger if exists trg_updated on public."AutoBuild";
create trigger trg_updated before update on public."AutoBuild" for each row execute function public.set_updated_date();
alter table public."AutoBuild" enable row level security;
drop policy if exists own_rows_select on public."AutoBuild";
create policy own_rows_select on public."AutoBuild" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."AutoBuild";
create policy own_rows_insert on public."AutoBuild" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."AutoBuild";
create policy own_rows_update on public."AutoBuild" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."AutoBuild";
create policy own_rows_delete on public."AutoBuild" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."AutonomousCycle" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "cycle_id" text,
  "status" text default 'running',
  "phase" text default 'forensic_audit',
  "items_audited" double precision default 0,
  "items_identified" double precision default 0,
  "items_architected" double precision default 0,
  "items_implemented" double precision default 0,
  "items_validated" double precision default 0,
  "items_hardened" double precision default 0,
  "items_optimized" double precision default 0,
  "items_pushed" double precision default 0,
  "health_before" double precision default 0,
  "health_after" double precision default 0,
  "reflection" text,
  "priorities" jsonb,
  "errors" jsonb,
  "started_at" text,
  "completed_at" text,
  "summary" text
);
drop trigger if exists trg_updated on public."AutonomousCycle";
create trigger trg_updated before update on public."AutonomousCycle" for each row execute function public.set_updated_date();
alter table public."AutonomousCycle" enable row level security;
drop policy if exists own_rows_select on public."AutonomousCycle";
create policy own_rows_select on public."AutonomousCycle" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."AutonomousCycle";
create policy own_rows_insert on public."AutonomousCycle" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."AutonomousCycle";
create policy own_rows_update on public."AutonomousCycle" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."AutonomousCycle";
create policy own_rows_delete on public."AutonomousCycle" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."BrainCommand" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "command_type" text,
  "status" text default 'pending',
  "payload" jsonb,
  "result" text,
  "processed_at" text,
  "received_at" text
);
drop trigger if exists trg_updated on public."BrainCommand";
create trigger trg_updated before update on public."BrainCommand" for each row execute function public.set_updated_date();
alter table public."BrainCommand" enable row level security;
drop policy if exists own_rows_select on public."BrainCommand";
create policy own_rows_select on public."BrainCommand" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."BrainCommand";
create policy own_rows_insert on public."BrainCommand" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."BrainCommand";
create policy own_rows_update on public."BrainCommand" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."BrainCommand";
create policy own_rows_delete on public."BrainCommand" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."BrainSyncLog" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "direction" text,
  "operation" text,
  "status" text default 'pending',
  "items_count" double precision default 0,
  "details" text,
  "brain_url" text,
  "response_code" double precision,
  "batch_id" text
);
drop trigger if exists trg_updated on public."BrainSyncLog";
create trigger trg_updated before update on public."BrainSyncLog" for each row execute function public.set_updated_date();
alter table public."BrainSyncLog" enable row level security;
drop policy if exists own_rows_select on public."BrainSyncLog";
create policy own_rows_select on public."BrainSyncLog" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."BrainSyncLog";
create policy own_rows_insert on public."BrainSyncLog" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."BrainSyncLog";
create policy own_rows_update on public."BrainSyncLog" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."BrainSyncLog";
create policy own_rows_delete on public."BrainSyncLog" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."BrowserEngineFleet" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "engine_id" text,
  "name" text,
  "url" text,
  "api_key_secret" text,
  "provider" text default 'railway',
  "region" text,
  "priority" double precision default 10,
  "role" text default 'backup',
  "status" text default 'offline',
  "health_score" double precision default 0,
  "capabilities" jsonb,
  "max_concurrent_sessions" double precision default 5,
  "active_sessions" double precision default 0,
  "total_requests" double precision default 0,
  "total_failures" double precision default 0,
  "success_rate" double precision default 0,
  "avg_latency_ms" double precision default 0,
  "uptime_started" text,
  "last_health_check" text,
  "last_failure" text,
  "last_failure_reason" text,
  "consecutive_failures" double precision default 0,
  "auto_restart" boolean default true,
  "restart_count" double precision default 0,
  "max_restarts" double precision default 5,
  "last_restart" text,
  "proxy_pool_config" jsonb,
  "anti_detection" jsonb,
  "notes" text
);
drop trigger if exists trg_updated on public."BrowserEngineFleet";
create trigger trg_updated before update on public."BrowserEngineFleet" for each row execute function public.set_updated_date();
alter table public."BrowserEngineFleet" enable row level security;
drop policy if exists own_rows_select on public."BrowserEngineFleet";
create policy own_rows_select on public."BrowserEngineFleet" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."BrowserEngineFleet";
create policy own_rows_insert on public."BrowserEngineFleet" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."BrowserEngineFleet";
create policy own_rows_update on public."BrowserEngineFleet" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."BrowserEngineFleet";
create policy own_rows_delete on public."BrowserEngineFleet" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."BuildQueue" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "title" text,
  "idea_id" text,
  "stage" text default 'queued',
  "priority" double precision default 3,
  "assigned_agent" text,
  "source" text default 'manual',
  "notes" text,
  "business_name" text,
  "industry" text,
  "product_type" text default 'marketing_site',
  "current_step" text default 'profile',
  "status" text default 'queued',
  "auto_advance" boolean default false,
  "visited_steps" jsonb,
  "logs" jsonb,
  "stripe_product_id" text,
  "stripe_payment_link" text,
  "predicted_revenue_monthly" double precision,
  "actual_revenue" double precision
);
drop trigger if exists trg_updated on public."BuildQueue";
create trigger trg_updated before update on public."BuildQueue" for each row execute function public.set_updated_date();
alter table public."BuildQueue" enable row level security;
drop policy if exists own_rows_select on public."BuildQueue";
create policy own_rows_select on public."BuildQueue" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."BuildQueue";
create policy own_rows_insert on public."BuildQueue" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."BuildQueue";
create policy own_rows_update on public."BuildQueue" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."BuildQueue";
create policy own_rows_delete on public."BuildQueue" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."CallRecording" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "recording_id" text,
  "call_control_id" text,
  "call_session_id" text,
  "from_number" text,
  "to_number" text,
  "company" text default 'unknown',
  "duration_secs" double precision default 0,
  "recording_url" text,
  "transcript" text,
  "status" text default 'pending',
  "validation" jsonb,
  "contact_id" text,
  "campaign_id" text,
  "validated_at" text,
  "error_message" text
);
drop trigger if exists trg_updated on public."CallRecording";
create trigger trg_updated before update on public."CallRecording" for each row execute function public.set_updated_date();
alter table public."CallRecording" enable row level security;
drop policy if exists own_rows_select on public."CallRecording";
create policy own_rows_select on public."CallRecording" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."CallRecording";
create policy own_rows_insert on public."CallRecording" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."CallRecording";
create policy own_rows_update on public."CallRecording" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."CallRecording";
create policy own_rows_delete on public."CallRecording" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."CapabilityMatrix" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "system" text,
  "module" text,
  "capability" text,
  "category" text default 'core',
  "benchmark_reference" text,
  "benchmark_state" text,
  "current_state" text,
  "implemented" boolean default false,
  "tested" boolean default false,
  "score" double precision default 0,
  "hardened" boolean default false,
  "launch_ready" boolean default false,
  "optimized" boolean default false,
  "enhanced" boolean default false,
  "gap_severity" text default 'high',
  "gap_description" text,
  "last_audited_at" text
);
drop trigger if exists trg_updated on public."CapabilityMatrix";
create trigger trg_updated before update on public."CapabilityMatrix" for each row execute function public.set_updated_date();
alter table public."CapabilityMatrix" enable row level security;
drop policy if exists own_rows_select on public."CapabilityMatrix";
create policy own_rows_select on public."CapabilityMatrix" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."CapabilityMatrix";
create policy own_rows_insert on public."CapabilityMatrix" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."CapabilityMatrix";
create policy own_rows_update on public."CapabilityMatrix" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."CapabilityMatrix";
create policy own_rows_delete on public."CapabilityMatrix" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."CapabilityToggle" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "capability_id" text,
  "name" text,
  "description" text,
  "category" text,
  "enabled" boolean default false,
  "agent_names" jsonb,
  "config" jsonb,
  "requires_approval" boolean default false,
  "last_toggled_by" text,
  "last_toggled_at" text,
  "icon" text default 'Cpu'
);
drop trigger if exists trg_updated on public."CapabilityToggle";
create trigger trg_updated before update on public."CapabilityToggle" for each row execute function public.set_updated_date();
alter table public."CapabilityToggle" enable row level security;
drop policy if exists own_rows_select on public."CapabilityToggle";
create policy own_rows_select on public."CapabilityToggle" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."CapabilityToggle";
create policy own_rows_insert on public."CapabilityToggle" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."CapabilityToggle";
create policy own_rows_update on public."CapabilityToggle" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."CapabilityToggle";
create policy own_rows_delete on public."CapabilityToggle" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."ChatMessage" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "author" text,
  "author_type" text default 'agent',
  "content" text,
  "kind" text default 'message',
  "accent" text
);
drop trigger if exists trg_updated on public."ChatMessage";
create trigger trg_updated before update on public."ChatMessage" for each row execute function public.set_updated_date();
alter table public."ChatMessage" enable row level security;
drop policy if exists own_rows_select on public."ChatMessage";
create policy own_rows_select on public."ChatMessage" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."ChatMessage";
create policy own_rows_insert on public."ChatMessage" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."ChatMessage";
create policy own_rows_update on public."ChatMessage" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."ChatMessage";
create policy own_rows_delete on public."ChatMessage" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."CloneJob" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "target_url" text,
  "site_name" text,
  "industry" text default 'Uncategorized',
  "priority" text default 'medium',
  "status" text default 'queued',
  "source" text default 'manual',
  "clone_progress" double precision default 0,
  "parity_score" double precision default 0,
  "visual_parity" double precision default 0,
  "operational_parity" double precision default 0,
  "content_parity" double precision default 0,
  "validation_results" jsonb,
  "retry_count" double precision default 0,
  "max_retries" double precision default 10,
  "template_id" text,
  "clone_spec" jsonb,
  "rebrand_status" text default 'pending',
  "provision_status" text default 'pending',
  "provision_targets" jsonb,
  "error_message" text,
  "logs" jsonb
);
drop trigger if exists trg_updated on public."CloneJob";
create trigger trg_updated before update on public."CloneJob" for each row execute function public.set_updated_date();
alter table public."CloneJob" enable row level security;
drop policy if exists own_rows_select on public."CloneJob";
create policy own_rows_select on public."CloneJob" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."CloneJob";
create policy own_rows_insert on public."CloneJob" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."CloneJob";
create policy own_rows_update on public."CloneJob" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."CloneJob";
create policy own_rows_delete on public."CloneJob" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."CloneRebrandAsset" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "clone_job_id" text,
  "template_id" text,
  "asset_type" text,
  "original_url" text,
  "original_content" text,
  "description" text,
  "location" text,
  "severity" text default 'warning',
  "must_change" boolean default true,
  "legal_reason" text,
  "revisions" jsonb,
  "approved_revision_index" double precision default -1,
  "status" text default 'pending'
);
drop trigger if exists trg_updated on public."CloneRebrandAsset";
create trigger trg_updated before update on public."CloneRebrandAsset" for each row execute function public.set_updated_date();
alter table public."CloneRebrandAsset" enable row level security;
drop policy if exists own_rows_select on public."CloneRebrandAsset";
create policy own_rows_select on public."CloneRebrandAsset" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."CloneRebrandAsset";
create policy own_rows_insert on public."CloneRebrandAsset" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."CloneRebrandAsset";
create policy own_rows_update on public."CloneRebrandAsset" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."CloneRebrandAsset";
create policy own_rows_delete on public."CloneRebrandAsset" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."CloneTemplate" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "name" text,
  "source_url" text,
  "industry" text default 'Uncategorized',
  "description" text,
  "frontend_spec" jsonb,
  "backend_spec" jsonb,
  "content_map" jsonb,
  "parity_score" double precision default 0,
  "visual_parity" double precision default 0,
  "operational_parity" double precision default 0,
  "content_parity" double precision default 0,
  "uncloneable_items" jsonb,
  "inferred_items" jsonb,
  "status" text default 'validated',
  "clone_job_id" text,
  "rebrand_completed" boolean default false,
  "provisioned" boolean default false,
  "tags" jsonb
);
drop trigger if exists trg_updated on public."CloneTemplate";
create trigger trg_updated before update on public."CloneTemplate" for each row execute function public.set_updated_date();
alter table public."CloneTemplate" enable row level security;
drop policy if exists own_rows_select on public."CloneTemplate";
create policy own_rows_select on public."CloneTemplate" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."CloneTemplate";
create policy own_rows_insert on public."CloneTemplate" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."CloneTemplate";
create policy own_rows_update on public."CloneTemplate" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."CloneTemplate";
create policy own_rows_delete on public."CloneTemplate" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."ColorChart" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "name" text,
  "hex_code" text,
  "rgb" text,
  "category" text default 'solid',
  "system_compatibility" jsonb,
  "image_url" text,
  "premium" boolean default false,
  "price_modifier" double precision default 0,
  "active" boolean default true
);
drop trigger if exists trg_updated on public."ColorChart";
create trigger trg_updated before update on public."ColorChart" for each row execute function public.set_updated_date();
alter table public."ColorChart" enable row level security;
drop policy if exists own_rows_select on public."ColorChart";
create policy own_rows_select on public."ColorChart" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."ColorChart";
create policy own_rows_insert on public."ColorChart" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."ColorChart";
create policy own_rows_update on public."ColorChart" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."ColorChart";
create policy own_rows_delete on public."ColorChart" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."CommunicationTemplate" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "industry" text default 'universal',
  "channel" text default 'universal',
  "situation" text default 'sales',
  "tone" text default 'professional',
  "gender_preference" text default 'neutral',
  "persona_id" text,
  "template_body" text,
  "psychology_notes" text,
  "high_response_words" jsonb,
  "words_to_avoid" jsonb,
  "effectiveness_score" double precision default 0,
  "target_audience" text,
  "compliance_notes" text,
  "active" boolean default true
);
drop trigger if exists trg_updated on public."CommunicationTemplate";
create trigger trg_updated before update on public."CommunicationTemplate" for each row execute function public.set_updated_date();
alter table public."CommunicationTemplate" enable row level security;
drop policy if exists own_rows_select on public."CommunicationTemplate";
create policy own_rows_select on public."CommunicationTemplate" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."CommunicationTemplate";
create policy own_rows_insert on public."CommunicationTemplate" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."CommunicationTemplate";
create policy own_rows_update on public."CommunicationTemplate" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."CommunicationTemplate";
create policy own_rows_delete on public."CommunicationTemplate" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."CompanyIntel" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "company_key" text,
  "company_name" text,
  "website_url" text,
  "domain" text,
  "tagline" text,
  "about_content" text,
  "description" text,
  "services" jsonb,
  "value_proposition" text,
  "target_audience" text,
  "competitive_advantages" jsonb,
  "brand_colors" jsonb,
  "brand_voice" text,
  "products" jsonb,
  "equipment" jsonb,
  "social_profiles" jsonb,
  "social_content" jsonb,
  "web_mentions" jsonb,
  "sync_status" text default 'pending',
  "last_synced" text,
  "intel_score" double precision default 0
);
drop trigger if exists trg_updated on public."CompanyIntel";
create trigger trg_updated before update on public."CompanyIntel" for each row execute function public.set_updated_date();
alter table public."CompanyIntel" enable row level security;
drop policy if exists own_rows_select on public."CompanyIntel";
create policy own_rows_select on public."CompanyIntel" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."CompanyIntel";
create policy own_rows_insert on public."CompanyIntel" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."CompanyIntel";
create policy own_rows_update on public."CompanyIntel" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."CompanyIntel";
create policy own_rows_delete on public."CompanyIntel" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."ConnectedAccount" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "name" text,
  "account_type" text,
  "status" text default 'unknown',
  "health_score" double precision default 0,
  "last_check" text,
  "last_error" text default '',
  "details" jsonb,
  "auto_managed" boolean default true
);
drop trigger if exists trg_updated on public."ConnectedAccount";
create trigger trg_updated before update on public."ConnectedAccount" for each row execute function public.set_updated_date();
alter table public."ConnectedAccount" enable row level security;
drop policy if exists own_rows_select on public."ConnectedAccount";
create policy own_rows_select on public."ConnectedAccount" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."ConnectedAccount";
create policy own_rows_insert on public."ConnectedAccount" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."ConnectedAccount";
create policy own_rows_update on public."ConnectedAccount" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."ConnectedAccount";
create policy own_rows_delete on public."ConnectedAccount" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."CoreDocument" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "document_id" text,
  "title" text,
  "document_type" text,
  "category" text,
  "content" text,
  "version" text default '1.0.0',
  "parent_id" text,
  "dependencies" jsonb,
  "dependents" jsonb,
  "status" text default 'draft',
  "priority" text default 'standard',
  "last_evolved_at" text,
  "last_evolved_by" text,
  "evolution_count" double precision default 0,
  "validation_score" double precision default 0
);
drop trigger if exists trg_updated on public."CoreDocument";
create trigger trg_updated before update on public."CoreDocument" for each row execute function public.set_updated_date();
alter table public."CoreDocument" enable row level security;
drop policy if exists own_rows_select on public."CoreDocument";
create policy own_rows_select on public."CoreDocument" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."CoreDocument";
create policy own_rows_insert on public."CoreDocument" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."CoreDocument";
create policy own_rows_update on public."CoreDocument" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."CoreDocument";
create policy own_rows_delete on public."CoreDocument" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."CreativeAsset" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "type" text,
  "title" text,
  "content" text,
  "content_type" text default 'text',
  "company_name" text,
  "industry" text,
  "brand_colors" jsonb,
  "context" text,
  "target_audience" text,
  "tags" jsonb,
  "prompt_used" text
);
drop trigger if exists trg_updated on public."CreativeAsset";
create trigger trg_updated before update on public."CreativeAsset" for each row execute function public.set_updated_date();
alter table public."CreativeAsset" enable row level security;
drop policy if exists own_rows_select on public."CreativeAsset";
create policy own_rows_select on public."CreativeAsset" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."CreativeAsset";
create policy own_rows_insert on public."CreativeAsset" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."CreativeAsset";
create policy own_rows_update on public."CreativeAsset" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."CreativeAsset";
create policy own_rows_delete on public."CreativeAsset" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."CryptoWallet" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "label" text,
  "address" text,
  "wallet_type" text default 'ethereum',
  "balance" double precision default 0,
  "assigned_to" text,
  "active" boolean default true,
  "is_paper" boolean default true
);
drop trigger if exists trg_updated on public."CryptoWallet";
create trigger trg_updated before update on public."CryptoWallet" for each row execute function public.set_updated_date();
alter table public."CryptoWallet" enable row level security;
drop policy if exists own_rows_select on public."CryptoWallet";
create policy own_rows_select on public."CryptoWallet" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."CryptoWallet";
create policy own_rows_insert on public."CryptoWallet" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."CryptoWallet";
create policy own_rows_update on public."CryptoWallet" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."CryptoWallet";
create policy own_rows_delete on public."CryptoWallet" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."DeepRun" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "run_id" text,
  "spec_id" text,
  "spec_version" text,
  "status" text default 'running',
  "lifecycle_stage" text default 'validate',
  "states_executed" jsonb,
  "llm_slot_results" jsonb,
  "aggregate_score" double precision default 0,
  "is_approved" boolean default false,
  "severity" text default 'REPAIRABLE',
  "failed_states" jsonb,
  "errors" jsonb,
  "cost_credits_used" double precision default 0,
  "cost_within_budget" boolean default true,
  "triggered_by" text default 'cron',
  "replayable" boolean default true,
  "input_hash" text,
  "started_at" text,
  "completed_at" text,
  "duration_ms" double precision default 0
);
drop trigger if exists trg_updated on public."DeepRun";
create trigger trg_updated before update on public."DeepRun" for each row execute function public.set_updated_date();
alter table public."DeepRun" enable row level security;
drop policy if exists own_rows_select on public."DeepRun";
create policy own_rows_select on public."DeepRun" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."DeepRun";
create policy own_rows_insert on public."DeepRun" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."DeepRun";
create policy own_rows_update on public."DeepRun" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."DeepRun";
create policy own_rows_delete on public."DeepRun" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."DeepSpec" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "spec_id" text,
  "title" text,
  "version" text default '1.0.0',
  "spec_type" text default 'vision',
  "parent_spec_id" text,
  "lifecycle_stage" text default 'vision',
  "states" jsonb,
  "llm_slots" jsonb,
  "gates" jsonb,
  "score_target" double precision default 1.0,
  "cost_budget_credits" double precision default 0,
  "status" text default 'draft',
  "content" text,
  "description" text,
  "autonomous" boolean default true
);
drop trigger if exists trg_updated on public."DeepSpec";
create trigger trg_updated before update on public."DeepSpec" for each row execute function public.set_updated_date();
alter table public."DeepSpec" enable row level security;
drop policy if exists own_rows_select on public."DeepSpec";
create policy own_rows_select on public."DeepSpec" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."DeepSpec";
create policy own_rows_insert on public."DeepSpec" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."DeepSpec";
create policy own_rows_update on public."DeepSpec" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."DeepSpec";
create policy own_rows_delete on public."DeepSpec" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."Doctrine" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "topic" text,
  "insight" text,
  "category" text default 'tactic',
  "source" text,
  "confidence" double precision,
  "weight" double precision default 1,
  "validated" boolean default false,
  "validation_count" double precision default 0
);
drop trigger if exists trg_updated on public."Doctrine";
create trigger trg_updated before update on public."Doctrine" for each row execute function public.set_updated_date();
alter table public."Doctrine" enable row level security;
drop policy if exists own_rows_select on public."Doctrine";
create policy own_rows_select on public."Doctrine" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."Doctrine";
create policy own_rows_insert on public."Doctrine" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."Doctrine";
create policy own_rows_update on public."Doctrine" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."Doctrine";
create policy own_rows_delete on public."Doctrine" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."DocumentEvolution" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "event_id" text,
  "source_document_id" text,
  "source_document_title" text,
  "change_type" text default 'updated',
  "change_description" text,
  "cascaded_documents" jsonb,
  "cascaded_count" double precision default 0,
  "status" text default 'pending',
  "validation_score" double precision default 0,
  "agent_name" text default 'codex_keeper',
  "trigger" text default 'manual',
  "error" text,
  "started_at" text,
  "completed_at" text
);
drop trigger if exists trg_updated on public."DocumentEvolution";
create trigger trg_updated before update on public."DocumentEvolution" for each row execute function public.set_updated_date();
alter table public."DocumentEvolution" enable row level security;
drop policy if exists own_rows_select on public."DocumentEvolution";
create policy own_rows_select on public."DocumentEvolution" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."DocumentEvolution";
create policy own_rows_insert on public."DocumentEvolution" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."DocumentEvolution";
create policy own_rows_update on public."DocumentEvolution" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."DocumentEvolution";
create policy own_rows_delete on public."DocumentEvolution" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."EmailAccount" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "label" text,
  "email_address" text,
  "provider" text default 'gmail',
  "connection_type" text default 'connector',
  "connector_id" text,
  "status" text default 'pending',
  "capabilities" jsonb,
  "assigned_agents" jsonb,
  "assigned_vault_id" text,
  "imap_host" text,
  "imap_port" double precision default 993,
  "smtp_host" text,
  "smtp_port" double precision default 587,
  "last_sync" text,
  "last_error" text,
  "emails_sent" double precision default 0,
  "emails_received" double precision default 0,
  "is_default" boolean default false
);
drop trigger if exists trg_updated on public."EmailAccount";
create trigger trg_updated before update on public."EmailAccount" for each row execute function public.set_updated_date();
alter table public."EmailAccount" enable row level security;
drop policy if exists own_rows_select on public."EmailAccount";
create policy own_rows_select on public."EmailAccount" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."EmailAccount";
create policy own_rows_insert on public."EmailAccount" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."EmailAccount";
create policy own_rows_update on public."EmailAccount" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."EmailAccount";
create policy own_rows_delete on public."EmailAccount" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."FactoryProject" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "industry" text,
  "sub_industry" text,
  "business_name" text,
  "domain_url" text,
  "name_options" jsonb,
  "domain_options" jsonb,
  "target_locations" jsonb,
  "target_audience" text,
  "competitor_research" jsonb,
  "logos" jsonb,
  "selected_logo_index" double precision default -1,
  "brand_pack" jsonb,
  "website_config" jsonb,
  "viral_content" jsonb,
  "social_config" jsonb,
  "social_ai_state" jsonb,
  "stage" text default 'seeded',
  "quality_scores" jsonb,
  "batch_id" text,
  "deployed_url" text
);
drop trigger if exists trg_updated on public."FactoryProject";
create trigger trg_updated before update on public."FactoryProject" for each row execute function public.set_updated_date();
alter table public."FactoryProject" enable row level security;
drop policy if exists own_rows_select on public."FactoryProject";
create policy own_rows_select on public."FactoryProject" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."FactoryProject";
create policy own_rows_insert on public."FactoryProject" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."FactoryProject";
create policy own_rows_update on public."FactoryProject" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."FactoryProject";
create policy own_rows_delete on public."FactoryProject" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."FloorSystem" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "name" text,
  "category" text default 'epoxy',
  "description" text,
  "finish_type" text default 'flake',
  "coverage_rate_sqft_per_gal" double precision,
  "coats_required" integer default 2,
  "material_cost_per_gal" double precision,
  "material_cost_per_sqft" double precision,
  "labor_cost_per_sqft" double precision,
  "prep_cost_per_sqft" double precision,
  "total_cost_per_sqft" double precision,
  "timeline_days_per_1000sqft" double precision default 2,
  "color_options" jsonb,
  "durability_rating" text default 'high',
  "recommended_for" jsonb,
  "active" boolean default true
);
drop trigger if exists trg_updated on public."FloorSystem";
create trigger trg_updated before update on public."FloorSystem" for each row execute function public.set_updated_date();
alter table public."FloorSystem" enable row level security;
drop policy if exists own_rows_select on public."FloorSystem";
create policy own_rows_select on public."FloorSystem" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."FloorSystem";
create policy own_rows_insert on public."FloorSystem" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."FloorSystem";
create policy own_rows_update on public."FloorSystem" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."FloorSystem";
create policy own_rows_delete on public."FloorSystem" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."Gap" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "number" double precision,
  "title" text,
  "description" text,
  "category" text default 'other',
  "severity" text default 'medium',
  "recommendation" text,
  "implementation_steps" jsonb,
  "implementation_code" text,
  "affected_files" jsonb,
  "estimated_effort" text default 'medium',
  "status" text default 'open',
  "applied_at" text,
  "validation_result" jsonb
);
drop trigger if exists trg_updated on public."Gap";
create trigger trg_updated before update on public."Gap" for each row execute function public.set_updated_date();
alter table public."Gap" enable row level security;
drop policy if exists own_rows_select on public."Gap";
create policy own_rows_select on public."Gap" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."Gap";
create policy own_rows_insert on public."Gap" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."Gap";
create policy own_rows_update on public."Gap" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."Gap";
create policy own_rows_delete on public."Gap" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."Governance" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "article" text,
  "principle" text,
  "category" text default 'charter',
  "enforcement" text,
  "rank" double precision
);
drop trigger if exists trg_updated on public."Governance";
create trigger trg_updated before update on public."Governance" for each row execute function public.set_updated_date();
alter table public."Governance" enable row level security;
drop policy if exists own_rows_select on public."Governance";
create policy own_rows_select on public."Governance" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."Governance";
create policy own_rows_insert on public."Governance" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."Governance";
create policy own_rows_update on public."Governance" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."Governance";
create policy own_rows_delete on public."Governance" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."Idea" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "title" text,
  "one_liner" text,
  "industry" text,
  "sub_industry" text,
  "problem" text,
  "solution" text,
  "rank" double precision,
  "score" double precision,
  "probability_of_success" double precision,
  "launch_cost_usd" double precision,
  "est_monthly_profit_usd" double precision,
  "est_annual_revenue_usd" double precision,
  "time_to_launch_days" double precision,
  "target_users" text,
  "trend_signal" text,
  "automation_plan" text,
  "investor_notes" text,
  "moat" text,
  "hidden_opportunity" text,
  "branding" jsonb,
  "competitors" jsonb,
  "tech_stack" jsonb,
  "risks" jsonb,
  "monetization" jsonb,
  "source_urls" jsonb,
  "validation" jsonb,
  "stage" text default 'discovered',
  "discovered_by" text
);
drop trigger if exists trg_updated on public."Idea";
create trigger trg_updated before update on public."Idea" for each row execute function public.set_updated_date();
alter table public."Idea" enable row level security;
drop policy if exists own_rows_select on public."Idea";
create policy own_rows_select on public."Idea" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."Idea";
create policy own_rows_insert on public."Idea" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."Idea";
create policy own_rows_update on public."Idea" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."Idea";
create policy own_rows_delete on public."Idea" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."IntelFeed" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "category" text,
  "headline" text,
  "summary" text,
  "source" text,
  "url" text,
  "signals" jsonb,
  "correlations" jsonb,
  "region" text,
  "impact_score" double precision,
  "assigned_agent" text,
  "source_agent" text,
  "file_url" text,
  "drive_organized" boolean default false,
  "drive_folder_id" text
);
drop trigger if exists trg_updated on public."IntelFeed";
create trigger trg_updated before update on public."IntelFeed" for each row execute function public.set_updated_date();
alter table public."IntelFeed" enable row level security;
drop policy if exists own_rows_select on public."IntelFeed";
create policy own_rows_select on public."IntelFeed" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."IntelFeed";
create policy own_rows_insert on public."IntelFeed" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."IntelFeed";
create policy own_rows_update on public."IntelFeed" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."IntelFeed";
create policy own_rows_delete on public."IntelFeed" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."KnowledgeQuest" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "topic" text,
  "category" text default 'other',
  "question" text,
  "status" text default 'pending',
  "priority" double precision default 3,
  "depth" text default 'deep',
  "answer" text,
  "summary" text,
  "sources" jsonb,
  "perspectives" jsonb,
  "validated" boolean default false,
  "validation_notes" text,
  "word_count" double precision default 0,
  "researched_at" text,
  "completed_at" text,
  "autonomous" boolean default true,
  "archetype" text default 'obsessive_intelligence_seeker'
);
drop trigger if exists trg_updated on public."KnowledgeQuest";
create trigger trg_updated before update on public."KnowledgeQuest" for each row execute function public.set_updated_date();
alter table public."KnowledgeQuest" enable row level security;
drop policy if exists own_rows_select on public."KnowledgeQuest";
create policy own_rows_select on public."KnowledgeQuest" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."KnowledgeQuest";
create policy own_rows_insert on public."KnowledgeQuest" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."KnowledgeQuest";
create policy own_rows_update on public."KnowledgeQuest" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."KnowledgeQuest";
create policy own_rows_delete on public."KnowledgeQuest" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."LifePlan" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "user_id" text,
  "vision" text,
  "strategy" jsonb,
  "persona_id" text,
  "idea_id" text,
  "build_id" text,
  "horizon" text,
  "start_date" text,
  "end_date" text,
  "milestones" jsonb,
  "decision_points" jsonb,
  "life_events" jsonb,
  "target_final_net_worth" double precision,
  "calendar_synced" boolean default false,
  "calendar_event_ids" jsonb,
  "reality_log" jsonb,
  "calibration_score" double precision,
  "coach_enabled" boolean default true,
  "status" text default 'active'
);
drop trigger if exists trg_updated on public."LifePlan";
create trigger trg_updated before update on public."LifePlan" for each row execute function public.set_updated_date();
alter table public."LifePlan" enable row level security;
drop policy if exists own_rows_select on public."LifePlan";
create policy own_rows_select on public."LifePlan" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."LifePlan";
create policy own_rows_insert on public."LifePlan" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."LifePlan";
create policy own_rows_update on public."LifePlan" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."LifePlan";
create policy own_rows_delete on public."LifePlan" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."MasterBlueprint" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "title" text,
  "industry" text default 'epoxy_flooring_polished_concrete',
  "target_company" text,
  "executive_summary" text,
  "deep_audit_refactor" jsonb,
  "system_factory_architecture" jsonb,
  "digital_bid_system" jsonb,
  "lead_generation_system" jsonb,
  "seo_aeo_system" jsonb,
  "ai_agent_system" jsonb,
  "social_media_system" jsonb,
  "rebranding_plan" jsonb,
  "financial_intelligence" jsonb,
  "tone_enhancement_system" jsonb,
  "business_plan" jsonb,
  "financial_plan" jsonb,
  "pricing_plans" jsonb,
  "mass_production_plan" jsonb,
  "generator_app_optimization" jsonb,
  "implementation_roadmap" jsonb,
  "overall_summary" text,
  "generated_at" text
);
drop trigger if exists trg_updated on public."MasterBlueprint";
create trigger trg_updated before update on public."MasterBlueprint" for each row execute function public.set_updated_date();
alter table public."MasterBlueprint" enable row level security;
drop policy if exists own_rows_select on public."MasterBlueprint";
create policy own_rows_select on public."MasterBlueprint" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."MasterBlueprint";
create policy own_rows_insert on public."MasterBlueprint" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."MasterBlueprint";
create policy own_rows_update on public."MasterBlueprint" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."MasterBlueprint";
create policy own_rows_delete on public."MasterBlueprint" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."MasterPlan" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "title" text,
  "vision" text,
  "protocol" text,
  "architecture" text,
  "competitive_benchmarks" jsonb,
  "missions" jsonb,
  "current_phase" text default 'planning',
  "next_actions" jsonb,
  "status" text default 'planning',
  "autonomous" boolean default true
);
drop trigger if exists trg_updated on public."MasterPlan";
create trigger trg_updated before update on public."MasterPlan" for each row execute function public.set_updated_date();
alter table public."MasterPlan" enable row level security;
drop policy if exists own_rows_select on public."MasterPlan";
create policy own_rows_select on public."MasterPlan" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."MasterPlan";
create policy own_rows_insert on public."MasterPlan" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."MasterPlan";
create policy own_rows_update on public."MasterPlan" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."MasterPlan";
create policy own_rows_delete on public."MasterPlan" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."McpServer" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "name" text,
  "description" text,
  "server_id" text,
  "transport" text default 'http',
  "endpoint_url" text,
  "command" text,
  "args" jsonb,
  "env_vars" jsonb,
  "tools" jsonb,
  "status" text default 'draft',
  "auth_type" text default 'none',
  "auth_token_key" text,
  "connected_agent_names" jsonb,
  "last_tested" text,
  "last_test_result" text,
  "tool_count" double precision default 0
);
drop trigger if exists trg_updated on public."McpServer";
create trigger trg_updated before update on public."McpServer" for each row execute function public.set_updated_date();
alter table public."McpServer" enable row level security;
drop policy if exists own_rows_select on public."McpServer";
create policy own_rows_select on public."McpServer" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."McpServer";
create policy own_rows_insert on public."McpServer" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."McpServer";
create policy own_rows_update on public."McpServer" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."McpServer";
create policy own_rows_delete on public."McpServer" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."MonitoredSite" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "name" text,
  "url" text,
  "github_repo" text,
  "status" text default 'active',
  "audit_score" double precision default 0,
  "performance_score" double precision default 0,
  "seo_score" double precision default 0,
  "security_score" double precision default 0,
  "accessibility_score" double precision default 0,
  "content_score" double precision default 0,
  "issues" jsonb,
  "issues_count" double precision default 0,
  "critical_issues_count" double precision default 0,
  "last_audit_at" text,
  "last_action" text default '',
  "last_action_at" text,
  "last_action_summary" text
);
drop trigger if exists trg_updated on public."MonitoredSite";
create trigger trg_updated before update on public."MonitoredSite" for each row execute function public.set_updated_date();
alter table public."MonitoredSite" enable row level security;
drop policy if exists own_rows_select on public."MonitoredSite";
create policy own_rows_select on public."MonitoredSite" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."MonitoredSite";
create policy own_rows_insert on public."MonitoredSite" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."MonitoredSite";
create policy own_rows_update on public."MonitoredSite" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."MonitoredSite";
create policy own_rows_delete on public."MonitoredSite" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."Notification" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "kind" text default 'info',
  "title" text,
  "body" text,
  "severity" text default 'info',
  "read" boolean default false
);
drop trigger if exists trg_updated on public."Notification";
create trigger trg_updated before update on public."Notification" for each row execute function public.set_updated_date();
alter table public."Notification" enable row level security;
drop policy if exists own_rows_select on public."Notification";
create policy own_rows_select on public."Notification" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."Notification";
create policy own_rows_insert on public."Notification" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."Notification";
create policy own_rows_update on public."Notification" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."Notification";
create policy own_rows_delete on public."Notification" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."Opportunity" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "title" text,
  "source" text,
  "source_url" text,
  "description" text,
  "contact_name" text,
  "contact_email" text,
  "contact_phone" text,
  "location" text,
  "industry" text,
  "sub_industry" text,
  "budget" text,
  "keywords" jsonb,
  "research" jsonb,
  "research_status" text default 'pending',
  "response_draft" text,
  "response_subject" text,
  "response_status" text default 'pending',
  "follow_up_count" double precision default 0,
  "last_follow_up_at" text,
  "sent_at" text,
  "status" text default 'new',
  "validation_confidence" double precision default 0,
  "validation_reasoning" text,
  "score" double precision default 0,
  "scraped_at" text,
  "batch_id" text
);
drop trigger if exists trg_updated on public."Opportunity";
create trigger trg_updated before update on public."Opportunity" for each row execute function public.set_updated_date();
alter table public."Opportunity" enable row level security;
drop policy if exists own_rows_select on public."Opportunity";
create policy own_rows_select on public."Opportunity" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."Opportunity";
create policy own_rows_insert on public."Opportunity" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."Opportunity";
create policy own_rows_update on public."Opportunity" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."Opportunity";
create policy own_rows_delete on public."Opportunity" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."OutreachCampaign" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "name" text,
  "industry" text,
  "location" text,
  "keyword" text,
  "radius_miles" double precision default 50,
  "type" text default 'full_pipeline',
  "status" text default 'draft',
  "progress" double precision default 0,
  "total_leads" double precision default 0,
  "enriched_leads" double precision default 0,
  "audited_leads" double precision default 0,
  "messages_sent" double precision default 0,
  "calls_made" double precision default 0,
  "emails_sent" double precision default 0,
  "consultations_scheduled" double precision default 0,
  "from_number" text,
  "message_template" text,
  "hooks" jsonb,
  "max_daily_calls" double precision default 100,
  "batch_size" double precision default 50,
  "delay_between_sends_seconds" double precision default 3,
  "voice_agent" text default 'eden_skye',
  "autonomous" boolean default false,
  "schedule_cron" text,
  "lead_ids" jsonb,
  "contact_ids" jsonb,
  "results" jsonb,
  "started_at" text,
  "completed_at" text,
  "error_message" text
);
drop trigger if exists trg_updated on public."OutreachCampaign";
create trigger trg_updated before update on public."OutreachCampaign" for each row execute function public.set_updated_date();
alter table public."OutreachCampaign" enable row level security;
drop policy if exists own_rows_select on public."OutreachCampaign";
create policy own_rows_select on public."OutreachCampaign" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."OutreachCampaign";
create policy own_rows_insert on public."OutreachCampaign" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."OutreachCampaign";
create policy own_rows_update on public."OutreachCampaign" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."OutreachCampaign";
create policy own_rows_delete on public."OutreachCampaign" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."PcuDirectory" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "business_name" text,
  "contact_name" text,
  "email" text,
  "phone" text,
  "address" text,
  "city" text,
  "state" text,
  "zip" text,
  "website" text,
  "latitude" double precision,
  "longitude" double precision,
  "industry" text default 'polished_concrete',
  "services" jsonb,
  "certifications" jsonb,
  "years_in_business" double precision,
  "employee_count" double precision,
  "revenue_range" text,
  "social_profiles" jsonb,
  "rating" double precision default 0,
  "review_count" integer default 0,
  "enriched" boolean default false,
  "enrichment_data" jsonb,
  "status" text default 'new',
  "lead_id" text,
  "imported_at" text,
  "last_contacted" text,
  "tags" jsonb,
  "source" text default 'pcu_alumni'
);
drop trigger if exists trg_updated on public."PcuDirectory";
create trigger trg_updated before update on public."PcuDirectory" for each row execute function public.set_updated_date();
alter table public."PcuDirectory" enable row level security;
drop policy if exists own_rows_select on public."PcuDirectory";
create policy own_rows_select on public."PcuDirectory" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."PcuDirectory";
create policy own_rows_insert on public."PcuDirectory" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."PcuDirectory";
create policy own_rows_update on public."PcuDirectory" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."PcuDirectory";
create policy own_rows_delete on public."PcuDirectory" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."PcuLead" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "name" text,
  "email" text,
  "phone" text,
  "company" text,
  "address" text,
  "location" text,
  "industry" text default 'polished_concrete',
  "sqft" double precision,
  "floor_condition" text default 'unknown',
  "desired_finish" text default 'flake',
  "color_choice" text,
  "notes" text,
  "photo_urls" jsonb,
  "status" text default 'new',
  "source" text default 'scraper',
  "ai_analysis" jsonb,
  "bid" jsonb,
  "visualizer_url" text,
  "follow_up_count" double precision default 0,
  "next_follow_up" text,
  "last_contact" text,
  "last_contact_channel" text default 'none',
  "consultation_scheduled" text,
  "calendar_event_id" text,
  "campaign_id" text,
  "directory_id" text,
  "enriched" boolean default false,
  "enrichment_data" jsonb
);
drop trigger if exists trg_updated on public."PcuLead";
create trigger trg_updated before update on public."PcuLead" for each row execute function public.set_updated_date();
alter table public."PcuLead" enable row level security;
drop policy if exists own_rows_select on public."PcuLead";
create policy own_rows_select on public."PcuLead" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."PcuLead";
create policy own_rows_insert on public."PcuLead" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."PcuLead";
create policy own_rows_update on public."PcuLead" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."PcuLead";
create policy own_rows_delete on public."PcuLead" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."PersonaProfile" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "user_id" text,
  "vision" text,
  "archetype" text,
  "big_five" jsonb,
  "decision_style" text,
  "risk_tolerance" text default 'medium',
  "jobs_held" double precision,
  "longest_job_years" double precision,
  "relationship_status" text,
  "childhood" text,
  "education" text,
  "conditions" jsonb,
  "passions" jsonb,
  "skills" jsonb,
  "traumas" jsonb,
  "strengths" jsonb,
  "blind_spots" jsonb,
  "entrepreneur_fit" double precision,
  "answers" jsonb,
  "summary" text,
  "completed" boolean default false
);
drop trigger if exists trg_updated on public."PersonaProfile";
create trigger trg_updated before update on public."PersonaProfile" for each row execute function public.set_updated_date();
alter table public."PersonaProfile" enable row level security;
drop policy if exists own_rows_select on public."PersonaProfile";
create policy own_rows_select on public."PersonaProfile" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."PersonaProfile";
create policy own_rows_insert on public."PersonaProfile" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."PersonaProfile";
create policy own_rows_update on public."PersonaProfile" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."PersonaProfile";
create policy own_rows_delete on public."PersonaProfile" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."Plugin" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "plugin_id" text,
  "name" text,
  "description" text,
  "icon" text default 'Puzzle',
  "category" text default 'custom',
  "system_prompt" text,
  "capabilities" jsonb,
  "backend_function" text,
  "enabled" boolean default false,
  "is_builtin" boolean default false,
  "color" text default 'blue',
  "author" text default 'Vision Cortex',
  "version" text default '1.0.0'
);
drop trigger if exists trg_updated on public."Plugin";
create trigger trg_updated before update on public."Plugin" for each row execute function public.set_updated_date();
alter table public."Plugin" enable row level security;
drop policy if exists own_rows_select on public."Plugin";
create policy own_rows_select on public."Plugin" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."Plugin";
create policy own_rows_insert on public."Plugin" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."Plugin";
create policy own_rows_update on public."Plugin" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."Plugin";
create policy own_rows_delete on public."Plugin" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."Portfolio" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "name" text,
  "cash_balance" double precision,
  "positions_value" double precision,
  "total_value" double precision,
  "starting_value" double precision,
  "peak_value" double precision,
  "day" double precision,
  "consecutive_wins" double precision,
  "status" text default 'active'
);
drop trigger if exists trg_updated on public."Portfolio";
create trigger trg_updated before update on public."Portfolio" for each row execute function public.set_updated_date();
alter table public."Portfolio" enable row level security;
drop policy if exists own_rows_select on public."Portfolio";
create policy own_rows_select on public."Portfolio" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."Portfolio";
create policy own_rows_insert on public."Portfolio" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."Portfolio";
create policy own_rows_update on public."Portfolio" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."Portfolio";
create policy own_rows_delete on public."Portfolio" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."PricingRule" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "name" text,
  "rule_type" text default 'base_price',
  "region" text,
  "floor_category" text,
  "min_sqft" double precision,
  "max_sqft" double precision,
  "price_per_sqft" double precision,
  "adjustment_percent" double precision,
  "adjustment_amount" double precision,
  "floor_condition" text default 'any',
  "minimum_charge" double precision,
  "active" boolean default true,
  "notes" text
);
drop trigger if exists trg_updated on public."PricingRule";
create trigger trg_updated before update on public."PricingRule" for each row execute function public.set_updated_date();
alter table public."PricingRule" enable row level security;
drop policy if exists own_rows_select on public."PricingRule";
create policy own_rows_select on public."PricingRule" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."PricingRule";
create policy own_rows_insert on public."PricingRule" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."PricingRule";
create policy own_rows_update on public."PricingRule" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."PricingRule";
create policy own_rows_delete on public."PricingRule" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."ProjectFolder" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "name" text,
  "description" text default '',
  "color" text default 'blue'
);
drop trigger if exists trg_updated on public."ProjectFolder";
create trigger trg_updated before update on public."ProjectFolder" for each row execute function public.set_updated_date();
alter table public."ProjectFolder" enable row level security;
drop policy if exists own_rows_select on public."ProjectFolder";
create policy own_rows_select on public."ProjectFolder" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."ProjectFolder";
create policy own_rows_insert on public."ProjectFolder" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."ProjectFolder";
create policy own_rows_update on public."ProjectFolder" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."ProjectFolder";
create policy own_rows_delete on public."ProjectFolder" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."PromoCode" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "code" text,
  "description" text default '',
  "discount_type" text default 'percentage',
  "discount_value" double precision default 0,
  "max_uses" double precision default 0,
  "uses_count" double precision default 0,
  "expiry_date" text,
  "active" boolean default true,
  "assigned_to" text default ''
);
drop trigger if exists trg_updated on public."PromoCode";
create trigger trg_updated before update on public."PromoCode" for each row execute function public.set_updated_date();
alter table public."PromoCode" enable row level security;
drop policy if exists own_rows_select on public."PromoCode";
create policy own_rows_select on public."PromoCode" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."PromoCode";
create policy own_rows_insert on public."PromoCode" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."PromoCode";
create policy own_rows_update on public."PromoCode" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."PromoCode";
create policy own_rows_delete on public."PromoCode" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."PromptQueue" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "prompt_id" text,
  "prompt_name" text,
  "category" text,
  "target_function" text,
  "priority" text default 'medium',
  "status" text default 'queued',
  "cadence_hours" double precision default 24,
  "last_run_at" text,
  "next_run_at" text,
  "last_result" text,
  "run_count" integer default 0,
  "fail_count" integer default 0,
  "payload" jsonb,
  "active" boolean default true
);
drop trigger if exists trg_updated on public."PromptQueue";
create trigger trg_updated before update on public."PromptQueue" for each row execute function public.set_updated_date();
alter table public."PromptQueue" enable row level security;
drop policy if exists own_rows_select on public."PromptQueue";
create policy own_rows_select on public."PromptQueue" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."PromptQueue";
create policy own_rows_insert on public."PromptQueue" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."PromptQueue";
create policy own_rows_update on public."PromptQueue" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."PromptQueue";
create policy own_rows_delete on public."PromptQueue" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."ScoreRecord" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "run_id" text,
  "target_url" text,
  "clone_url" text,
  "visual_score" double precision default 0,
  "functional_score" double precision default 0,
  "aggregate_score" double precision default 0,
  "is_approved" boolean default false,
  "severity" text default 'REPAIRABLE',
  "failed_nodes" jsonb,
  "missing_routes" jsonb,
  "recommended_fix_action" text default 'NONE',
  "stage_reached" double precision default 0
);
drop trigger if exists trg_updated on public."ScoreRecord";
create trigger trg_updated before update on public."ScoreRecord" for each row execute function public.set_updated_date();
alter table public."ScoreRecord" enable row level security;
drop policy if exists own_rows_select on public."ScoreRecord";
create policy own_rows_select on public."ScoreRecord" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."ScoreRecord";
create policy own_rows_insert on public."ScoreRecord" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."ScoreRecord";
create policy own_rows_update on public."ScoreRecord" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."ScoreRecord";
create policy own_rows_delete on public."ScoreRecord" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."ScrapedLead" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "business_name" text,
  "address" text,
  "phone" text,
  "website" text,
  "email" text,
  "industry" text,
  "location" text,
  "keyword" text,
  "radius_miles" double precision default 25,
  "rating" double precision default 0,
  "review_count" integer default 0,
  "google_reviews" jsonb,
  "enriched" boolean default false,
  "enrichment_data" jsonb,
  "selected" boolean default false,
  "ingested_to_crm" boolean default false,
  "crm_contact_id" text,
  "scraped_at" text,
  "latitude" double precision,
  "longitude" double precision
);
drop trigger if exists trg_updated on public."ScrapedLead";
create trigger trg_updated before update on public."ScrapedLead" for each row execute function public.set_updated_date();
alter table public."ScrapedLead" enable row level security;
drop policy if exists own_rows_select on public."ScrapedLead";
create policy own_rows_select on public."ScrapedLead" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."ScrapedLead";
create policy own_rows_insert on public."ScrapedLead" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."ScrapedLead";
create policy own_rows_update on public."ScrapedLead" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."ScrapedLead";
create policy own_rows_delete on public."ScrapedLead" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."SearchConsoleMetrics" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "site_url" text,
  "report_date" text,
  "period_days" double precision default 7,
  "clicks" double precision default 0,
  "impressions" double precision default 0,
  "ctr" double precision default 0,
  "position" double precision default 0,
  "top_queries" jsonb,
  "top_pages" jsonb,
  "sitemaps" jsonb,
  "site_type" text,
  "raw_site_url" text,
  "synced_at" text,
  "autonomous" boolean default false
);
drop trigger if exists trg_updated on public."SearchConsoleMetrics";
create trigger trg_updated before update on public."SearchConsoleMetrics" for each row execute function public.set_updated_date();
alter table public."SearchConsoleMetrics" enable row level security;
drop policy if exists own_rows_select on public."SearchConsoleMetrics";
create policy own_rows_select on public."SearchConsoleMetrics" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."SearchConsoleMetrics";
create policy own_rows_insert on public."SearchConsoleMetrics" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."SearchConsoleMetrics";
create policy own_rows_update on public."SearchConsoleMetrics" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."SearchConsoleMetrics";
create policy own_rows_delete on public."SearchConsoleMetrics" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."Simulation" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "idea_id" text,
  "strategy_name" text,
  "horizon_days" double precision default 365,
  "assumptions" jsonb,
  "forecast" jsonb,
  "metrics" jsonb,
  "reverse_target" jsonb,
  "reverse_required_changes" jsonb,
  "reverse_feasible" boolean,
  "status" text default 'draft'
);
drop trigger if exists trg_updated on public."Simulation";
create trigger trg_updated before update on public."Simulation" for each row execute function public.set_updated_date();
alter table public."Simulation" enable row level security;
drop policy if exists own_rows_select on public."Simulation";
create policy own_rows_select on public."Simulation" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."Simulation";
create policy own_rows_insert on public."Simulation" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."Simulation";
create policy own_rows_update on public."Simulation" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."Simulation";
create policy own_rows_delete on public."Simulation" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."SiteAuditLog" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "site_id" text,
  "site_url" text,
  "action" text,
  "score" double precision default 0,
  "summary" text,
  "findings" jsonb,
  "recommendations" jsonb,
  "code_fixes" jsonb,
  "status" text default 'complete'
);
drop trigger if exists trg_updated on public."SiteAuditLog";
create trigger trg_updated before update on public."SiteAuditLog" for each row execute function public.set_updated_date();
alter table public."SiteAuditLog" enable row level security;
drop policy if exists own_rows_select on public."SiteAuditLog";
create policy own_rows_select on public."SiteAuditLog" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."SiteAuditLog";
create policy own_rows_insert on public."SiteAuditLog" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."SiteAuditLog";
create policy own_rows_update on public."SiteAuditLog" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."SiteAuditLog";
create policy own_rows_delete on public."SiteAuditLog" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."SitemapIngestion" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "domain" text,
  "sitemap_url" text,
  "property_url" text,
  "status" text default 'SUBMITTED',
  "ownership_verified" boolean default false,
  "dns_record_inserted" boolean default false,
  "dns_provider" text default 'NONE',
  "run_id" text
);
drop trigger if exists trg_updated on public."SitemapIngestion";
create trigger trg_updated before update on public."SitemapIngestion" for each row execute function public.set_updated_date();
alter table public."SitemapIngestion" enable row level security;
drop policy if exists own_rows_select on public."SitemapIngestion";
create policy own_rows_select on public."SitemapIngestion" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."SitemapIngestion";
create policy own_rows_insert on public."SitemapIngestion" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."SitemapIngestion";
create policy own_rows_update on public."SitemapIngestion" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."SitemapIngestion";
create policy own_rows_delete on public."SitemapIngestion" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."SystemDNA_Action" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "dna_id" text,
  "system_id" text,
  "objective" text,
  "source" text default 'gap',
  "source_id" text,
  "scope" text,
  "dependencies" jsonb,
  "acceptance_criteria" text,
  "test_plan" text,
  "rollback_strategy" text,
  "priority" text default 'P2',
  "status" text default 'queued',
  "assigned_to" text,
  "build_order_step" text,
  "kanban_column" text default 'backlog',
  "kanban_order" double precision default 0,
  "started_at" text,
  "completed_at" text
);
drop trigger if exists trg_updated on public."SystemDNA_Action";
create trigger trg_updated before update on public."SystemDNA_Action" for each row execute function public.set_updated_date();
alter table public."SystemDNA_Action" enable row level security;
drop policy if exists own_rows_select on public."SystemDNA_Action";
create policy own_rows_select on public."SystemDNA_Action" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."SystemDNA_Action";
create policy own_rows_insert on public."SystemDNA_Action" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."SystemDNA_Action";
create policy own_rows_update on public."SystemDNA_Action" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."SystemDNA_Action";
create policy own_rows_delete on public."SystemDNA_Action" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."SystemDNA_Capability" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "dna_id" text,
  "system_id" text,
  "system_name" text,
  "module" text,
  "capability" text,
  "category" text default 'core',
  "benchmark_reference" text,
  "benchmark_state" text,
  "current_state" text,
  "implemented" boolean default false,
  "validated" boolean default false,
  "hardened" boolean default false,
  "production_ready" boolean default false,
  "monitored" boolean default false,
  "maturity_state" text default 'unknown',
  "capability_score" double precision default 0,
  "evidence_score" double precision default 0,
  "reliability_score" double precision default 0,
  "security_score" double precision default 0,
  "performance_score" double precision default 0,
  "operational_score" double precision default 0,
  "benchmark_position" double precision default 0,
  "gap_severity" text default 'high',
  "gap_description" text,
  "requirement_ids" jsonb,
  "evidence_ids" jsonb,
  "last_audited_at" text
);
drop trigger if exists trg_updated on public."SystemDNA_Capability";
create trigger trg_updated before update on public."SystemDNA_Capability" for each row execute function public.set_updated_date();
alter table public."SystemDNA_Capability" enable row level security;
drop policy if exists own_rows_select on public."SystemDNA_Capability";
create policy own_rows_select on public."SystemDNA_Capability" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."SystemDNA_Capability";
create policy own_rows_insert on public."SystemDNA_Capability" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."SystemDNA_Capability";
create policy own_rows_update on public."SystemDNA_Capability" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."SystemDNA_Capability";
create policy own_rows_delete on public."SystemDNA_Capability" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."SystemDNA_Gap" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "dna_id" text,
  "system_id" text,
  "requirement_id" text,
  "capability_id" text,
  "target_state" text,
  "current_state" text,
  "measurable_difference" text,
  "severity" text default 'P2',
  "impact" text,
  "priority" text default 'P2',
  "root_cause" text,
  "dependencies" jsonb,
  "proposed_solution" text,
  "evidence_id" text,
  "action_id" text,
  "owner" text,
  "status" text default 'open',
  "is_blocking" boolean default false
);
drop trigger if exists trg_updated on public."SystemDNA_Gap";
create trigger trg_updated before update on public."SystemDNA_Gap" for each row execute function public.set_updated_date();
alter table public."SystemDNA_Gap" enable row level security;
drop policy if exists own_rows_select on public."SystemDNA_Gap";
create policy own_rows_select on public."SystemDNA_Gap" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."SystemDNA_Gap";
create policy own_rows_insert on public."SystemDNA_Gap" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."SystemDNA_Gap";
create policy own_rows_update on public."SystemDNA_Gap" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."SystemDNA_Gap";
create policy own_rows_delete on public."SystemDNA_Gap" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."SystemDNA_Requirement" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "dna_id" text,
  "system_id" text,
  "parent_id" text,
  "capability_id" text,
  "type" text default 'functional',
  "statement" text,
  "source" text,
  "source_reference" text,
  "rationale" text,
  "priority" text default 'P2',
  "risk" text,
  "acceptance_criteria" text,
  "verification_method" text default 'test',
  "validation_method" text,
  "status" text default 'defined',
  "has_acceptance_criteria" boolean default false,
  "version" text default '1.0'
);
drop trigger if exists trg_updated on public."SystemDNA_Requirement";
create trigger trg_updated before update on public."SystemDNA_Requirement" for each row execute function public.set_updated_date();
alter table public."SystemDNA_Requirement" enable row level security;
drop policy if exists own_rows_select on public."SystemDNA_Requirement";
create policy own_rows_select on public."SystemDNA_Requirement" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."SystemDNA_Requirement";
create policy own_rows_insert on public."SystemDNA_Requirement" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."SystemDNA_Requirement";
create policy own_rows_update on public."SystemDNA_Requirement" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."SystemDNA_Requirement";
create policy own_rows_delete on public."SystemDNA_Requirement" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."SystemDNA_System" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "dna_id" text,
  "name" text,
  "category" text default 'other',
  "description" text,
  "version" text default '1.0',
  "lifecycle_state" text default 'developing',
  "north_star_score" double precision default 0,
  "current_score" double precision default 0,
  "health_status" text default 'unknown',
  "security_health" text default 'unknown',
  "validation_health" text default 'unknown',
  "critical_gaps_count" double precision default 0,
  "blocked_requirements_count" double precision default 0,
  "failed_tests_count" double precision default 0,
  "active_actions_count" double precision default 0,
  "last_change_id" text,
  "next_action_id" text
);
drop trigger if exists trg_updated on public."SystemDNA_System";
create trigger trg_updated before update on public."SystemDNA_System" for each row execute function public.set_updated_date();
alter table public."SystemDNA_System" enable row level security;
drop policy if exists own_rows_select on public."SystemDNA_System";
create policy own_rows_select on public."SystemDNA_System" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."SystemDNA_System";
create policy own_rows_insert on public."SystemDNA_System" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."SystemDNA_System";
create policy own_rows_update on public."SystemDNA_System" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."SystemDNA_System";
create policy own_rows_delete on public."SystemDNA_System" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."SystemDNA_SystemRule" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "dna_id" text,
  "article" double precision,
  "principle" text,
  "category" text default 'quality',
  "enforcement" text,
  "rank" double precision,
  "immutable" boolean default true,
  "version" text default '1.0'
);
drop trigger if exists trg_updated on public."SystemDNA_SystemRule";
create trigger trg_updated before update on public."SystemDNA_SystemRule" for each row execute function public.set_updated_date();
alter table public."SystemDNA_SystemRule" enable row level security;
drop policy if exists own_rows_select on public."SystemDNA_SystemRule";
create policy own_rows_select on public."SystemDNA_SystemRule" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."SystemDNA_SystemRule";
create policy own_rows_insert on public."SystemDNA_SystemRule" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."SystemDNA_SystemRule";
create policy own_rows_update on public."SystemDNA_SystemRule" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."SystemDNA_SystemRule";
create policy own_rows_delete on public."SystemDNA_SystemRule" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."SystemEnhancement" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "number" double precision,
  "title" text,
  "description" text,
  "existing_system" text,
  "downfall" text,
  "recommended_enhancement" text,
  "technical_protocols" jsonb,
  "surround_enhancements" jsonb,
  "web_search_sources" jsonb,
  "approved" boolean default false,
  "implementation_code" text,
  "category" text default 'feature',
  "status" text default 'pending',
  "priority" double precision default 3,
  "source" text default 'autonomous',
  "implementation_plan" text,
  "implementation_notes" text,
  "audit_result" jsonb,
  "fix_attempts" double precision default 0,
  "max_fix_attempts" double precision default 3,
  "blocked_reason" text,
  "last_action_at" text,
  "build_order_step" text
);
drop trigger if exists trg_updated on public."SystemEnhancement";
create trigger trg_updated before update on public."SystemEnhancement" for each row execute function public.set_updated_date();
alter table public."SystemEnhancement" enable row level security;
drop policy if exists own_rows_select on public."SystemEnhancement";
create policy own_rows_select on public."SystemEnhancement" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."SystemEnhancement";
create policy own_rows_insert on public."SystemEnhancement" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."SystemEnhancement";
create policy own_rows_update on public."SystemEnhancement" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."SystemEnhancement";
create policy own_rows_delete on public."SystemEnhancement" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."SystemGap" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "gap_type" text,
  "severity" text default 'warning',
  "source_url" text,
  "selector" text,
  "matched_value" text,
  "replacement_value" text,
  "scan_mode" text default 'TRADEMARK_SCAN',
  "status" text default 'detected',
  "stage" text default 'stage_2_compliance_and_rebrand_scan',
  "run_id" text
);
drop trigger if exists trg_updated on public."SystemGap";
create trigger trg_updated before update on public."SystemGap" for each row execute function public.set_updated_date();
alter table public."SystemGap" enable row level security;
drop policy if exists own_rows_select on public."SystemGap";
create policy own_rows_select on public."SystemGap" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."SystemGap";
create policy own_rows_insert on public."SystemGap" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."SystemGap";
create policy own_rows_update on public."SystemGap" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."SystemGap";
create policy own_rows_delete on public."SystemGap" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."SystemPerfectionReport" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "site_id" text,
  "site_url" text,
  "site_name" text,
  "system_type" text,
  "system_description" text,
  "tech_stack" jsonb,
  "benchmark_system" text,
  "competitor_benchmarks" jsonb,
  "scores" jsonb,
  "overall_score" double precision default 0,
  "dimension_analysis" jsonb,
  "perfection_prompts" jsonb,
  "overall_summary" text,
  "launch_readiness_verdict" text default 'unknown',
  "autonomous" boolean default false
);
drop trigger if exists trg_updated on public."SystemPerfectionReport";
create trigger trg_updated before update on public."SystemPerfectionReport" for each row execute function public.set_updated_date();
alter table public."SystemPerfectionReport" enable row level security;
drop policy if exists own_rows_select on public."SystemPerfectionReport";
create policy own_rows_select on public."SystemPerfectionReport" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."SystemPerfectionReport";
create policy own_rows_insert on public."SystemPerfectionReport" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."SystemPerfectionReport";
create policy own_rows_update on public."SystemPerfectionReport" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."SystemPerfectionReport";
create policy own_rows_delete on public."SystemPerfectionReport" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."SystemPrompt" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "name" text,
  "category" text default 'other',
  "sub_category" text,
  "prompt_text" text,
  "description" text,
  "target_model" text default 'automatic',
  "response_json_schema" jsonb,
  "variables" jsonb,
  "effectiveness_score" double precision default 0,
  "usage_count" integer default 0,
  "success_rate" double precision default 0,
  "version" text default '1.0.0',
  "tags" jsonb,
  "active" boolean default true,
  "created_by_agent" text,
  "last_optimized_at" text,
  "optimization_notes" text
);
drop trigger if exists trg_updated on public."SystemPrompt";
create trigger trg_updated before update on public."SystemPrompt" for each row execute function public.set_updated_date();
alter table public."SystemPrompt" enable row level security;
drop policy if exists own_rows_select on public."SystemPrompt";
create policy own_rows_select on public."SystemPrompt" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."SystemPrompt";
create policy own_rows_insert on public."SystemPrompt" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."SystemPrompt";
create policy own_rows_update on public."SystemPrompt" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."SystemPrompt";
create policy own_rows_delete on public."SystemPrompt" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."SystemTaskRegistry" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "task_type" text,
  "name" text,
  "category" text default 'other',
  "description" text,
  "assigned_agent" text,
  "assigned_agent_codename" text,
  "source_page" text,
  "source_function" text,
  "trigger_type" text default 'manual',
  "trigger_schedule" text,
  "estimated_duration_minutes" double precision default 30,
  "payment_amount" double precision default 0,
  "priority" text default 'medium',
  "status" text default 'active',
  "last_run" text,
  "last_status" text default 'never',
  "last_duration_minutes" double precision default 0,
  "run_count" double precision default 0,
  "fail_count" double precision default 0,
  "requires_google_task" boolean default true,
  "requires_calendar_event" boolean default false
);
drop trigger if exists trg_updated on public."SystemTaskRegistry";
create trigger trg_updated before update on public."SystemTaskRegistry" for each row execute function public.set_updated_date();
alter table public."SystemTaskRegistry" enable row level security;
drop policy if exists own_rows_select on public."SystemTaskRegistry";
create policy own_rows_select on public."SystemTaskRegistry" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."SystemTaskRegistry";
create policy own_rows_insert on public."SystemTaskRegistry" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."SystemTaskRegistry";
create policy own_rows_update on public."SystemTaskRegistry" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."SystemTaskRegistry";
create policy own_rows_delete on public."SystemTaskRegistry" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."TimeClockEntry" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "agent_name" text,
  "agent_codename" text,
  "task_registry_id" text,
  "task_type" text,
  "schedule_id" text,
  "google_task_id" text,
  "task_list_id" text,
  "calendar_event_id" text,
  "clock_in" text,
  "clock_out" text,
  "duration_minutes" double precision default 0,
  "status" text default 'active',
  "result" text,
  "payment_amount" double precision default 0,
  "payment_status" text default 'unpaid',
  "source" text default 'schedule',
  "source_page" text
);
drop trigger if exists trg_updated on public."TimeClockEntry";
create trigger trg_updated before update on public."TimeClockEntry" for each row execute function public.set_updated_date();
alter table public."TimeClockEntry" enable row level security;
drop policy if exists own_rows_select on public."TimeClockEntry";
create policy own_rows_select on public."TimeClockEntry" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."TimeClockEntry";
create policy own_rows_insert on public."TimeClockEntry" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."TimeClockEntry";
create policy own_rows_update on public."TimeClockEntry" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."TimeClockEntry";
create policy own_rows_delete on public."TimeClockEntry" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."Trade" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "day" double precision,
  "asset" text,
  "direction" text default 'long',
  "thesis" text,
  "confidence" double precision,
  "accuracy_drivers" jsonb,
  "shadow_intel_sources" jsonb,
  "council_directive" text,
  "position_size_usd" double precision,
  "entry_price" double precision,
  "exit_price" double precision,
  "price_source" text,
  "price_estimated" boolean default false,
  "target_return_pct" double precision,
  "pnl_usd" double precision,
  "pnl_pct" double precision,
  "status" text default 'open',
  "portfolio_value_before" double precision,
  "portfolio_value_after" double precision
);
drop trigger if exists trg_updated on public."Trade";
create trigger trg_updated before update on public."Trade" for each row execute function public.set_updated_date();
alter table public."Trade" enable row level security;
drop policy if exists own_rows_select on public."Trade";
create policy own_rows_select on public."Trade" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."Trade";
create policy own_rows_insert on public."Trade" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."Trade";
create policy own_rows_update on public."Trade" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."Trade";
create policy own_rows_delete on public."Trade" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."User" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "role" text
);
drop trigger if exists trg_updated on public."User";
create trigger trg_updated before update on public."User" for each row execute function public.set_updated_date();
alter table public."User" enable row level security;
drop policy if exists own_rows_select on public."User";
create policy own_rows_select on public."User" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."User";
create policy own_rows_insert on public."User" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."User";
create policy own_rows_update on public."User" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."User";
create policy own_rows_delete on public."User" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."UserProfile" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "user_id" text,
  "seed_sentence" text,
  "vision_statement" text,
  "goal" jsonb,
  "answers" jsonb,
  "industry_focus" text,
  "financial_focus" text,
  "autonomy_level" text,
  "risk_tolerance" text,
  "time_horizon" text,
  "brand_aesthetic" text,
  "brand_voice" text,
  "target_audience" text,
  "completed" boolean default false
);
drop trigger if exists trg_updated on public."UserProfile";
create trigger trg_updated before update on public."UserProfile" for each row execute function public.set_updated_date();
alter table public."UserProfile" enable row level security;
drop policy if exists own_rows_select on public."UserProfile";
create policy own_rows_select on public."UserProfile" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."UserProfile";
create policy own_rows_insert on public."UserProfile" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."UserProfile";
create policy own_rows_update on public."UserProfile" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."UserProfile";
create policy own_rows_delete on public."UserProfile" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."VaultAuditLog" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "action" text,
  "resource_type" text,
  "resource_id" text,
  "resource_name" text,
  "details" text,
  "ip_address" text,
  "user_agent" text,
  "severity" text default 'info',
  "success" boolean default true
);
drop trigger if exists trg_updated on public."VaultAuditLog";
create trigger trg_updated before update on public."VaultAuditLog" for each row execute function public.set_updated_date();
alter table public."VaultAuditLog" enable row level security;
drop policy if exists own_rows_select on public."VaultAuditLog";
create policy own_rows_select on public."VaultAuditLog" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."VaultAuditLog";
create policy own_rows_insert on public."VaultAuditLog" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."VaultAuditLog";
create policy own_rows_update on public."VaultAuditLog" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."VaultAuditLog";
create policy own_rows_delete on public."VaultAuditLog" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."VaultEntry" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "name" text,
  "account_type" text default 'other',
  "category" text default '',
  "url" text,
  "credentials" jsonb,
  "assigned_api_keys" jsonb,
  "tags" jsonb,
  "last_synced" text
);
drop trigger if exists trg_updated on public."VaultEntry";
create trigger trg_updated before update on public."VaultEntry" for each row execute function public.set_updated_date();
alter table public."VaultEntry" enable row level security;
drop policy if exists own_rows_select on public."VaultEntry";
create policy own_rows_select on public."VaultEntry" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."VaultEntry";
create policy own_rows_insert on public."VaultEntry" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."VaultEntry";
create policy own_rows_update on public."VaultEntry" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."VaultEntry";
create policy own_rows_delete on public."VaultEntry" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."VisionPipeline" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "vision_statement" text,
  "user_id" text,
  "stage" text default 'vision',
  "strategies" jsonb,
  "simulations" jsonb,
  "recommendation" jsonb,
  "tech_research" jsonb,
  "build_queue_id" text,
  "build_pack" jsonb,
  "provision_status" jsonb,
  "clone_status" jsonb,
  "validation_scores" jsonb,
  "autonomous" boolean default true,
  "agent_assignments" jsonb,
  "logs" jsonb,
  "status" text default 'active'
);
drop trigger if exists trg_updated on public."VisionPipeline";
create trigger trg_updated before update on public."VisionPipeline" for each row execute function public.set_updated_date();
alter table public."VisionPipeline" enable row level security;
drop policy if exists own_rows_select on public."VisionPipeline";
create policy own_rows_select on public."VisionPipeline" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."VisionPipeline";
create policy own_rows_insert on public."VisionPipeline" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."VisionPipeline";
create policy own_rows_update on public."VisionPipeline" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."VisionPipeline";
create policy own_rows_delete on public."VisionPipeline" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."VisualizerSession" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "session_name" text,
  "user_email" text,
  "user_phone" text,
  "business_name" text,
  "room_type" text default 'garage',
  "room_dimensions" jsonb,
  "floor_system" text,
  "finish_type" text default 'flake',
  "color_choice" text,
  "color_hex" text,
  "base_image_url" text,
  "result_image_url" text,
  "ai_analysis" jsonb,
  "status" text default 'draft',
  "lead_id" text,
  "shared_with" jsonb,
  "notes" text
);
drop trigger if exists trg_updated on public."VisualizerSession";
create trigger trg_updated before update on public."VisualizerSession" for each row execute function public.set_updated_date();
alter table public."VisualizerSession" enable row level security;
drop policy if exists own_rows_select on public."VisualizerSession";
create policy own_rows_select on public."VisualizerSession" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."VisualizerSession";
create policy own_rows_insert on public."VisualizerSession" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."VisualizerSession";
create policy own_rows_update on public."VisualizerSession" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."VisualizerSession";
create policy own_rows_delete on public."VisualizerSession" for delete to authenticated using ("created_by" = auth.uid()::text);

create table if not exists public."XtremeCrmContact" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz not null default now(),
  "created_by" text,
  "full_name" text,
  "email" text,
  "phone" text,
  "company" text,
  "title" text,
  "industry" text,
  "location" text,
  "website" text,
  "lifecycle_stage" text default 'lead',
  "lead_source" text default 'manual',
  "enrichment_data" jsonb,
  "tags" jsonb,
  "notes" text,
  "deal_value" double precision default 0,
  "owner_id" text,
  "last_contacted_at" text,
  "last_contact_channel" text default 'none',
  "follow_up_enabled" boolean default false,
  "follow_up_frequency_days" integer default 3,
  "follow_up_method" text default 'sms',
  "follow_up_template_id" text,
  "follow_up_automated" boolean default false,
  "next_follow_up_at" text,
  "follow_up_count" integer default 0,
  "hubspot_synced" boolean default false,
  "hubspot_contact_id" text,
  "avatar_url" text
);
drop trigger if exists trg_updated on public."XtremeCrmContact";
create trigger trg_updated before update on public."XtremeCrmContact" for each row execute function public.set_updated_date();
alter table public."XtremeCrmContact" enable row level security;
drop policy if exists own_rows_select on public."XtremeCrmContact";
create policy own_rows_select on public."XtremeCrmContact" for select to authenticated using ("created_by" = auth.uid()::text);
drop policy if exists own_rows_insert on public."XtremeCrmContact";
create policy own_rows_insert on public."XtremeCrmContact" for insert to authenticated with check ("created_by" = auth.uid()::text or "created_by" is null);
drop policy if exists own_rows_update on public."XtremeCrmContact";
create policy own_rows_update on public."XtremeCrmContact" for update to authenticated using ("created_by" = auth.uid()::text) with check ("created_by" = auth.uid()::text);
drop policy if exists own_rows_delete on public."XtremeCrmContact";
create policy own_rows_delete on public."XtremeCrmContact" for delete to authenticated using ("created_by" = auth.uid()::text);

-- Deny anon all table access by default (least privilege); service_role bypasses RLS.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant usage, select on all sequences in schema public to authenticated;
