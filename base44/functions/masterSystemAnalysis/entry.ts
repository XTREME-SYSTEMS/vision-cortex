import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// masterSystemAnalysis — scans ALL Vision Cortex systems for failures,
// stagnation, missing features, and improvement opportunities.
// Creates SystemEnhancement records for findings. Runs every 4h via workflow.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const core = base44.asServiceRole.integrations.Core;
    const findings = [];

    // ── 1. Check for failed/stagnant entities ──
    const failedEnhancements = await base44.asServiceRole.entities.SystemEnhancement.filter(
      { status: 'failed' },
      '-created_date',
      10
    );
    if (failedEnhancements.length > 0) {
      findings.push({
        title: `Auto-Heal: ${failedEnhancements.length} failed enhancements need retry`,
        description: `${failedEnhancements.length} SystemEnhancement records are in failed status. Review and retry with fix directives.`,
        category: 'healing',
        priority: 1,
        existing_system: 'Failed enhancements are not auto-retried.',
        downfall: 'Failed enhancements block the pipeline.',
        recommended_enhancement: 'Auto-retry failed enhancements with refined prompts based on blocked_reason.'
      });
    }

    // ── 2. Check Factory projects stuck in early stages ──
    const factoryProjects = await base44.asServiceRole.entities.FactoryProject.list('-created_date', 50);
    const stuckProjects = factoryProjects.filter(p => {
      const stages = ['seeded', 'researched', 'branded'];
      return stages.includes(p.stage) && Date.now() - new Date(p.updated_date).getTime() > 24 * 60 * 60 * 1000;
    });
    if (stuckProjects.length > 0) {
      findings.push({
        title: `Factory: ${stuckProjects.length} projects stuck in early stages >24h`,
        description: 'Projects not advancing through the pipeline. May need manual intervention or auto-advance workflow.',
        category: 'healing',
        priority: 2,
        existing_system: 'No auto-advance for Factory projects.',
        downfall: 'Projects stall and never complete.',
        recommended_enhancement: 'Create Factory auto-advance workflow that progresses stuck projects.'
      });
    }

    // ── 3. Check Vision Pipelines stuck in progress ──
    const activePipelines = await base44.asServiceRole.entities.VisionPipeline.filter(
      { status: 'active' },
      '-created_date',
      10
    );
    const stuckPipelines = activePipelines.filter(p =>
      !['complete', 'failed'].includes(p.stage) &&
      Date.now() - new Date(p.updated_date).getTime() > 48 * 60 * 60 * 1000
    );
    if (stuckPipelines.length > 0) {
      findings.push({
        title: `Auto-Builder: ${stuckPipelines.length} pipelines stuck >48h`,
        description: 'Vision pipelines not advancing. The Vision Pipeline Cycle workflow may need checking.',
        category: 'healing',
        priority: 1,
        existing_system: 'Pipelines can stall without auto-recovery.',
        downfall: 'Stuck pipelines block the autonomous build queue.',
        recommended_enhancement: 'Add auto-recovery to stuck pipelines: retry current stage or mark as failed.'
      });
    }

    // ── 4. Check for old AgentLogs with errors ──
    const errorLogs = await base44.asServiceRole.entities.AgentLog.filter(
      { level: 'error', resolved: false },
      '-created_date',
      10
    );
    if (errorLogs.length > 0) {
      findings.push({
        title: `Healing: ${errorLogs.length} unresolved error logs`,
        description: 'Agent error logs that have not been resolved. May indicate systemic issues.',
        category: 'healing',
        priority: 2,
        existing_system: 'Error logs are not auto-resolved.',
        downfall: 'Errors accumulate without resolution.',
        recommended_enhancement: 'Auto-resolve or auto-fix recurring error patterns.'
      });
    }

    // ── 5. LLM-powered holistic system scan ──
    const systemState = {
      factory_projects: factoryProjects.length,
      factory_stages: factoryProjects.reduce((acc, p) => { acc[p.stage] = (acc[p.stage] || 0) + 1; return acc; }, {}),
      active_pipelines: activePipelines.length,
      pipeline_stages: activePipelines.reduce((acc, p) => { acc[p.stage] = (acc[p.stage] || 0) + 1; return acc; }, {}),
      failed_enhancements: failedEnhancements.length,
      unresolved_errors: errorLogs.length,
      pending_enhancements: (await base44.asServiceRole.entities.SystemEnhancement.filter({ status: 'pending' }, '-created_date', 5)).length,
    };

    const scanPrompt = `You are the Vision Cortex system analyst. Analyze this system state and identify the TOP 3 most critical improvements needed.

SYSTEM STATE:
${JSON.stringify(systemState, null, 2)}

For each finding, provide:
1. A clear title
2. Why it matters
3. What to do about it
4. Priority (1 = critical, 2 = important, 3 = nice-to-have)

Focus on: reliability gaps, automation opportunities, quality improvements, and system integration issues.

Return JSON:
{
  "findings": [
    {
      "title": "...",
      "description": "...",
      "recommended_enhancement": "...",
      "category": "feature|hardening|optimization|healing|automation|integration",
      "priority": 1
    }
  ]
}`;

    const scanResult = await core.InvokeLLM({
      prompt: scanPrompt,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          findings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                recommended_enhancement: { type: 'string' },
                category: { type: 'string' },
                priority: { type: 'number' }
              }
            }
          }
        },
        required: ['findings']
      }
    });

    findings.push(...(scanResult.findings || []));

    // ── Create SystemEnhancement records for all findings ──
    const created = [];
    for (const finding of findings) {
      const existing = await base44.asServiceRole.entities.SystemEnhancement.filter(
        { title: finding.title },
        '-created_date',
        1
      );
      if (existing.length === 0) {
        const record = await base44.asServiceRole.entities.SystemEnhancement.create({
          ...finding,
          status: 'pending',
          source: 'master_analysis'
        });
        created.push(record.id);
      }
    }

    // ── Log the scan ──
    await base44.asServiceRole.entities.AgentLog.create({
      agent_name: 'Autonomous Builder',
      level: 'info',
      category: 'master_analysis',
      message: `Master system analysis complete — ${findings.length} findings, ${created.length} new enhancements logged`,
      detail: findings.map(f => f.title).join('; ')
    });

    return Response.json({
      findings: findings.length,
      new_enhancements: created.length,
      titles: findings.map(f => f.title)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}