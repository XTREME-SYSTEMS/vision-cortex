import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// autoRecommendAllSystems — persistent gap generation with implementation code.
// Scans all systems, identifies what's missing, generates recommendations WITH
// full implementation code, creates Gap records. Runs every 12h via workflow.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const core = base44.asServiceRole.integrations.Core;

    // ── Gather current system state ──
    const [enhancements, gaps, factoryProjects, pipelines, agents] = await Promise.all([
      base44.asServiceRole.entities.SystemEnhancement.list('-created_date', 30),
      base44.asServiceRole.entities.Gap.list('-created_date', 20),
      base44.asServiceRole.entities.FactoryProject.list('-created_date', 10),
      base44.asServiceRole.entities.VisionPipeline.filter({ status: 'active' }, '-created_date', 5),
      base44.asServiceRole.entities.AgentProfile.list('order', 20)
    ]);

    const existingEnhancementTitles = enhancements.map(e => e.title);
    const existingGapTitles = gaps.map(g => g.title);

    // ── LLM-powered gap analysis with implementation code ──
    const recommendPrompt = `You are the Vision Cortex auto-recommendation engine. Your job is to identify what the system is MISSING and generate recommendations WITH full implementation code.

CURRENT SYSTEM STATE:
- SystemEnhancements logged: ${enhancements.length} (${enhancements.filter(e => e.status === 'pending').length} pending, ${enhancements.filter(e => e.status === 'implemented').length} implemented)
- Existing gaps: ${gaps.length}
- Factory projects: ${factoryProjects.length}
- Active pipelines: ${pipelines.length}
- Agents: ${agents.map(a => a.name).join(', ')}

EXISTING ENHANCEMENT TITLES (don't duplicate):
${existingEnhancementTitles.slice(0, 20).join('\n')}

EXISTING GAP TITLES (don't duplicate):
${existingGapTitles.slice(0, 15).join('\n')}

FACTORY PROJECT STAGES:
${factoryProjects.reduce((acc, p) => { acc[p.stage] = (acc[p.stage] || 0) + 1; return acc; }, {})}

Identify 5 NEW gaps that don't exist yet. For each gap, generate:
1. A clear title
2. Description of the gap
3. Category (deployment, monetization, automation, ux, integration, data, security, other)
4. Severity (critical, high, medium, low)
5. Recommendation
6. Implementation steps (array)
7. **Full implementation_code** — production-ready code that implements this gap. Use Base44 SDK patterns (base44.entities.EntityName, base44.asServiceRole.integrations.Core.InvokeLLM). Write complete functions.
8. Affected files (array of paths)
9. Estimated effort (small, medium, large)

Focus on: missing automation, quality gaps, integration opportunities, and 24/7 operation improvements.

Return JSON:
{
  "gaps": [
    {
      "title": "...",
      "description": "...",
      "category": "...",
      "severity": "...",
      "recommendation": "...",
      "implementation_steps": ["step1", "step2"],
      "implementation_code": "...full code...",
      "affected_files": ["path/to/file"],
      "estimated_effort": "medium"
    }
  ]
}`;

    const result = await core.InvokeLLM({
      prompt: recommendPrompt,
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          gaps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                category: { type: 'string' },
                severity: { type: 'string' },
                recommendation: { type: 'string' },
                implementation_steps: { type: 'array', items: { type: 'string' } },
                implementation_code: { type: 'string' },
                affected_files: { type: 'array', items: { type: 'string' } },
                estimated_effort: { type: 'string' }
              }
            }
          }
        },
        required: ['gaps']
      }
    });

    // ── Create Gap records (skip duplicates) ──
    const created = [];
    for (const gap of result.gaps || []) {
      if (!existingGapTitles.includes(gap.title)) {
        // Get the next gap number
        const allGaps = await base44.asServiceRole.entities.Gap.list('-created_date', 1);
        const nextNumber = (allGaps[0]?.number || 0) + 1;

        const record = await base44.asServiceRole.entities.Gap.create({
          ...gap,
          number: nextNumber,
          status: 'recommended'
        });
        created.push(record.id);
      }
    }

    // ── Log ──
    await base44.asServiceRole.entities.AgentLog.create({
      agent_name: 'Autonomous Builder',
      level: 'success',
      category: 'auto_recommend',
      message: `Auto-recommend complete — ${result.gaps?.length || 0} gaps identified, ${created.length} new gaps created with implementation code`,
    });

    return Response.json({
      gaps_identified: result.gaps?.length || 0,
      new_gaps: created.length,
      titles: (result.gaps || []).map(g => g.title)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}