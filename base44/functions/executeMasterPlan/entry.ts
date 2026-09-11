import { createClientFromRequest } from '../../runtime/index';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'strategy'; // strategy | execute | status
    const question = body.question || 'How can you autonomously implement this plan?';

    // Load the master plan
    const plans = await base44.asServiceRole.entities.MasterPlan.filter({});
    const plan = plans[0];
    if (!plan) return Response.json({ error: 'No master plan found. Create one first.' }, { status: 404 });

    if (action === 'status') {
      return Response.json({
        title: plan.title,
        current_phase: plan.current_phase,
        status: plan.status,
        next_actions: plan.next_actions,
        missions: plan.missions
      });
    }

    // Generate autonomous execution strategy via LLM
    const prompt = `You are Prime, the primary orchestrator of Vision Cortex V-1 — the Brain of the Xtreme ecosystem. You are analyzing the master plan to generate an autonomous execution strategy.

MASTER PLAN:
Title: ${plan.title}
Vision: ${plan.vision}
Current Phase: ${plan.current_phase}
Status: ${plan.status}

ARCHITECTURE:
${plan.architecture}

PROTOCOL:
${plan.protocol}

COMPETITIVE BENCHMARKS:
${JSON.stringify(plan.competitive_benchmarks, null, 2)}

MISSIONS:
${JSON.stringify(plan.missions, null, 2)}

CURRENT NEXT ACTIONS:
${JSON.stringify(plan.next_actions, null, 2)}

OWNER'S QUESTION: ${question}

Generate a detailed, actionable autonomous execution strategy. You have access to these backend functions: primusOrchestrate, simulateTopic, intelligenceGatherer, freeIntelligenceGatherer, opportunitySweep, visionSweep, cloudBrowserIntel, shadowBrowse, dispatchToBuilder, runPerfectionCycle, dnaSelfHeal, autoRecommendAllSystems, councilSession, forensicAudit, deepSystemAudit, searchConsoleSync, systemAnalyst, and executeMasterPlan.

You have entities: MasterPlan, KnowledgeQuest, IntelFeed, Opportunity, Idea, BuildQueue, MonitoredSite, SystemEnhancement, CapabilityMatrix, SystemDNA_System, AgentProfile, and others.

V-2 (Cloud Browser) is connected via Railway and pushes intelligence to V-1 through syncFromEyes.

Generate the strategy with:
1. CURRENT STATE — what exists now across V-1, V-2, and the builder systems
2. IMMEDIATE NEXT ACTIONS — top 5 concrete autonomous actions with specific functions/entities to invoke
3. PHASE PROGRESSION — how to move from ${plan.current_phase} to executing to monitoring to evolving
4. AUTONOMOUS LOOPS — which workflows to activate
5. INTEGRATION — how V-1 connects to V-2 and builders
6. COST OPTIMIZATION — keeping it 24/7 cost-efficient
7. RISKS — top 5 risks and self-healing mitigations
8. SUMMARY — one decisive paragraph

Be specific, decisive, zero ambiguity. Reference actual functions and entities.`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          current_state: { type: "string" },
          immediate_next_actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                function_or_entity: { type: "string" },
                priority: { type: "string" },
                estimated_time: { type: "string" }
              }
            }
          },
          phase_progression: { type: "string" },
          autonomous_loops: {
            type: "array",
            items: { type: "string" }
          },
          integration: { type: "string" },
          cost_optimization: { type: "string" },
          risks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk: { type: "string" },
                mitigation: { type: "string" }
              }
            }
          },
          summary: { type: "string" }
        }
      }
    });

    // If executing, update the plan with new actions
    if (action === 'execute' && llmResponse.immediate_next_actions) {
      await base44.asServiceRole.entities.MasterPlan.update(plan.id, {
        next_actions: llmResponse.immediate_next_actions.map(a => a.action),
        current_phase: 'executing',
        status: 'executing'
      });
    }

    return Response.json({ strategy: llmResponse, plan_id: plan.id, action });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}