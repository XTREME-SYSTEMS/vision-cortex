import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// implementEnhancement — takes an approved SystemEnhancement record, generates
// implementation code, validates it against the recommended enhancement, and
// auto-fixes until it reaches 100% capability or exhausts max_fix_attempts.
// This is the programmatic implement → validate → auto-fix loop.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const core = base44.asServiceRole.integrations.Core;

    const body = await req.json().catch(() => ({}));
    const { enhancement_id } = body;
    if (!enhancement_id) return Response.json({ error: 'enhancement_id required' }, { status: 400 });

    const enhancement = await base44.entities.SystemEnhancement.get(enhancement_id);
    if (!enhancement) return Response.json({ error: 'Enhancement not found' }, { status: 404 });

    // --- Step 1: Generate implementation code ---
    await base44.entities.SystemEnhancement.update(enhancement_id, {
      status: 'in_progress',
      last_action_at: new Date().toISOString(),
    });

    const implRes = await core.InvokeLLM({
      prompt: `Generate production-ready implementation code for this system enhancement. The code must be complete, deployable, and achieve the enhancement at its highest potential.

ENHANCEMENT: ${enhancement.title}
EXISTING SYSTEM: ${enhancement.existing_system || 'N/A'}
DOWNFALL: ${enhancement.downfall || 'N/A'}
RECOMMENDED: ${enhancement.recommended_enhancement || 'N/A'}
TECHNICAL PROTOCOLS: ${(enhancement.technical_protocols || []).join(', ')}

Generate the implementation code and a brief note on what it does.`,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          implementation_code: { type: 'string', description: 'The complete implementation code' },
          implementation_notes: { type: 'string', description: 'Brief notes on what was implemented' },
        },
        required: ['implementation_code', 'implementation_notes'],
      },
    });

    let currentCode = implRes.implementation_code;
    let currentNotes = implRes.implementation_notes;

    await base44.entities.SystemEnhancement.update(enhancement_id, {
      implementation_code: currentCode,
      implementation_notes: currentNotes,
      status: 'validating',
      last_action_at: new Date().toISOString(),
    });

    // --- Step 2: Validate + auto-fix loop ---
    let score = 0;
    let attempts = 0;
    const maxAttempts = enhancement.max_fix_attempts || 3;
    let failures = [];
    let valNotes = '';

    while (score < 100 && attempts < maxAttempts) {
      attempts++;
      const valRes = await core.InvokeLLM({
        prompt: `You are a strict validator. Score this implementation 0-100 on how well it achieves the recommended enhancement at its highest potential. If not 100%, list every specific failure that must be fixed.

ENHANCEMENT: ${enhancement.title}
RECOMMENDED: ${enhancement.recommended_enhancement || 'N/A'}
TECHNICAL PROTOCOLS: ${(enhancement.technical_protocols || []).join(', ')}

IMPLEMENTATION CODE:
${currentCode}

Score and list failures:`,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            score: { type: 'number', description: '0-100' },
            failures: { type: 'array', items: { type: 'string' } },
            notes: { type: 'string' },
          },
          required: ['score', 'failures'],
        },
      });

      score = valRes.score || 0;
      failures = valRes.failures || [];
      valNotes = valRes.notes || '';

      if (score < 100 && attempts < maxAttempts) {
        // Auto-fix: regenerate code addressing the failures
        const fixRes = await core.InvokeLLM({
          prompt: `The implementation scored ${score}/100. Fix EVERY failure below and regenerate the complete code. The new code must score 100/100.

FAILURES:
${failures.join('\n')}

ORIGINAL CODE:
${currentCode}

RECOMMENDED: ${enhancement.recommended_enhancement || 'N/A'}
TECHNICAL PROTOCOLS: ${(enhancement.technical_protocols || []).join(', ')}

Regenerate the complete code fixing all failures:`,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              implementation_code: { type: 'string' },
              implementation_notes: { type: 'string' },
            },
            required: ['implementation_code'],
          },
        });
        currentCode = fixRes.implementation_code;
        currentNotes = (fixRes.implementation_notes || '') + ` (fix attempt ${attempts})`;
      }
    }

    const passed = score >= 100;

    await base44.entities.SystemEnhancement.update(enhancement_id, {
      implementation_code: currentCode,
      implementation_notes: currentNotes,
      status: passed ? 'audited' : 'failed',
      audit_result: { passed, score, failures },
      fix_attempts: attempts,
      last_action_at: new Date().toISOString(),
    });

    await base44.entities.AgentLog.create({
      agent_name: 'System Analyst',
      level: passed ? 'success' : 'error',
      category: 'enhancement_implementation',
      message: `Enhancement #${enhancement.number} "${enhancement.title}" — ${passed ? 'VALIDATED at 100% capability' : `FAILED at ${score}% after ${attempts} attempt(s)`}.`,
      detail: failures.length ? `Failures: ${failures.join('; ')}` : valNotes,
    });

    return Response.json({
      enhancement_id,
      score,
      passed,
      attempts,
      failures,
      implementation_code: currentCode,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}