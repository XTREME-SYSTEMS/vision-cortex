import { createClientFromRequest, secrets } from '../../runtime/index';

// ============================================================================
// VALIDATION LOOP — Strategy agent cross-references proposed opportunities
// against the Master Vision, rewards logic, and industry analytics.
// Only marks an opportunity as "validated" when all three checks pass.
// ============================================================================

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Auth: admin user OR workflow context
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    if (user && user.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

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
      const pending = await sr.Opportunity.filter({ status: 'new' }, '-created_date', 50).catch(() => []);
      if (pending.length === 0) {
        return Response.json({ ok: true, action: 'validate_all', validated: 0, message: 'No pending opportunities to validate.' });
      }

      const results = [];
      let validatedCount = 0;
      for (const opp of pending) {
        const result = await runValidation(sr, opp, base44);
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
async function runValidation(sr, opp, base44) {
  // 1. Load the Master Vision and protocol
  const plans = await sr.MasterPlan.list('-created_date', 1).catch(() => []);
  const vision = plans[0]?.vision || '';
  const protocol = plans[0]?.protocol || '';

  // 2. Load rewards logic (recent agent payments + active agent profiles)
  const recentPayments = await sr.AgentPayment.list('-created_date', 10).catch(() => []);
  const agentProfiles = await sr.AgentProfile.list('-order', 5).catch(() => []);

  // 3. Build comprehensive prompt with all opportunity data
  const oppResearch = opp.research ? JSON.stringify(opp.research).slice(0, 500) : 'None';
  const oppKeywords = opp.keywords?.length ? opp.keywords.join(', ') : 'None';

  const prompt = `You are the Strategy Validator for Vision Cortex, an autonomous AI business operating system.

MASTER VISION:
${vision.slice(0, 2000)}

OPERATING PROTOCOL:
${protocol.slice(0, 1000)}

RECENT REWARD PATTERNS (agent payments for completed work):
${JSON.stringify(recentPayments.slice(0, 5).map(p => ({ agent: p.agent_name, amount: p.amount, type: p.payment_type })))}

ACTIVE AGENT PROFILES (roles and capabilities):
${JSON.stringify(agentProfiles.map(a => ({ name: a.name, role: a.role, archetype: a.archetype })))}

OPPORTUNITY TO VALIDATE:
Title: ${opp.title || 'Untitled'}
Description: ${(opp.description || '').slice(0, 1000)}
Source: ${opp.source || 'unknown'}
Industry: ${opp.industry || opp.sub_industry || 'unknown'}
Budget: ${opp.budget || 'Not specified'}
Location: ${opp.location || 'Not specified'}
Keywords: ${oppKeywords}
Research: ${oppResearch}
Current Score: ${opp.score || 'N/A'}

VALIDATION RUBRIC — Score each dimension:
1. VISION ALIGNMENT: Does this opportunity advance the master vision? Consider the core mission, target markets, and strategic goals.
2. REWARDS ALIGNMENT: Does pursuing this align with how agents are compensated and what drives value? Consider the reward patterns and agent capabilities.
3. INDUSTRY FIT: Is this a real, viable opportunity in the current market? Consider industry trends, budget realism, and competitive landscape.
4. FEASIBILITY: Can the agent swarm realistically deliver this? Consider required skills, timeline, and resource availability.
5. PROFITABILITY: Is the potential revenue worth the investment of agent time and resources?

Respond as JSON with this exact schema:
{
  "validated": boolean,
  "confidence": number (0-1),
  "vision_alignment": "high" | "medium" | "low" | "none",
  "rewards_alignment": "high" | "medium" | "low" | "none",
  "industry_fit": "strong" | "moderate" | "weak" | "unknown",
  "feasibility": "high" | "medium" | "low",
  "profitability": "high" | "medium" | "low",
  "reasoning": "3-4 sentence explanation covering all dimensions",
  "recommended_action": "pursue" | "monitor" | "reject" | "refine"
}`;

  // 4. Try Groq LLM first, then fallback to Core.InvokeLLM
  let llmResult = { validated: false, confidence: 0, reasoning: 'LLM unavailable', industry_fit: 'unknown' };

  const groqKey = secrets.get('AI_GATEWAY_API_KEY') || (secrets.get('AI_GATEWAY_API_KEY') || '');
  if (groqKey) {
    try {
      const llmRes = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash',
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
      llmResult = { validated: false, confidence: 0, reasoning: `Groq error: ${e.message}`, industry_fit: 'unknown' };
    }
  }

  // Fallback to Core.InvokeLLM if Groq failed or unavailable
  if (!groqKey || llmResult.reasoning?.includes('unavailable') || llmResult.reasoning?.includes('error')) {
    try {
      const coreResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            validated: { type: 'boolean' },
            confidence: { type: 'number' },
            vision_alignment: { type: 'string' },
            rewards_alignment: { type: 'string' },
            industry_fit: { type: 'string' },
            feasibility: { type: 'string' },
            profitability: { type: 'string' },
            reasoning: { type: 'string' },
            recommended_action: { type: 'string' }
          }
        }
      });
      if (coreResult) {
        llmResult = typeof coreResult === 'string' ? JSON.parse(coreResult) : coreResult;
      }
    } catch (e) {
      // Both LLM providers failed
    }
  }

  // 5. Determine final validation — all three core checks must pass
  const visionOk = llmResult.vision_alignment === 'high' || llmResult.vision_alignment === 'medium';
  const rewardsOk = llmResult.rewards_alignment === 'high' || llmResult.rewards_alignment === 'medium';
  const industryOk = llmResult.industry_fit === 'strong' || llmResult.industry_fit === 'moderate';
  const finalValidated = visionOk && rewardsOk && industryOk && (llmResult.confidence || 0) >= 0.6;

  // 6. Update the opportunity with validation results
  const updateData = {
    status: finalValidated ? 'validated' : 'rejected',
    validation_confidence: llmResult.confidence || 0,
    validation_reasoning: llmResult.reasoning || '',
  };
  try {
    await sr.Opportunity.update(opp.id, updateData);
  } catch (e) {}

  return {
    opportunity_id: opp.id,
    title: opp.title,
    validated: finalValidated,
    confidence: llmResult.confidence || 0,
    vision_alignment: llmResult.vision_alignment || 'unknown',
    rewards_alignment: llmResult.rewards_alignment || 'unknown',
    industry_fit: llmResult.industry_fit || 'unknown',
    feasibility: llmResult.feasibility || 'unknown',
    profitability: llmResult.profitability || 'unknown',
    reasoning: llmResult.reasoning || '',
    recommended_action: llmResult.recommended_action || 'refine'
  };
}