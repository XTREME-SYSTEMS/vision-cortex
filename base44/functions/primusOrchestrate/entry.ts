import { createClientFromRequest, secrets } from '../../runtime/index';

const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';

// Top 5 models on Vercel AI Gateway
const AVAILABLE_MODELS = [
  'openai/gpt-5.6-sol',
  'openai/gpt-5.6-luna',
  'anthropic/claude-opus-4.8',
  'google/gemini-3.1-pro',
  'xai/grok-4',
];

// Auto-mode heuristic: pick the best model for the message
function pickAutoModel(message: string): string {
  const lower = message.toLowerCase();
  // Code / technical → advanced reasoning
  if (lower.match(/code|implement|debug|fix|build|deploy|function|bug|api|endpoint|refactor/)) return 'openai/gpt-5.6-luna';
  // Strategy / analysis / decisions → deepest reasoning
  if (lower.match(/analyz|strategy|plan|compar|reason|decid|evaluat|architect|design/)) return 'anthropic/claude-opus-4.8';
  // Current events / real-time → grok
  if (lower.match(/search|news|latest|current|today|real.?time|now|happen/)) return 'xai/grok-4';
  // Long context / documents → gemini
  if (message.length > 2000 || lower.match(/document|summariz|read|context|long/)) return 'google/gemini-3.1-pro';
  // Short / simple → fast daily driver
  return 'openai/gpt-5.6-sol';
}

// Route through Vercel AI Gateway with fallback to Base44 Core
async function gatewayChat(prompt: string, system: string, model: string, base44Client: any): Promise<string> {
  const apiKey = secrets.get('AI_GATEWAY_API_KEY');
  if (apiKey) {
    try {
      const res = await fetch(GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(system ? [{ role: 'system', content: system }] : []),
            { role: 'user', content: prompt },
          ],
          max_tokens: 4096,
          temperature: 0.7,
          stream: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } catch (e) {
      console.error('Gateway failed, falling back to Core:', e.message);
    }
  }
  // Fallback: Base44 Core InvokeLLM
  const result = await base44Client.asServiceRole.integrations.Core.InvokeLLM({ prompt });
  return typeof result === 'string' ? result : result?.response || String(result || '');
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = (body?.action || 'chat').trim();
    const message = (body?.message || '').trim();
    const requestedModel = (body?.model || 'auto').trim();
    // Resolve the actual model to use
    const selectedModel = requestedModel === 'auto' || !AVAILABLE_MODELS.includes(requestedModel)
      ? pickAutoModel(message)
      : requestedModel;

    // Load user personalization settings (ChatGPT-style custom instructions)
    const settingsList = await base44.asServiceRole.entities.AgentSettings.list('-updated_date', 1);
    const s = settingsList[0] || {};
    const personalizationBlock = [
      s.user_name ? '\nThe owner\'s name is ' + s.user_name + '. Address them by name when natural.' : '',
      s.about_user ? '\nAbout the owner: ' + s.about_user : '',
      s.response_style ? '\nResponse style: ' + s.response_style : '',
      s.tone ? '\nTone: ' + s.tone : '',
      s.personality_traits?.length ? '\nTraits: ' + s.personality_traits.join(', ') : '',
      s.conversation_rules?.length ? '\nRules: ' + s.conversation_rules.join('; ') : '',
      s.memory_enabled && s.memories?.length ? '\nMemories: ' + s.memories.map((m) => m.content).join('; ') : '',
    ].filter(Boolean).join('');

    // Load enabled plugins (ChatGPT-style plugin system)
    const enabledPlugins = await base44.asServiceRole.entities.Plugin.filter({ enabled: true });
    const pluginBlock = enabledPlugins.length
      ? '\n\nActive plugins (use their capabilities when relevant to the user\'s request):\n' +
        enabledPlugins.map((p) =>
          '- ' + p.name + ': ' + (p.description || '') +
          (p.capabilities?.length ? '\n  Capabilities: ' + p.capabilities.join(', ') : '') +
          (p.system_prompt ? '\n  Instructions: ' + p.system_prompt : '') +
          (p.backend_function ? '\n  Backend function: ' + p.backend_function : '')
        ).join('\n')
      : '';
    const history = Array.isArray(body?.history) ? body.history.slice(-12) : [];

    // On-demand validation — triggered by the Validate button, not on every message
    if (action === 'validate') {
      const recentMessages = await base44.asServiceRole.entities.ChatMessage.list('-created_date', 10);
      const lastPrime = recentMessages.find((m) => m.author_type === 'agent' && (m.author === 'Prime' || m.author === 'PRIMUS'));
      if (!lastPrime) return Response.json({ error: 'No Prime response to validate' }, { status: 400 });

      const validationPrompt =
        'You are VALIDATOR, the independent review agent of Vision Cortex V-1. Review Prime\'s response below. Do not rubber-stamp.\n\n' +
        'Prime\'s response:\n"""' + lastPrime.content + '"""\n\n' +
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

      await base44.asServiceRole.entities.AgentLog.create({
        agent_name: 'VALIDATOR',
        category: 'validation',
        level: 'success',
        message: 'On-demand validation: ' + validation.verdict,
        detail: JSON.stringify({ verdict: validation.verdict, risks: validation.risks }),
      });

      return Response.json({ validation });
    }

    if (!message) return Response.json({ error: 'Message required' }, { status: 400 });

    await base44.asServiceRole.entities.ChatMessage.create({
      author: user.full_name || user.email || 'Owner',
      author_type: 'user',
      content: message,
      kind: 'message',
    });

    const allAgents = await base44.asServiceRole.entities.AgentProfile.list('-order', 100);
    const primusProfile = allAgents.find((a) => (a.codename || '').toLowerCase() === 'primus' || (a.name || '').toLowerCase() === 'prime') || {
      name: 'Prime',
      codename: 'PRIMUS',
      role: 'Primary orchestrator of Vision Cortex V-1 — API brain for all connected apps',
      personality: 'Decisive, loyal, proactive, ten steps ahead',
      mission: "Delegate to the right agents, validate every decision, have the owner's back, compound wealth and system growth",
      intelligence_profile: 'Highest available reasoning, awareness, and intuition',
    };
    void primusProfile;

    const specialistNames = allAgents
      .filter((a) => {
        const lower = (a.name || '').toLowerCase();
        const codename = (a.codename || '').toLowerCase();
        return lower !== 'validator' && lower !== 'prime' && lower !== 'eden skye' && codename !== 'primus';
      })
      .map((a) => a.name);

    const historyLines = history.map((h) => (h.author_type === 'user' ? 'Owner' : h.author) + ': ' + h.content).join('\n');
    const historyBlock = historyLines ? '\nRecent conversation:\n' + historyLines + '\n' : '';

    // STEP 1 — Primus decides delegation
    const delegationPrompt =
      'You are Prime (codename PRIMUS), the primary orchestrator of Vision Cortex V-1 and the API brain for all connected apps. The owner sent a message. Decide how to handle it.\n' + personalizationBlock + '\n\n' +
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
        return lower && lower !== 'validator' && lower !== 'prime' && lower !== 'eden skye' && lower !== 'primus';
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
      'You are Prime (codename PRIMUS), the primary orchestrator of Vision Cortex V-1. Synthesize a single, unified, decisive response for the owner.\n' + personalizationBlock + pluginBlock + '\n\n' +
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

    const synthSystem = 'You are Prime (codename PRIMUS), the primary orchestrator of Vision Cortex V-1. Synthesize a single, unified, decisive response for the owner.';
    const primusReply = await gatewayChat(synthesisPrompt, synthSystem, selectedModel, base44);

    await base44.asServiceRole.entities.ChatMessage.create({
      author: 'Prime',
      author_type: 'agent',
      content: primusReply,
      kind: 'message',
      accent: 'foreground',
    });

    await base44.asServiceRole.entities.AgentLog.create({
      agent_name: 'PRIMUS',
      category: 'orchestration',
      level: 'success',
      message: 'Delegated to: ' + ((plan.delegate_to || []).join(', ') || 'none (handled directly)'),
      detail: JSON.stringify({ plan: plan.plan, agent_count: agentOutputs.length }),
    });

    return Response.json({
      reply: primusReply,
      agent: 'Prime',
      model_used: selectedModel,
      delegation: {
        handle_directly: plan.handle_directly,
        delegated_to: plan.delegate_to || [],
        plan: plan.plan || '',
        needs_approval: plan.needs_approval || false,
        approval_reason: plan.approval_reason || '',
      },
      agent_outputs: agentOutputs.map((o) => ({ agent: o.agent, message: o.text, accent: o.accent })),
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Orchestration failed' }, { status: 500 });
  }
}