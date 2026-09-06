import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';

async function groq(prompt, system) {
  const key = secrets.get('GROQ_API_KEY');
  if (!key) throw new Error('GROQ_API_KEY not set');
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], temperature: 0.3, max_tokens: 3000 })
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const d = await res.json();
  return d.choices[0].message.content;
}

// Financial advisor with mandatory validator.
// The advisor generates a recommendation; the validator MUST check off before any action.
// No action is ever taken without validator approval.
export default async function(req: any) {
  const base44 = createClientFromRequest(req);
  try {
    const u = await base44.auth.me();
    if (!u || u.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 401 });
  } catch {}

  const { order, context, portfolio_summary } = await req.json().catch(() => ({}));
  if (!order) return Response.json({ error: 'order required' }, { status: 400 });

  // === ADVISOR: Generate recommendation ===
  const advisorSystem = `You are Capital, the financial genius advisor of Vision Cortex. You analyze financial orders with deep expertise in markets, crypto, business finance, and risk management. Be specific, quantitative, and honest about risks.`;
  const advisorPrompt = `A financial order has been received. Analyze it and provide a recommendation.

ORDER: ${order}
CONTEXT: ${context || 'No additional context provided'}
PORTFOLIO SUMMARY: ${portfolio_summary || 'No portfolio data available'}

Provide your analysis as JSON:
{
  "recommendation": "BUY | SELL | HOLD | EXECUTE | REJECT | MODIFY",
  "confidence": 0.0-1.0,
  "rationale": "3-4 sentences explaining your reasoning",
  "expected_return": "estimated return or outcome",
  "risk_level": "low | medium | high | critical",
  "position_size": "recommended position size or allocation",
  "timeframe": "short | medium | long term",
  "alternatives": ["2-3 alternative strategies"],
  "stop_loss": "recommended stop loss level if applicable",
  "take_profit": "recommended take profit level if applicable"
}
Return ONLY valid JSON.`;

  let advisor;
  try {
    const resp = await groq(advisorPrompt, advisorSystem);
    advisor = JSON.parse(resp.replace(/```json|```/g, '').trim());
  } catch (e) {
    advisor = { recommendation: 'REJECT', rationale: 'Analysis failed: ' + e.message, confidence: 0, risk_level: 'critical' };
  }

  // === VALIDATOR: Must check off before any action ===
  const validatorSystem = `You are Validator, the independent risk and compliance checker of Vision Cortex. You MUST verify every financial order before it executes. You are conservative, thorough, and never rubber-stamp. If there is ANY risk of loss, fraud, or error, you REJECT or require modifications.`;
  const validatorPrompt = `A financial advisor has recommended an action. You MUST validate it before execution.

ORIGINAL ORDER: ${order}
ADVISOR RECOMMENDATION: ${JSON.stringify(advisor)}

Perform your validation as JSON:
{
  "verdict": "APPROVED | APPROVED_WITH_NOTES | REJECTED",
  "checks_passed": ["list of checks that passed"],
  "checks_failed": ["list of checks that failed or need attention"],
  "risk_assessment": "1-2 sentence risk assessment",
  "required_modifications": ["any changes needed before execution, empty if none"],
  "final_approval": true/false
}
The action CANNOT execute unless final_approval is true.
Return ONLY valid JSON.`;

  let validation;
  try {
    const resp = await groq(validatorPrompt, validatorSystem);
    validation = JSON.parse(resp.replace(/```json|```/g, '').trim());
  } catch (e) {
    validation = { verdict: 'REJECTED', final_approval: false, checks_failed: ['Validator error: ' + e.message] };
  }

  // Log the advisory session
  try {
    await base44.asServiceRole.entities.AgentLog.create({
      agent_name: 'CAPITAL',
      category: 'financial_advisory',
      level: validation.final_approval ? 'success' : 'warn',
      message: `Order: "${order.substring(0, 80)}" → Advisor: ${advisor.recommendation} | Validator: ${validation.verdict}`,
      detail: JSON.stringify({ advisor, validation })
    });
  } catch {}

  return Response.json({
    order,
    advisor,
    validation,
    can_execute: validation.final_approval === true,
    message: validation.final_approval
      ? `✓ APPROVED — Advisor recommends ${advisor.recommendation}, Validator cleared for execution`
      : `✗ NOT APPROVED — ${validation.verdict}: ${(validation.checks_failed || []).join('; ')}`
  });
}