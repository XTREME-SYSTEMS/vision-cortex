import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// Agent API — exposes Vision Cortex agents as independent API entities.
// External apps can call this endpoint to invoke a specific agent by name/codename.
// Each agent becomes a callable "traveling" entity that can interact with external services.

const EXECUTABLE_FUNCTIONS = {
  intelligence: ['intelligenceGatherer', 'DeepDiscoveryScan', 'freeIntelligenceGatherer', 'scrapeLeads', 'enrichLead', 'cloudBrowserIntel'],
  build: ['autoBuildOrchestrator', 'dispatchToBuilder', 'launchPipelineBuild', 'factoryWebsiteGenerator', 'factoryBrandPack', 'factoryContentGenerator', 'provisionVercel', 'provisionSupabase', 'railwayProvisioner'],
  audit: ['deepSystemAudit', 'forensicAudit', 'auditExternalSite', 'dailySiteAudit', 'systemScanner'],
  comms: ['persistentMessageAgent', 'xtremeComms', 'telnyxComms', 'batchMmsOutreach', 'aiCallCampaign', 'edenSkyeResponder'],
  strategy: ['councilBlueprint', 'councilPredict', 'simulateStrategy', 'councilSession', 'councilCompound'],
  ops: ['dnaSelfHeal', 'autoEnhanceAll', 'masterLoopOrchestrator', 'runEnhancementCycle', 'zeroFailurePipeline'],
  money: ['shadowMoneyHunt', 'shadowRevenueCheck', 'wealthSweep', 'opportunitySweep', 'opportunityFollowUp', 'opportunityRespond'],
  crm: ['crmSync', 'autoleadsBridge', 'batchLeadFactory'],
  content: ['generateContent', 'factorySocialAI', 'factoryGrowthOSGenerator', 'runMarketer'],
  memory: ['bootstrapCoreDocuments', 'evolveDocument', 'ingestIntel', 'ingestPromptLibrary'],
};

function inferSkills(agent) {
  const text = ((agent.role || '') + ' ' + (agent.archetype || '') + ' ' + (agent.mission || '') + ' ' + (agent.capabilities || []).join(' ')).toLowerCase();
  const skills = [];
  if (text.match(/intel|research|scrap|discover|data acquis/)) skills.push('intelligence');
  if (text.match(/strateg|plan|reverse engineer/)) skills.push('strategy');
  if (text.match(/build|compile|forge|provision|deploy/)) skills.push('build');
  if (text.match(/audit|valid|quality|inquisitor|sentinel/)) skills.push('audit');
  if (text.match(/comm|outreach|diplomat|voice|call|sms|mms|email/)) skills.push('comms');
  if (text.match(/money|monetiz|merchant|capital|treasurer|revenue|broker|distributor/)) skills.push('money');
  if (text.match(/heal|self-heal|hardening|monitor|sentinel|keeper/)) skills.push('ops');
  if (text.match(/code|architect|engineer|function/)) skills.push('coding');
  if (text.match(/scrap|browse|fleet|cartographer|shadow/)) skills.push('research');
  if (text.match(/govern|ethic|philosopher|maxwell|chief|ceo|sage/)) skills.push('governance');
  if (skills.length === 0) skills.push('ops');
  return [...new Set(skills)];
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = (body?.action || 'list').trim();
    const sr = base44.asServiceRole.entities;

    // ── LIST: return all agents as API entities ──
    if (action === 'list') {
      const agents = await sr.AgentProfile.list('order', 100);
      const apiEntities = agents.map((a) => ({
        agent_id: a.id,
        name: a.name,
        codename: a.codename,
        role: a.role,
        archetype: a.archetype,
        status: a.status,
        skills: inferSkills(a),
        capabilities: a.capabilities || [],
        tools: a.tools || [],
        api_endpoint: '/functions/agentAPI',
        callable: true,
        travel_enabled: true,
        inf_balance: a.inf_balance || 0,
        rank: a.rank || 0,
      }));
      return Response.json({
        ok: true,
        total: apiEntities.length,
        agents: apiEntities,
        endpoint: 'https://visioncortex.base44.app/functions/agentAPI',
        usage: 'POST with { action: "invoke", agent: "Prime", message: "your request" }',
      });
    }

    // ── INVOKE: call a specific agent by name/codename ──
    if (action === 'invoke') {
      const agentName = (body?.agent || '').trim();
      const message = (body?.message || '').trim();
      if (!agentName || !message) return Response.json({ error: 'agent and message required' }, { status: 400 });

      const agents = await sr.AgentProfile.list('order', 100);
      const agent = agents.find((a) =>
        a.name.toLowerCase() === agentName.toLowerCase() ||
        (a.codename || '').toLowerCase() === agentName.toLowerCase()
      );
      if (!agent) return Response.json({ error: 'Agent not found: ' + agentName }, { status: 404 });

      const skills = inferSkills(agent);
      const functionPool = [...new Set(skills.flatMap((s) => EXECUTABLE_FUNCTIONS[s] || []))];

      // Generate agent response with its persona
      const prompt =
        'You are ' + agent.name + (agent.codename ? ' (codename: ' + agent.codename + ')' : '') + '.\n' +
        'Role: ' + (agent.role || 'Vision Cortex agent') + '\n' +
        (agent.mission ? 'Mission: ' + agent.mission + '\n' : '') +
        (agent.personality ? 'Personality: ' + agent.personality + '\n' : '') +
        '\nRequest from external caller: """' + message + '"""\n\n' +
        'Respond as this agent. Be concise, decisive, and in-character. If the request requires execution, suggest which function should be called from: ' + functionPool.join(', ');

      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
      const reply = typeof llmRes === 'string' ? llmRes : llmRes?.response || String(llmRes || '');

      await sr.AgentLog.create({
        agent_name: agent.name,
        category: 'api_invoke',
        level: 'success',
        message: 'External API invoke: ' + message.slice(0, 100),
        detail: 'Called via agentAPI endpoint',
      }).catch(() => {});

      return Response.json({
        ok: true,
        agent: agent.name,
        codename: agent.codename,
        reply,
        skills,
        available_functions: functionPool,
        travel_enabled: true,
      });
    }

    // ── EXECUTE: agent invokes a backend function on behalf of external caller ──
    if (action === 'execute') {
      const agentName = (body?.agent || '').trim();
      const functionName = (body?.function || '').trim();
      const payload = body?.payload || {};
      if (!agentName || !functionName) return Response.json({ error: 'agent and function required' }, { status: 400 });

      const agents = await sr.AgentProfile.list('order', 100);
      const agent = agents.find((a) =>
        a.name.toLowerCase() === agentName.toLowerCase() ||
        (a.codename || '').toLowerCase() === agentName.toLowerCase()
      );
      if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 });

      const skills = inferSkills(agent);
      const allowedFunctions = [...new Set(skills.flatMap((s) => EXECUTABLE_FUNCTIONS[s] || []))];
      if (!allowedFunctions.includes(functionName)) {
        return Response.json({
          error: 'Function not in agent\'s skill set',
          agent: agent.name,
          allowed_functions: allowedFunctions,
        }, { status: 403 });
      }

      const fnResult = await base44.asServiceRole.functions.invoke(functionName, payload);
      const resultData = fnResult?.data || fnResult;

      await sr.AgentLog.create({
        agent_name: agent.name,
        category: 'api_execute',
        level: 'success',
        message: 'Executed ' + functionName + ' via agentAPI',
        detail: JSON.stringify(payload).slice(0, 500),
      }).catch(() => {});

      return Response.json({
        ok: true,
        agent: agent.name,
        function: functionName,
        result: resultData,
      });
    }

    // ── MANIFEST: return the full agent API manifest for external registration ──
    if (action === 'manifest') {
      const agents = await sr.AgentProfile.list('order', 100);
      const manifest = {
        system: 'Vision Cortex V-1',
        endpoint: 'https://visioncortex.base44.app/functions/agentAPI',
        auth: 'Base44 API key in Authorization header',
        total_agents: agents.length,
        agents: agents.map((a) => ({
          name: a.name,
          codename: a.codename,
          role: a.role,
          skills: inferSkills(a),
          callable: true,
          travel_enabled: true,
        })),
        actions: ['list', 'invoke', 'execute', 'manifest'],
        skill_categories: Object.keys(EXECUTABLE_FUNCTIONS),
      };
      return Response.json({ ok: true, manifest });
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'Agent API failed' }, { status: 500 });
  }
}