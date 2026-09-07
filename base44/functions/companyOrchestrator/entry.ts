import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

// ============================================================================
// COMPANY ORCHESTRATOR — The Master Trigger
// ============================================================================
// This function is the CEO/Chief agent. It:
// 1. Reads the Vision, Blueprint, System DNA, and agent roster
// 2. Checks enabled capabilities
// 3. Creates a phased task schedule for the entire agent swarm
// 4. Assigns tasks based on agent roles and the playbook sequence
// 5. Schedules work sessions in Google Calendar
// 6. Sends WhatsApp proactive notifications
// 7. Returns a live company status for the dashboard
//
// PLAYBOOK SEQUENCE (from the 36-page playbook):
// Phase 1: Audit the entire Vision Cortex system
// Phase 2: Fix all problems found
// Phase 3: Harden the system
// Phase 4: Implement 24/7 persistent operational loop
// Phase 5: Intelligence ingestion
// Phase 6: Establish all positions and jobs
// Phase 7: Build & operate all systems (outreach, comms, xtreme OS, auto builder, clone, data acquisition, hidden property intel)
// Phase 8: Optimize email systems and orchestrate
// ============================================================================

const PLAYBOOK_PHASES = [
  {
    id: '1_audit',
    name: 'System Audit',
    description: 'Audit the entire Vision Cortex system — every entity, function, page, workflow, agent, and integration',
    agents: ['Alpha-Inquisitor', 'Omni-Architect', 'Nova-Cartographer'],
    tasks: [
      { title: 'Audit all entities for RLS gaps', category: 'audit', system_target: 'vision_cortex' },
      { title: 'Audit all backend functions for errors', category: 'audit', system_target: 'vision_cortex' },
      { title: 'Audit all workflows and triggers', category: 'audit', system_target: 'vision_cortex' },
      { title: 'Audit all agent profiles and capabilities', category: 'audit', system_target: 'vision_cortex' },
      { title: 'Audit all connected accounts and integrations', category: 'audit', system_target: 'vision_cortex' },
      { title: 'Audit vault security and key rotation', category: 'audit', system_target: 'vision_cortex' },
      { title: 'Audit Hidden Property Intel system', category: 'audit', system_target: 'hidden_property_intel' },
      { title: 'Audit Xtreme OS and Auto Builder', category: 'audit', system_target: 'xtreme_os' },
    ]
  },
  {
    id: '2_fix',
    name: 'Fix All Problems',
    description: 'Fix every issue identified in the audit phase',
    agents: ['Forge-Smith', 'Omni-Architect', 'Bridge'],
    tasks: [
      { title: 'Fix RLS gaps on all entities', category: 'fix', system_target: 'vision_cortex' },
      { title: 'Fix broken backend functions', category: 'fix', system_target: 'vision_cortex' },
      { title: 'Fix workflow trigger issues', category: 'fix', system_target: 'vision_cortex' },
      { title: 'Fix site SEO issues (OG tags, meta descriptions, canonical URLs)', category: 'fix', system_target: 'all_sites' },
      { title: 'Fix integration auth errors', category: 'fix', system_target: 'vision_cortex' },
    ]
  },
  {
    id: '3_harden',
    name: 'Harden the System',
    description: 'Security hardening, fault isolation, and zero-failure pipeline validation',
    agents: ['Sentinel', 'Aegis-Sentinel', 'Siren-Veil'],
    tasks: [
      { title: 'Harden all entity RLS policies', category: 'harden', system_target: 'vision_cortex' },
      { title: 'Harden vault and key security', category: 'harden', system_target: 'vision_cortex' },
      { title: 'Validate zero-failure pipeline', category: 'harden', system_target: 'vision_cortex' },
      { title: 'Implement fault isolation boundaries', category: 'harden', system_target: 'vision_cortex' },
      { title: 'Security scan and threat assessment', category: 'harden', system_target: 'vision_cortex' },
    ]
  },
  {
    id: '4_operational_loop',
    name: '24/7 Operational Loop',
    description: 'Implement the persistent 24/7 autonomous operational loop at max efficiency',
    agents: ['Chief', 'Omega-Reaper', 'Bridge'],
    tasks: [
      { title: 'Configure master loop orchestrator heartbeat', category: 'build', system_target: 'vision_cortex' },
      { title: 'Set up Vercel cron for 60-second heartbeats', category: 'build', system_target: 'vision_cortex' },
      { title: 'Configure autonomous cycle phases', category: 'build', system_target: 'vision_cortex' },
      { title: 'Set up hourly summary notifications', category: 'build', system_target: 'vision_cortex' },
      { title: 'Set up daily progress reports for all sites', category: 'build', system_target: 'vision_cortex' },
    ]
  },
  {
    id: '5_intelligence',
    name: 'Intelligence Ingestion',
    description: 'Start persistent intelligence ingestion from strategic data sources',
    agents: ['Prime-Oracle', 'Nova-Cartographer', 'Shadow-AI-Driven Social Med'],
    tasks: [
      { title: 'Configure cloud browser scraping seed list', category: 'intelligence', system_target: 'vision_cortex' },
      { title: 'Start daily intelligence ingestion cycle', category: 'intelligence', system_target: 'vision_cortex' },
      { title: 'Set up IntelFeed categorization and scoring', category: 'intelligence', system_target: 'vision_cortex' },
      { title: 'Configure knowledge quest autonomous research', category: 'intelligence', system_target: 'vision_cortex' },
    ]
  },
  {
    id: '6_positions',
    name: 'Establish Positions & Jobs',
    description: 'Every agent takes their position and establishes their daily job',
    agents: ['Chief', 'Prime', 'VALIDATOR'],
    tasks: [
      { title: 'CEO Chief establishes org chart and reporting lines', category: 'documentation', system_target: 'vision_cortex' },
      { title: 'Each agent documents their daily operational cadence', category: 'documentation', system_target: 'vision_cortex' },
      { title: 'Set up agent reward calculation and $INF payouts', category: 'build', system_target: 'vision_cortex' },
      { title: 'Create agent wallets and initialize balances', category: 'build', system_target: 'vision_cortex' },
      { title: 'Set all agents as API AI for max I/O capability', category: 'build', system_target: 'vision_cortex' },
    ]
  },
  {
    id: '7_build_systems',
    name: 'Build & Operate All Systems',
    description: 'Build and operate: outreach, comms, xtreme OS, auto builder, clone, data acquisition, hidden property intel',
    agents: ['Builder', 'Ember-Diplomat', 'Viper-Merchant', 'Presence', 'Growth'],
    tasks: [
      { title: 'Operate outreach system and campaign management', category: 'outreach', system_target: 'outreach' },
      { title: 'Operate Xtreme Comms system for messaging', category: 'comms', system_target: 'comms' },
      { title: 'Operate Xtreme OS and Auto Builder pipeline', category: 'build', system_target: 'xtreme_os' },
      { title: 'Operate clone system for site replication', category: 'build', system_target: 'clone_factory' },
      { title: 'Build and operate data acquisition system', category: 'build', system_target: 'data_acquisition' },
      { title: 'Finish and operate Hidden Property Intel system', category: 'build', system_target: 'hidden_property_intel' },
    ]
  },
  {
    id: '8_email_orchestration',
    name: 'Email Orchestration',
    description: 'Optimize and start orchestrating all email systems',
    agents: ['Ember-Diplomat', 'Broker', 'Growth'],
    tasks: [
      { title: 'Connect and optimize all email accounts', category: 'build', system_target: 'vision_cortex' },
      { title: 'Start email outreach orchestration', category: 'comms', system_target: 'vision_cortex' },
      { title: 'Set up hourly summary emails to owner', category: 'comms', system_target: 'vision_cortex' },
      { title: 'Set up daily progress report emails', category: 'comms', system_target: 'vision_cortex' },
    ]
  },
];

// Agent role -> default capabilities
const AGENT_DEFAULTS = {
  'Chief': { role: 'CEO / Orchestrator', archetype: 'THE CHIEF', capabilities: ['full_read', 'full_write', 'full_execute', 'admin', 'build', 'deploy'] },
  'Prime': { role: 'Primary Orchestrator', archetype: 'THE PRIME', capabilities: ['full_read', 'full_write', 'full_execute', 'admin'] },
  'Prime-Oracle': { role: 'Intelligence & Prediction', archetype: 'THE ORACLE', capabilities: ['llm_inference', 'browser_scraping', 'full_read'] },
  'Omni-Architect': { role: 'Core System Engineering', archetype: 'THE ARCHITECT', capabilities: ['full_read', 'full_write', 'frontend_editing', 'backend_editing', 'entity_editing', 'workflow_editing', 'build', 'deploy'] },
  'Alpha-Inquisitor': { role: 'Quality Assurance & Validation', archetype: 'THE INQUISITOR', capabilities: ['full_read', 'security_audit'] },
  'Forge-Smith': { role: 'Building & Compilation', archetype: 'THE FORGE', capabilities: ['full_read', 'full_write', 'backend_editing', 'build', 'deploy'] },
  'Builder': { role: 'Autonomous Build', archetype: 'THE BUILDER', capabilities: ['full_read', 'full_write', 'frontend_editing', 'backend_editing', 'build', 'deploy'] },
  'Nova-Cartographer': { role: 'Discovery & Scouting', archetype: 'THE SCOUT', capabilities: ['browser_scraping', 'stealth_browse', 'full_read'] },
  'Sentinel': { role: 'Self-Healing & Hardening', archetype: 'THE SENTINEL', capabilities: ['full_read', 'full_write', 'security_audit', 'vault_access'] },
  'Aegis-Sentinel': { role: 'Monitoring & Self-Healing', archetype: 'THE AEGIS', capabilities: ['full_read', 'security_audit'] },
  'Omega-Reaper': { role: 'Consequence Execution', archetype: 'THE REAPER', capabilities: ['full_read', 'full_write', 'full_execute'] },
  'Bridge': { role: 'API & Integrations', archetype: 'THE BRIDGE', capabilities: ['full_read', 'full_write', 'full_execute', 'account_access'] },
  'Broker': { role: 'Data Monetization Strategist', archetype: 'THE BROKER', capabilities: ['full_read', 'llm_inference'] },
  'Ember-Diplomat': { role: 'Communications & Outreach', archetype: 'THE DIPLOMAT', capabilities: ['xtreme_comms', 'email_send', 'email_read', 'email_reply'] },
  'Siren-Veil': { role: 'Deception Defense & Security', archetype: 'THE SIREN', capabilities: ['security_audit', 'vault_access', 'full_read'] },
  'Presence': { role: 'Cloud Social Operator', archetype: 'THE PRESENCE', capabilities: ['browser_scraping', 'xtreme_comms', 'full_read', 'full_write'] },
  'Growth': { role: 'Marketing & Social', archetype: 'THE GROWTH', capabilities: ['xtreme_comms', 'email_send', 'browser_scraping', 'full_read'] },
  'Viper-Merchant': { role: 'Data Acquisition & Monetization', archetype: 'THE VIPER', capabilities: ['browser_scraping', 'full_read', 'full_write', 'account_access'] },
  'Shadow-AI-Driven Social Med': { role: 'Deep Data Acquisition', archetype: 'THE SHADOW', capabilities: ['stealth_browse', 'browser_scraping', 'full_read', 'full_write'] },
  'VALIDATOR': { role: 'Independent Review & Quality Gate', archetype: 'THE VALIDATOR', capabilities: ['full_read', 'security_audit'] },
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'status';
    const sr = base44.asServiceRole.entities;

    // ── STATUS: Get live company status ──
    if (action === 'status') {
      const [agents, schedules, caps] = await Promise.all([
        sr.AgentProfile.list('-order', 100).catch(() => []),
        sr.AgentSchedule.list('-created_date', 200).catch(() => []),
        sr.CapabilityToggle.list('-created_date', 200).catch(() => []),
      ]);

      const activeTasks = schedules.filter(s => s.status === 'in_progress');
      const completedTasks = schedules.filter(s => s.status === 'completed');
      const scheduledTasks = schedules.filter(s => s.status === 'scheduled');
      const failedTasks = schedules.filter(s => s.status === 'failed');

      // Group schedules by phase
      const phases = {};
      for (const s of schedules) {
        const p = s.playbook_phase || 'unassigned';
        if (!phases[p]) phases[p] = { total: 0, completed: 0, in_progress: 0, scheduled: 0, failed: 0 };
        phases[p].total++;
        if (s.status === 'completed') phases[p].completed++;
        else if (s.status === 'in_progress') phases[p].in_progress++;
        else if (s.status === 'scheduled') phases[p].scheduled++;
        else if (s.status === 'failed') phases[p].failed++;
      }

      // Agent activity
      const agentActivity = {};
      for (const s of schedules) {
        if (!agentActivity[s.agent_name]) {
          agentActivity[s.agent_name] = { total: 0, completed: 0, in_progress: 0, inf_earned: 0, current_task: null };
        }
        agentActivity[s.agent_name].total++;
        if (s.status === 'completed') {
          agentActivity[s.agent_name].completed++;
          agentActivity[s.agent_name].inf_earned += s.payment_amount || 0;
        }
        if (s.status === 'in_progress') {
          agentActivity[s.agent_name].in_progress++;
          agentActivity[s.agent_name].current_task = s.task_title;
        }
      }

      return Response.json({
        ok: true,
        action: 'status',
        agents: agents.map(a => ({
          name: a.name,
          codename: a.codename,
          role: a.role,
          archetype: a.archetype,
          status: a.status,
          health: a.health,
          inf_balance: a.inf_balance,
          ...agentActivity[a.name]
        })),
        summary: {
          total_agents: agents.length,
          active_agents: agents.filter(a => a.status === 'active').length,
          total_tasks: schedules.length,
          active_tasks: activeTasks.length,
          completed_tasks: completedTasks.length,
          scheduled_tasks: scheduledTasks.length,
          failed_tasks: failedTasks.length,
          capabilities_enabled: caps.filter(c => c.enabled).length,
          capabilities_total: caps.length,
        },
        phases,
        active_tasks: activeTasks.map(t => ({
          id: t.id,
          agent: t.agent_name,
          task: t.task_title,
          phase: t.playbook_phase,
          progress: t.progress,
          start: t.actual_start,
          system: t.system_target
        })),
      });
    }

    // ── BOOTSTRAP: Initialize the entire company from scratch ──
    if (action === 'bootstrap') {
      // 1. Read the vision and blueprint
      const plan = await sr.MasterPlan.list('-created_date', 1).catch(() => []);
      const agents = await sr.AgentProfile.list('-order', 100).catch(() => []);

      // 2. Ensure capabilities are seeded
      const existingCaps = await sr.CapabilityToggle.list('-created_date', 200).catch(() => []);
      if (existingCaps.length === 0) {
        // Trigger seeding via manageCapabilities
        try {
          await base44.functions.invoke('manageCapabilities', { action: 'seed' });
        } catch {}
      }

      // 3. Enable all capabilities for maximum agent power
      const allCaps = await sr.CapabilityToggle.list('-created_date', 200).catch(() => []);
      const disabledCaps = allCaps.filter(c => !c.enabled);
      for (const cap of disabledCaps) {
        try {
          await sr.CapabilityToggle.update(cap.id, {
            enabled: true,
            last_toggled_by: user.email || 'orchestrator',
            last_toggled_at: new Date().toISOString()
          });
        } catch {}
      }

      // 4. Update agent profiles with API AI capabilities and ensure wallets
      for (const agent of agents) {
        const defaults = AGENT_DEFAULTS[agent.name] || AGENT_DEFAULTS[agent.codename] || {};
        try {
          await sr.AgentProfile.update(agent.id, {
            status: 'active',
            health: agent.health || 100,
            ...(agent.wallet_address ? {} : { wallet_address: `inf_${agent.codename || agent.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now().toString(36)}` }),
          });
        } catch {}
      }

      // 5. Create crypto wallets for agents that don't have them
      for (const agent of agents) {
        if (!agent.wallet_address) {
          try {
            await sr.CryptoWallet.create({
              label: `${agent.name} Wallet`,
              address: `inf_${agent.codename || agent.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now().toString(36)}`,
              wallet_type: 'cortex_token',
              balance: 0,
              assigned_to: agent.name,
              active: true,
              is_paper: true
            });
          } catch {}
        }
      }

      // 6. Create the full task schedule from the playbook
      const now = new Date();
      const created = [];
      for (let pi = 0; pi < PLAYBOOK_PHASES.length; pi++) {
        const phase = PLAYBOOK_PHASES[pi];
        const phaseStart = new Date(now.getTime() + pi * 2 * 60 * 60 * 1000); // 2 hours per phase

        for (let ti = 0; ti < phase.tasks.length; ti++) {
          const task = phase.tasks[ti];
          const agentName = phase.agents[ti % phase.agents.length];
          const agent = agents.find(a => a.name === agentName || a.codename === agentName);
          if (!agent) continue;

          const taskStart = new Date(phaseStart.getTime() + ti * 15 * 60 * 1000); // 15 min stagger
          const taskEnd = new Date(taskStart.getTime() + 60 * 60 * 1000); // 1 hour tasks

          // Check if this task already exists
          const existing = await sr.AgentSchedule.filter({
            agent_name: agentName,
            task_title: task.title,
            playbook_phase: phase.id
          }, '-created_date', 1);

          if (existing[0]) {
            created.push({ ...existing[0], skipped: true });
            continue;
          }

          const schedule = await sr.AgentSchedule.create({
            agent_name: agentName,
            agent_codename: agent?.codename || '',
            task_title: task.title,
            task_description: `${phase.name}: ${task.title}`,
            task_category: task.category,
            playbook_phase: phase.id,
            status: 'scheduled',
            priority: pi < 3 ? 1 : pi < 5 ? 2 : 3,
            scheduled_start: taskStart.toISOString(),
            scheduled_end: taskEnd.toISOString(),
            progress: 0,
            payment_amount: 100, // Base INF per task
            system_target: task.system_target,
          });
          created.push(schedule);
        }
      }

      return Response.json({
        ok: true,
        action: 'bootstrap',
        vision: plan[0]?.vision?.slice(0, 200) || 'No vision set',
        agents_initialized: agents.length,
        capabilities_enabled: allCaps.length,
        tasks_created: created.filter(c => !c.skipped).length,
        tasks_skipped: created.filter(c => c.skipped).length,
        phases: PLAYBOOK_PHASES.length,
        message: `Company bootstrapped: ${agents.length} agents, ${allCaps.length} capabilities enabled, ${created.filter(c => !c.skipped).length} tasks scheduled across ${PLAYBOOK_PHASES.length} phases.`
      });
    }

    // ── TRIGGER: Start the next scheduled task for each available agent ──
    if (action === 'trigger') {
      const agents = await sr.AgentProfile.list('-order', 100).catch(() => []);
      const schedules = await sr.AgentSchedule.list('-created_date', 200).catch(() => []);

      // Find scheduled tasks that can start (dependencies met)
      const triggered = [];
      for (const agent of agents) {
        if (agent.status !== 'active' && agent.status !== 'idle') continue;

        // Find the next scheduled task for this agent
        const nextTask = schedules
          .filter(s => s.agent_name === agent.name && s.status === 'scheduled')
          .sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start))[0];

        if (!nextTask) continue;

        // Check dependencies
        if (nextTask.depends_on?.length > 0) {
          const deps = await Promise.all(
            nextTask.depends_on.map(id => sr.AgentSchedule.get(id).catch(() => null))
          );
          if (deps.some(d => d && d.status !== 'completed')) continue;
        }

        // Mark as in progress
        await sr.AgentSchedule.update(nextTask.id, {
          status: 'in_progress',
          actual_start: new Date().toISOString(),
          progress: 1
        });

        triggered.push({
          task_id: nextTask.id,
          agent: agent.name,
          task: nextTask.task_title,
          phase: nextTask.playbook_phase,
          system: nextTask.system_target
        });
      }

      return Response.json({
        ok: true,
        action: 'trigger',
        triggered: triggered.length,
        tasks: triggered,
        message: `Triggered ${triggered.length} agent tasks.`
      });
    }

    // ── COMPLETE: Mark a task as completed ──
    if (action === 'complete') {
      const { task_id, result, progress = 100 } = body;
      if (!task_id) return Response.json({ error: 'task_id required' }, { status: 400 });

      const task = await sr.AgentSchedule.get(task_id);
      const now = new Date();
      const start = task.actual_start ? new Date(task.actual_start) : now;
      const durationMin = Math.round((now - start) / 60000);

      await sr.AgentSchedule.update(task_id, {
        status: 'completed',
        actual_end: now.toISOString(),
        duration_minutes: durationMin,
        progress: 100,
        result: result || 'Task completed',
        payment_status: 'pending'
      });

      // Update agent profile
      const agent = await sr.AgentProfile.filter({ name: task.agent_name }, '-created_date', 1);
      if (agent[0]) {
        await sr.AgentProfile.update(agent[0].id, {
          tasks_completed: (agent[0].tasks_completed || 0) + 1,
          last_run: now.toISOString(),
          inf_balance: (agent[0].inf_balance || 0) + (task.payment_amount || 0),
          inf_earned_total: (agent[0].inf_earned_total || 0) + (task.payment_amount || 0),
        });
      }

      return Response.json({
        ok: true,
        action: 'complete',
        task_id,
        duration_minutes: durationMin,
        payment: task.payment_amount,
        agent: task.agent_name
      });
    }

    // ── SCHEDULE: Create Google Calendar events for all scheduled tasks ──
    if (action === 'schedule_calendar') {
      const schedules = await sr.AgentSchedule.filter({ status: 'scheduled', calendar_event_id: '' }, '-created_date', 50);
      let calendar = null;
      try {
        calendar = await base44.asServiceRole.connectors.getConnection('googlecalendar');
      } catch {
        return Response.json({ error: 'Google Calendar not connected. Authorize the googlecalendar connector first.' }, { status: 400 });
      }

      const accessToken = calendar.accessToken;
      let scheduled = 0;
      for (const task of schedules.slice(0, 20)) { // batch limit
        try {
          const event = {
            summary: `[${task.agent_name}] ${task.task_title}`,
            description: `${task.task_description || ''}\n\nPhase: ${task.playbook_phase}\nSystem: ${task.system_target || 'vision_cortex'}\nPayment: ${task.payment_amount} INF`,
            start: { dateTime: task.scheduled_start },
            end: { dateTime: task.scheduled_end },
            colorId: task.task_category === 'audit' ? '11' : task.task_category === 'fix' ? '5' : task.task_category === 'harden' ? '4' : '1'
          };
          const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
          });
          if (res.ok) {
            const data = await res.json();
            await sr.AgentSchedule.update(task.id, {
              calendar_event_id: data.id,
              calendar_event_url: data.htmlLink
            });
            scheduled++;
          }
        } catch (e) { /* skip on error */ }
      }

      return Response.json({ ok: true, action: 'schedule_calendar', scheduled, total: schedules.length });
    }

    // ── WHATSAPP: Send proactive notification ──
    if (action === 'whatsapp') {
      const { message, phone } = body;
      if (!message) return Response.json({ error: 'message required' }, { status: 400 });

      const commsKey = process.env.VISION_CORTEX_COMMS_API_KEY;
      if (!commsKey) return Response.json({ error: 'VISION_CORTEX_COMMS_API_KEY not set' }, { status: 500 });

      // Telnyx WhatsApp API
      const res = await fetch('https://api.telnyx.com/v2/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${commsKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.VISION_CORTEX_WHATSAPP_FROM || '+18000000000',
          to: phone || process.env.VISION_CORTEX_OWNER_PHONE || '',
          text: message,
          messaging_profile_id: process.env.VISION_CORTEX_MESSAGING_PROFILE || undefined
        })
      });

      if (!res.ok) {
        const err = await res.text();
        return Response.json({ error: `WhatsApp send failed: ${err}` }, { status: 500 });
      }

      return Response.json({ ok: true, action: 'whatsapp', sent: true });
    }

    // ── HOURLY SUMMARY: Generate and send hourly progress ──
    if (action === 'hourly_summary') {
      const schedules = await sr.AgentSchedule.list('-created_date', 200).catch(() => []);
      const lastHour = new Date(Date.now() - 60 * 60 * 1000);
      const recentTasks = schedules.filter(s => new Date(s.updated_date) > lastHour);
      const completed = recentTasks.filter(s => s.status === 'completed');
      const inProgress = schedules.filter(s => s.status === 'in_progress');

      const summary = `📊 VISION CORTEX — Hourly Summary\n\n` +
        `✅ Completed this hour: ${completed.length}\n` +
        `🔄 In progress: ${inProgress.length}\n` +
        `⏳ Scheduled: ${schedules.filter(s => s.status === 'scheduled').length}\n` +
        `❌ Failed: ${schedules.filter(s => s.status === 'failed').length}\n\n` +
        `Active agents:\n${inProgress.map(t => `• ${t.agent_name}: ${t.task_title} (${t.progress}%)`).join('\n') || 'None currently active'}`;

      // Try to send WhatsApp
      try {
        await base44.functions.invoke('companyOrchestrator', { action: 'whatsapp', message: summary });
      } catch {}

      return Response.json({ ok: true, action: 'hourly_summary', summary, completed: completed.length, in_progress: inProgress.length });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}