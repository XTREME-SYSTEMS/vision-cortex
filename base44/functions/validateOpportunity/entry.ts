import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// ============================================================================
// VALIDATION LOOP — Strategy agent cross-references proposed opportunities
// against the Master Vision, rewards logic, and industry analytics.
// Only marks an opportunity as "validated" when all three checks pass.
// ============================================================================

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'validate_all';
    const sr = base44.asServiceRole.entities;

    // ─── VALIDATE A SINGLE OPPORTUNITY ─────────────────────────────────
    if (action === 'validate_one') {
      const { opportunity_id } = body;
      if (!opportunity_id) return Response.json({ error: 'opportunity_id required' }, { status: 400 });

      const opp = await sr.Opportunity.get(opportunity_id);
      if (!opp) return Response.json({ error: 'Opportunity not found' }, { status: 404 });

      const result = await runValidation(sr, opp);
      return Response.json({ ok: true, action: 'validate_one', ...result });
    }

    // ─── VALIDATE ALL PENDING OPPORTUNITIES ────────────────────────────
    if (action === 'validate_all') {
      const pending = await sr.Opportunity.filter({ status: 'pending' }, '-created_date', 50).catch(() => []);
      if (pending.length === 0) {
        return Response.json({ ok: true, action: 'validate_all', validated: 0, message: 'No pending opportunities to validate.' });
      }

      const results = [];
      let validatedCount = 0;
      for (const opp of pending) {
        const result = await runValidation(sr, opp);
        results.push({ id: opp.id, title: opp.title || opp.name, ...result });
        if (result.validated) validatedCount++;
      }

      return Response.json({
        ok: true,
        action: 'validate_all',
        total: pending.length,
        validated: validatedCount,
        rejected: pending.length - validatedCount,
        results
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ─── CORE VALIDATION LOGIC ───────────────────────────────────────────────
async function runValidation(sr, opp) {
  // 1. Load the Master Vision
  const plans = await sr.MasterPlan.list('-created_date', 1).catch(() => []);
  const vision = plans[0]?.vision || '';
  const protocol = plans[0]?.protocol || '';

  // 2. Load rewards logic (recent agent payments + reward calculations)
  const recentPayments = await sr.AgentPayment.list('-created_date', 10).catch(() => []);

  // 3. Cross-reference with industry analytics via Groq LLM
  const groqKey = secrets.get('GROQ_API_KEY');
  let llmResult = { validated: false, confidence: 0, reasoning: 'LLM unavailable', industry_fit: 'unknown' };

  if (groqKey) {
    const prompt = `You are the Strategy Validator for Vision Cortex, an autonomous AI business operating system.

MASTER VISION:
${vision.slice(0, 1500)}

OPERATING PROTOCOL:
${protocol.slice(0, 800)}

RECENT REWARD PATTERNS (agent payments for completed work):
${JSON.stringify(recentPayments.slice(0, 5).map(p => ({ agent: p.agent_name, amount: p.amount, type: p.payment_type })))}

OPPORTUNITY TO VALIDATE:
Title: ${opp.title || opp.name || 'Untitled'}
Description: ${(opp.description || opp.summary || '').slice(0, 800)}
Category: ${opp.category || opp.vertical || 'unknown'}
Score: ${opp.score || opp.priority_score || 'N/A'}

TASK: Cross-reference this opportunity against (1) the master vision alignment, (2) the rewards logic (does pursuing this align with how agents are compensated and what drives value), and (3) industry analytics — is this a real, viable opportunity in the current market?

Respond as JSON with this exact schema:
{
  "validated": boolean,
  "confidence": number (0-1),
  "vision_alignment": "high" | "medium" | "low" | "none",
  "rewards_alignment": "high" | "medium" | "low" | "none",
  "industry_fit": "strong" | "moderate" | "weak" | "unknown",
  "reasoning": "2-3 sentence explanation",
  "recommended_action": "pursue" | "monitor" | "reject" | "refine"
}`;

    try {
      const llmRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      });
      if (llmRes.ok) {
        const llmData = await llmRes.json();
        const content = llmData.choices?.[0]?.message?.content || '{}';
        llmResult = JSON.parse(content);
      }
    } catch (e) {
      llmResult = { validated: false, confidence: 0, reasoning: `LLM error: ${e.message}`, industry_fit: 'unknown' };
    }
  }

  // 4. Determine final validation — all three checks must pass
  const visionOk = llmResult.vision_alignment === 'high' || llmResult.vision_alignment === 'medium';
  const rewardsOk = llmResult.rewards_alignment === 'high' || llmResult.rewards_alignment === 'medium';
  const industryOk = llmResult.industry_fit === 'strong' || llmResult.industry_fit === 'moderate';
  const finalValidated = visionOk && rewardsOk && industryOk && (llmResult.confidence || 0) >= 0.6;

  // 5. Update the opportunity
  const updateData = {
    status: finalValidated ? 'validated' : 'rejected',
    ...(opp.score !== undefined ? {} : {}),
  };
  try {
    await sr.Opportunity.update(opp.id, updateData);
  } catch (e) {
    // Status field may differ — try best effort
  }

  return {
    opportunity_id: opp.id,
    title: opp.title || opp.name,
    validated: finalValidated,
    confidence: llmResult.confidence || 0,
    vision_alignment: llmResult.vision_alignment || 'unknown',
    rewards_alignment: llmResult.rewards_alignment || 'unknown',
    industry_fit: llmResult.industry_fit || 'unknown',
    reasoning: llmResult.reasoning || '',
    recommended_action: llmResult.recommended_action || 'refine'
  };
}