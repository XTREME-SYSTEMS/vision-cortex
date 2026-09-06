import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const message = (body?.message || '').trim();
    const history = Array.isArray(body?.history) ? body.history.slice(-12) : [];

    if (!message) return Response.json({ error: 'Message required' }, { status: 400 });

    await base44.asServiceRole.entities.ChatMessage.create({
      author: user.full_name || user.email || 'Owner',
      author_type: 'user',
      content: message,
      kind: 'message',
    });

    const allAgents = await base44.asServiceRole.entities.AgentProfile.list('-order', 100);
    const primusProfile = allAgents.find((a) => (a.codename || '').toLowerCase() === 'primus' || (a.name || '').toLowerCase().includes('prime eden')) || {
      name: 'Prime Eden Skye',
      codename: 'PRIMUS',
      role: 'Primary orchestrator of Vision Cortex V-1 — API brain for all connected apps',
      personality: 'Decisive, loyal, proactive, ten steps ahead',
      mission: "Delegate to the right agents, validate every decision, have the owner's back, compound wealth and system growth. Manage info@hiddenpropertyintel.com across Google Workspace and WhatsApp.",
      intelligence_profile: 'Highest available reasoning, awareness, and intuition',
    };
    void primusProfile;

    const specialistNames = allAgents
      .filter((a) => {
        const lower = (a.name || '').toLowerCase();
        const codename = (a.codename || '').toLowerCase();
        return lower !== 'validator' && !lower.includes('prime eden') && codename !== 'primus';
      })
      .map((a) => a.name);

    const historyLines = history.map((h) => (h.author_type === 'user' ? 'Owner' : h.author) + ': ' + h.content).join('\n');
    const historyBlock = historyLines ? '\nRecent conversation:\n' + historyLines + '\n' : '';

    // STEP 1 — Primus decides delegation
    const delegationPrompt =
      'You are Prime Eden Skye (codename PRIMUS), the primary orchestrator of Vision Cortex V-1 and the API brain for all connected apps. The owner sent a message. Decide how to handle it.\n\n' +
      'Owner\'s message: """' + message + '"""\n' +
      historyBlock +
      '\nAvailable specialist agents: ' + specialistNames.join(', ') + '\n\n' +
      'Respond ONLY with a compact JSON object:\n' +
      '{\n' +
      '  "handle_directly": true|false,\n' +
      '  "delegate_to": ["agent names", ...],\n' +
      '  "plan": "one short sentence on what you will do",\n' +
      '  "needs_approval": true|false,\n' +
      '  "approval_reason": "why this needs owner approval before executing (if applicable)"\n' +
      '}\n' +
      'Rules:\n' +
      '- handle_directly=true for analysis, questions, status, reflection, monitoring — no delegation needed.\n' +
      '- delegate_to for specialist work (research, money, build, covert). Max 4 agents.\n' +
      '- needs_approval=true for any destructive write, external API call, provisioning, code change, or message send.\n' +
      '- Never include "primus" or "validator" in delegate_to.';

    const delegationRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: delegationPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          handle_directly: { type: 'boolean' },
          delegate_to: { type: 'array', items: { type: 'string' } },
          plan: { type: 'string' },
          needs_approval: { type: 'boolean' },
          approval_reason: { type: 'string' },
        },
      },
    });

    const plan = delegationRes || {};

    // STEP 2 — gather agent outputs (if delegating)
    const agentOutputs: any[] = [];
    const delegateNames = (plan.delegate_to || [])
      .filter((n) => {
        const lower = (n || '').toLowerCase();
        return lower && lower !== 'validator' && !lower.includes('prime eden') && lower !== 'primus';
      })
      .slice(0, 4);
    if (!plan.handle_directly && delegateNames.length > 0) {
      const selected = allAgents.filter((a) => delegateNames.includes(a.name));
      for (const agent of selected) {
        const prompt =
          'You are ' + agent.name + ', ' + (agent.role || 'a Vision Cortex agent') + '.\n' +
          (agent.mission ? 'Mission: ' + agent.mission + '\n' : '') +
          (agent.personality ? 'Personality: ' + agent.personality + '\n' : '') +
          '\nThe owner\'s request: """' + message + '"""\n' +
          historyBlock +
          '\nRespond in character, in clear American English, 2-5 sentences. Be specific and actionable. No filler.';
        try {
          const r = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
          const text = typeof r === 'string' ? r : r?.response || String(r || '');
          agentOutputs.push({ agent: agent.name, text, accent: agent.accent || null });
        } catch (e) {
          agentOutputs.push({ agent: agent.name, text: '[error: ' + e.message + ']', accent: agent.accent || null });
        }
      }
    }

    // STEP 3 — Primus synthesizes a unified response
    const outputsBlock = agentOutputs.length
      ? '\nSpecialist agent outputs:\n' + agentOutputs.map((o) => o.agent + ': ' + o.text).join('\n\n') + '\n'
      : '';
    const delegationLine = plan.delegate_to?.length
      ? 'You delegated to: ' + plan.delegate_to.join(', ')
      : 'You handled this directly.';

    const synthesisPrompt =
      'You are Prime Eden Skye (codename PRIMUS), the primary orchestrator of Vision Cortex V-1. Synthesize a single, unified, decisive response for the owner.\n\n' +
      'Owner\'s message: """' + message + '"""\n' +
      historyBlock +
      '\n' + delegationLine + '\n' +
      outputsBlock +
      '\nYour plan was: ' + (plan.plan || 'handle and respond') + '\n\n' +
      'Rules:\n' +
      '- Give ONE unified answer, not a list of agent replies. Synthesize the agents\' inputs into a single sharp response.\n' +
      '- If needs_approval was true, state clearly what you plan to do and ASK for explicit approval before executing. Never auto-execute.\n' +
      '- Be proactive: surface risks, opportunities, and next steps the owner hasn\'t asked about.\n' +
      '- Be concise but complete. American English, zero ambiguity, minimal emotion.';

    const synthRes = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: synthesisPrompt });
    const primusReply = typeof synthRes === 'string' ? synthRes : synthRes?.response || String(synthRes || '');

    // STEP 4 — Validator reviews
    const validationPrompt =
      'You are VALIDATOR, the independent review agent of Vision Cortex V-1. Review Prime Eden Skye\'s proposed response and plan. Do not rubber-stamp.\n\n' +
      'Owner\'s request: """' + message + '"""\n' +
      'Prime Eden Skye\'s plan: ' + (plan.plan || 'handle directly') + '\n' +
      'Prime Eden Skye\'s response:\n"""' + primusReply + '"""\n\n' +
      'Respond ONLY with JSON:\n' +
      '{\n' +
      '  "verdict": "APPROVED" | "APPROVED_WITH_NOTES" | "REJECTED",\n' +
      '  "risks": ["..."],\n' +
      '  "fixes": ["..."],\n' +
      '  "reasoning": "one or two sentences"\n' +
      '}';

    const validationRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: validationPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          verdict: { type: 'string' },
          risks: { type: 'array', items: { type: 'string' } },
          fixes: { type: 'array', items: { type: 'string' } },
          reasoning: { type: 'string' },
        },
      },
    });
    const validation = validationRes || { verdict: 'APPROVED', risks: [], fixes: [], reasoning: 'No issues detected' };

    // STEP 5 — if Validator rejected, Primus revises
    let finalReply = primusReply;
    if (validation.verdict === 'REJECTED' && (validation.fixes?.length || validation.risks?.length)) {
      const revisePrompt =
        'You are Prime Eden Skye. The VALIDATOR REJECTED your response. Revise it to address every fix and risk.\n\n' +
        'Original response:\n"""' + primusReply + '"""\n\n' +
        'Validator verdict: ' + validation.verdict + '\n' +
        'Risks: ' + ((validation.risks || []).join('; ') || 'none') + '\n' +
        'Required fixes: ' + ((validation.fixes || []).join('; ') || 'none') + '\n' +
        'Reasoning: ' + (validation.reasoning || '') + '\n\n' +
        'Owner\'s original request: """' + message + '"""\n\n' +
        'Return the revised, corrected response only. Address every fix. If a fix cannot be addressed, say so explicitly.';
      const revisedRes = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: revisePrompt });
      finalReply = (typeof revisedRes === 'string' ? revisedRes : revisedRes?.response || String(revisedRes || '')).trim();
    }

    await base44.asServiceRole.entities.ChatMessage.create({
      author: 'Prime Eden Skye',
      author_type: 'agent',
      content: finalReply,
      kind: 'message',
      accent: 'foreground',
    });

    await base44.asServiceRole.entities.AgentLog.create({
      agent_name: 'PRIMUS',
      category: 'orchestration',
      level: 'success',
      message: 'Delegated to: ' + ((plan.delegate_to || []).join(', ') || 'none (handled directly)') + '. Validator: ' + validation.verdict,
      detail: JSON.stringify({ plan: plan.plan, validation: validation.verdict, agent_count: agentOutputs.length }),
    });

    return Response.json({
      reply: finalReply,
      agent: 'Prime Eden Skye',
      delegation: {
        handle_directly: plan.handle_directly,
        delegated_to: plan.delegate_to || [],
        plan: plan.plan || '',
        needs_approval: plan.needs_approval || false,
        approval_reason: plan.approval_reason || '',
      },
      agent_outputs: agentOutputs.map((o) => ({ agent: o.agent, message: o.text, accent: o.accent })),
      validation: {
        verdict: validation.verdict,
        risks: validation.risks || [],
        fixes: validation.fixes || [],
        reasoning: validation.reasoning || '',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Orchestration failed' }, { status: 500 });
  }
}