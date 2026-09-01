import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// autoEnhanceAll — the autonomous implementation engine.
// Picks top N pending SystemEnhancement records, generates implementation code,
// validates, and marks as implemented or failed. Runs 24/7 via workflow.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { max_per_run = 3, priority_filter } = body;

    const core = base44.asServiceRole.integrations.Core;

    // ── Fetch pending enhancements (top N by priority) ──
    const allPending = await base44.asServiceRole.entities.SystemEnhancement.filter(
      { status: 'pending' },
      'priority',
      20
    );

    // Filter by priority if specified
    const pending = (priority_filter
      ? allPending.filter(e => e.priority <= priority_filter)
      : allPending
    ).slice(0, max_per_run);

    if (pending.length === 0) {
      return Response.json({ message: 'No pending enhancements to implement', implemented: 0 });
    }

    const results = [];

    for (const enhancement of pending) {
      try {
        // Mark as in_progress
        await base44.asServiceRole.entities.SystemEnhancement.update(enhancement.id, {
          status: 'in_progress',
          last_action_at: new Date().toISOString()
        });

        // ── Generate implementation code ──
        const implPrompt = `You are an autonomous code implementation engine for Vision Cortex.
Implement this system enhancement with production-ready code.

ENHANCEMENT:
- Title: ${enhancement.title}
- Description: ${enhancement.description}
- Existing System: ${enhancement.existing_system || 'N/A'}
- Downfall: ${enhancement.downfall || 'N/A'}
- Recommended Enhancement: ${enhancement.recommended_enhancement || enhancement.description}
- Category: ${enhancement.category}

Generate:
1. **implementation_code** — The actual code to implement this enhancement. If it's a backend function, write the full entry.ts. If it's a shared module, write the full module. If it's a frontend component, write the full component. If it's a workflow, describe the workflow JSON. Use real Base44 SDK patterns (base44.entities, base44.asServiceRole.integrations.Core).
2. **implementation_plan** — Step-by-step plan: what files to create, what to update, what to test.
3. **affected_files** — List of file paths that need to be created or modified.
4. **validation_criteria** — How to validate this implementation works (specific testable criteria).
5. **estimated_impact** — What this enhancement improves (quality, reliability, automation, etc.).

Return JSON:
{
  "implementation_code": "...full code...",
  "implementation_plan": "1. Create file X... 2. Update Y...",
  "affected_files": ["path/to/file.ts", ...],
  "validation_criteria": ["criterion 1", "criterion 2", ...],
  "estimated_impact": "This enhancement improves..."
}`;

        const implResult = await core.InvokeLLM({
          prompt: implPrompt,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              implementation_code: { type: 'string' },
              implementation_plan: { type: 'string' },
              affected_files: { type: 'array', items: { type: 'string' } },
              validation_criteria: { type: 'array', items: { type: 'string' } },
              estimated_impact: { type: 'string' }
            },
            required: ['implementation_code', 'implementation_plan', 'validation_criteria']
          }
        });

        // ── Validate the implementation (LLM self-audit) ──
        const validationPrompt = `You are a code validator. Audit this implementation against the enhancement requirements.

ENHANCEMENT: ${enhancement.title}
IMPLEMENTATION CODE:
${implResult.implementation_code?.slice(0, 3000)}

VALIDATION CRITERIA:
${implResult.validation_criteria?.join('\n')}

Score this implementation 0-100 on:
- Completeness (does it address the full enhancement?)
- Code quality (is it production-ready?)
- Safety (could it break anything?)
- Deployability (can it be applied directly?)

Return JSON: { "passed": boolean, "score": 0-100, "failures": [string], "fix_directives": [string] }`;

        const validation = await core.InvokeLLM({
          prompt: validationPrompt,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              passed: { type: 'boolean' },
              score: { type: 'number' },
              failures: { type: 'array', items: { type: 'string' } },
              fix_directives: { type: 'array', items: { type: 'string' } }
            },
            required: ['passed', 'score']
          }
        });

        // ── Update the enhancement record ──
        const updateData = {
          implementation_code: implResult.implementation_code,
          implementation_plan: implResult.implementation_plan,
          implementation_notes: implResult.estimated_impact,
          audit_result: {
            passed: validation.passed,
            score: validation.score,
            failures: validation.failures || []
          },
          last_action_at: new Date().toISOString()
        };

        if (validation.passed && validation.score >= 80) {
          updateData.status = 'implemented';
        } else if ((enhancement.fix_attempts || 0) + 1 >= (enhancement.max_fix_attempts || 3)) {
          updateData.status = 'failed';
          updateData.blocked_reason = `Max fix attempts reached. Score: ${validation.score}`;
        } else {
          updateData.status = 'validating';
          updateData.fix_attempts = (enhancement.fix_attempts || 0) + 1;
          updateData.blocked_reason = validation.failures?.join('; ');
        }

        await base44.asServiceRole.entities.SystemEnhancement.update(enhancement.id, updateData);

        // ── Log to AgentLog ──
        await base44.asServiceRole.entities.AgentLog.create({
          agent_name: 'Autonomous Builder',
          level: validation.passed ? 'success' : 'warn',
          category: 'auto_enhance',
          message: `Enhancement "${enhancement.title}" — score ${validation.score} — status: ${updateData.status}`,
          detail: validation.failures?.join('; ') || 'Passed validation'
        });

        results.push({
          id: enhancement.id,
          title: enhancement.title,
          score: validation.score,
          status: updateData.status,
          passed: validation.passed
        });

      } catch (e) {
        await base44.asServiceRole.entities.SystemEnhancement.update(enhancement.id, {
          status: 'failed',
          blocked_reason: e.message,
          last_action_at: new Date().toISOString()
        });
        results.push({ id: enhancement.id, title: enhancement.title, error: e.message });
      }
    }

    return Response.json({
      implemented: results.filter(r => r.status === 'implemented').length,
      validating: results.filter(r => r.status === 'validating').length,
      failed: results.filter(r => r.status === 'failed').length,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}