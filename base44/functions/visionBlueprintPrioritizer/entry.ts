import {createClientFromRequest, requireAdminOrWebhook, secrets} from '../../runtime/index';

// ============================================================================
// VISION BLUEPRINT PRIORITIZER — Reads the MasterPlan (vision) and all
// CoreDocuments (blueprint, architecture, governance), uses LLM to strategically
// categorize and dissect everything into a priority system (P0-P3), then
// creates AgentSchedule tasks assigned to the appropriate agents.
// Managed by: Omni-Architect (the architect of the system).
// ============================================================================

const PRIORITY_MAP = { P0: 1, P1: 2, P2: 3, P3: 4 };

const CATEGORY_TO_AGENT = {
  audit: 'Alpha-Inquisitor',
  fix: 'Forge-Smith',
  harden: 'Aegis-Sentinel',
  optimize: 'Omni-Architect',
  build: 'Builder',
  intelligence: 'Prime-Oracle',
  comms: 'Ember-Diplomat',
  documentation: 'Omni-Architect',
  security: 'Sentinel',
  governance: 'Chief',
  strategy: 'Prime-Oracle',
  research: 'Nova-Cartographer',
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const authorizationError = await requireAdminOrWebhook(req);
    if (authorizationError) return authorizationError;

    const sr = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'prioritize';

    if (action === 'prioritize') {
      // 1. Read the vision (MasterPlan) and blueprint (CoreDocuments)
      const [plans, docs] = await Promise.all([
        sr.MasterPlan.list('-created_date', 3).catch(() => []),
        sr.CoreDocument.filter({ status: 'active' }, '-created_date', 50).catch(() => []),
      ]);

      const vision = plans[0]?.vision || 'No vision set';
      const architecture = plans[0]?.architecture || '';
      const protocol = plans[0]?.protocol || '';
      const missions = plans[0]?.missions || [];
      const nextActions = plans[0]?.next_actions || [];

      // Gather all blueprint documents
      const docSummaries = docs.map(d => `[${d.document_id}] ${d.title} (${d.document_type}, ${d.category}, priority: ${d.priority})`).join('\n');

      // 2. Use LLM to categorize everything into a priority system
      const prompt = `You are the Omni-Architect, the chief system architect of Vision Cortex — an autonomous AI business operating system.

Your job is to strategically categorize and dissect the vision, blueprint, and all system documents into a prioritized task system focused on getting all systems to 100%.

VISION:
${vision}

ARCHITECTURE:
${architecture || 'Not set'}

PROTOCOL:
${protocol ? protocol.slice(0, 2000) : 'Not set'}

CURRENT MISSIONS:
${missions.map(m => `- ${m.name}: ${m.description} (${m.status})`).join('\n') || 'None set'}

NEXT ACTIONS:
${nextActions.map(a => `- ${a}`).join('\n') || 'None set'}

ACTIVE DOCUMENTS:
${docSummaries || 'None'}

INSTRUCTIONS:
Dissect everything above into a prioritized task list. Focus on:
1. AUDIT items — things that need to be checked/verified
2. FIX items — broken things that need repair
3. HARDEN items — security/stability improvements
4. OPTIMIZE items — performance/efficiency improvements
5. ENHANCE items — feature improvements
6. DOCUMENT items — missing documentation

Do NOT include building or creation tasks — only audit, fix, harden, optimize, enhance, and document.

For each task, assign:
- priority: P0 (critical/blocking), P1 (high), P2 (medium), P3 (low)
- category: audit | fix | harden | optimize | enhance | documentation
- agent: the best agent for the job
- title: concise task title (prefixed with category)
- description: what needs to be done and why
- system_target: which system this targets

Return a JSON array of tasks. Maximum 30 tasks. Most critical first.

Response format (JSON only, no markdown):
[
  {
    "priority": "P0",
    "category": "fix",
    "agent": "Forge-Smith",
    "title": "FIX: Repair RLS gaps on 69 entities",
    "description": "69 entities lack Row-Level Security policies...",
    "system_target": "vision_cortex"
  }
]`;

      let prioritizedTasks = [];
      try {
        const groqRes = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(secrets.get('AI_GATEWAY_API_KEY') || '')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 4000,
            response_format: { type: 'json_object' }
          })
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          const content = data.choices?.[0]?.message?.content || '{}';
          const parsed = JSON.parse(content);
          prioritizedTasks = Array.isArray(parsed) ? parsed : (parsed.tasks || []);
        }
      } catch (e) {
        // Fallback: create basic tasks from missions and next_actions
        for (const m of missions) {
          if (m.status !== 'complete') {
            prioritizedTasks.push({
              priority: 'P1', category: 'audit', agent: 'Alpha-Inquisitor',
              title: `AUDIT: ${m.name}`, description: m.description, system_target: 'vision_cortex'
            });
          }
        }
        for (const a of nextActions) {
          prioritizedTasks.push({
            priority: 'P2', category: 'fix', agent: 'Forge-Smith',
            title: `FIX: ${a}`, description: a, system_target: 'vision_cortex'
          });
        }
      }

      // 3. Create AgentSchedule entries for each prioritized task
      let created = 0;
      let skipped = 0;
      for (const task of prioritizedTasks.slice(0, 30)) {
        const title = task.title || `${task.category.toUpperCase()}: ${task.description?.slice(0, 60) || 'Task'}`;
        const existing = await sr.AgentSchedule.filter({ task_title: title, status: { $in: ['scheduled', 'in_progress'] } }, '-created_date', 1).catch(() => []);
        if (existing[0]) { skipped++; continue; }

        try {
          await sr.AgentSchedule.create({
            agent_name: task.agent || CATEGORY_TO_AGENT[task.category] || 'Alpha-Inquisitor',
            task_title: title,
            task_description: `${task.description || ''}\n\nValidator: VALIDATOR\nPriority: ${task.priority}\nSource: Vision Blueprint Prioritizer`,
            task_category: task.category || 'audit',
            playbook_phase: task.category === 'audit' ? '1_audit' : task.category === 'fix' ? '2_fix' : task.category === 'harden' ? '3_harden' : '7_build_systems',
            status: 'scheduled',
            priority: PRIORITY_MAP[task.priority] || 3,
            scheduled_start: new Date().toISOString(),
            scheduled_end: new Date(Date.now() + 3600000).toISOString(),
            progress: 0,
            payment_amount: 100,
            system_target: task.system_target || 'vision_cortex',
          });
          created++;
        } catch {}
      }

      // Log the prioritization
      try {
        await sr.AgentLog.create({
          agent_name: 'Omni-Architect',
          level: 'success',
          message: `Vision/Blueprint prioritized: ${created} tasks created, ${skipped} duplicates skipped, ${prioritizedTasks.length} total analyzed`,
          auto_action: 'vision_prioritize',
        });
      } catch {}

      return Response.json({
        ok: true,
        action: 'prioritize',
        tasks_analyzed: prioritizedTasks.length,
        tasks_created: created,
        tasks_skipped: skipped,
        priority_breakdown: {
          P0: prioritizedTasks.filter(t => t.priority === 'P0').length,
          P1: prioritizedTasks.filter(t => t.priority === 'P1').length,
          P2: prioritizedTasks.filter(t => t.priority === 'P2').length,
          P3: prioritizedTasks.filter(t => t.priority === 'P3').length,
        },
        managed_by: 'Omni-Architect',
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}