import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const BLUEPRINT_PROMPT = `You are the Vision Cortex Master Strategist — an elite business architect, financial analyst, and systems engineer.

Generate a COMPREHENSIVE master blueprint for "Xtreme Polishing Systems" — a company that wants to mass-produce autonomous AI-powered website/marketing systems for the EPOXY FLOORING, DECORATIVE EPOXY, and POLISHED CONCRETE industry.

CONTEXT:
- Target company: Xtreme Polishing Systems (XPS Xpress stores nationwide)
- Existing system: epoxyquotenearme.com — a funnel floor visualizer site currently scoring 80/100 (performance 76, SEO 84, security 82, accessibility 68, content 89)
- Goal: Transform this into a mass-producible autonomous website/system FACTORY
- Scale: 70+ sites strategically deployed around all XPS Xpress store locations nationwide
- The sites serve as lead-gen systems to attract customers and push them into stores to buy products, equipment, and install jobs
- They have an AI sales/marketing team starting with outbound sales

REQUIREMENTS (cover EVERY area below with deep, specific, actionable detail):

1. DEEP AUDIT & REFACTOR: Analyze the current 80/100 system and prescribe a refactor strategy to transform it into an autonomous factory. Include the architecture vision.

2. SYSTEM FACTORY ARCHITECTURE: Design a "Deterministic Shell, Probabilistic Core" factory that stamps out complete epoxy/polished concrete marketing systems. Core modules, deployment pipeline, scalability.

3. DIGITAL BID SYSTEM: Customer uploads photos of their floor → AI floor visualizer shows epoxy/polished results → automated pricing engine generates a bid → bid delivery workflow. Full spec.

4. LEAD GENERATION: Residential, Commercial, and Government lead generation + delivery routing to nearest XPS Xpress store.

5. SEO/AEO: Maximum automated programmatic SEO + AEO (Answer Engine Optimization) for "epoxy floor near me", "polished concrete contractor" etc. Local SEO stack.

6. AI AGENT MANAGEMENT: Full AI agent roster for autonomous operation — sales agents, content agents, SEO agents, social agents, bid agents, engagement agents. Orchestration + autonomous loops.

7. SOCIAL MEDIA: Automated scheduling, content posting, engagement, and management across platforms. Content engine spec.

8. REBRANDING: Brand identity, positioning, visual system for the factory output.

9. FINANCIAL INTELLIGENCE: Industry market size, competitor analysis (research real competitors like epoxygrind.com, concretenetwork.com, etc.), revenue projections, unit economics per site.

10. TONE ENHANCEMENT: Industry voice + company voice + content guidelines for the epoxy/polished concrete space.

11. BUSINESS PLAN: Mission, market opportunity, go-to-market, competitive moat, team structure.

12. FINANCIAL PLAN: Startup costs, monthly operating costs, revenue model, break-even, Year 1 and Year 3 projections.

13. PRICING PLANS: One-time setup pricing tiers AND monthly service charges. At least 4 tiers (Starter, Professional, Business, Enterprise). Include features and target customer for each.

14. MASS PRODUCTION PLAN: 70+ sites around XPS Xpress stores. Geographic strategy, deployment cadence, lead-to-store funnel.

15. GENERATOR APP OPTIMIZATION: How to optimize the existing system into a user-friendly business generator app.

16. IMPLEMENTATION ROADMAP: Phased plan with timelines, deliverables, milestones.

Use web search to research real competitors, market data, and pricing benchmarks in the epoxy/polished concrete industry. Be specific, detailed, and actionable. Every section must have real substance — no placeholders.`;

const BLUEPRINT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    executive_summary: { type: 'string' },
    deep_audit_refactor: {
      type: 'object',
      properties: {
        current_score: { type: 'number' },
        refactor_strategy: { type: 'string' },
        architecture_vision: { type: 'string' }
      }
    },
    system_factory_architecture: {
      type: 'object',
      properties: {
        deterministic_shell: { type: 'string' },
        core_modules: { type: 'array', items: { type: 'string' } },
        deployment_pipeline: { type: 'string' },
        scalability_plan: { type: 'string' }
      }
    },
    digital_bid_system: {
      type: 'object',
      properties: {
        image_upload_flow: { type: 'string' },
        floor_visualizer_spec: { type: 'string' },
        automated_pricing_engine: { type: 'string' },
        bid_delivery_workflow: { type: 'string' }
      }
    },
    lead_generation_system: {
      type: 'object',
      properties: {
        residential: { type: 'string' },
        commercial: { type: 'string' },
        government: { type: 'string' },
        delivery_routing: { type: 'string' }
      }
    },
    seo_aeo_system: {
      type: 'object',
      properties: {
        programmatic_seo: { type: 'string' },
        aeo_strategy: { type: 'string' },
        local_seo_stack: { type: 'string' }
      }
    },
    ai_agent_system: {
      type: 'object',
      properties: {
        agent_roster: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              role: { type: 'string' },
              mission: { type: 'string' }
            }
          }
        },
        orchestration: { type: 'string' },
        autonomous_loops: { type: 'string' }
      }
    },
    social_media_system: {
      type: 'object',
      properties: {
        platforms: { type: 'array', items: { type: 'string' } },
        content_engine: { type: 'string' },
        scheduling_automation: { type: 'string' },
        engagement_system: { type: 'string' }
      }
    },
    rebranding_plan: {
      type: 'object',
      properties: {
        brand_identity: { type: 'string' },
        positioning: { type: 'string' },
        visual_system: { type: 'string' }
      }
    },
    financial_intelligence: {
      type: 'object',
      properties: {
        industry_market_size: { type: 'string' },
        competitor_analysis: { type: 'string' },
        revenue_projections: { type: 'string' },
        unit_economics: { type: 'string' }
      }
    },
    tone_enhancement_system: {
      type: 'object',
      properties: {
        industry_voice: { type: 'string' },
        company_voice: { type: 'string' },
        content_guidelines: { type: 'string' }
      }
    },
    business_plan: {
      type: 'object',
      properties: {
        mission: { type: 'string' },
        market_opportunity: { type: 'string' },
        go_to_market: { type: 'string' },
        competitive_moat: { type: 'string' },
        team_structure: { type: 'string' }
      }
    },
    financial_plan: {
      type: 'object',
      properties: {
        startup_costs: { type: 'string' },
        monthly_operating_costs: { type: 'string' },
        revenue_model: { type: 'string' },
        break_even_analysis: { type: 'string' },
        year_1_projections: { type: 'string' },
        year_3_projections: { type: 'string' }
      }
    },
    pricing_plans: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tier: { type: 'string' },
          one_time_price: { type: 'string' },
          monthly_price: { type: 'string' },
          features: { type: 'array', items: { type: 'string' } },
          target_customer: { type: 'string' }
        }
      }
    },
    mass_production_plan: {
      type: 'object',
      properties: {
        site_count_target: { type: 'number' },
        geographic_strategy: { type: 'string' },
        xps_xpress_store_alignment: { type: 'string' },
        deployment_cadence: { type: 'string' },
        lead_to_store_funnel: { type: 'string' }
      }
    },
    generator_app_optimization: {
      type: 'object',
      properties: {
        current_state: { type: 'string' },
        target_state: { type: 'string' },
        ux_improvements: { type: 'string' },
        automation_level: { type: 'string' }
      }
    },
    implementation_roadmap: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          phase: { type: 'string' },
          timeline: { type: 'string' },
          deliverables: { type: 'array', items: { type: 'string' } },
          milestone: { type: 'string' }
        }
      }
    },
    overall_summary: { type: 'string' }
  }
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    // Fetch existing deep audit for context
    let auditContext = '';
    if (body.site_id) {
      try {
        const reports = await base44.asServiceRole.entities.SystemPerfectionReport.filter(
          { site_id: body.site_id }, '-created_date', 1
        );
        if (reports && reports[0]) {
          auditContext = `\n\nEXISTING DEEP AUDIT DATA (epoxyquotenearme.com):\nOverall: ${reports[0].overall_score}/100\nScores: ${JSON.stringify(reports[0].scores)}\nSystem type: ${reports[0].system_type}\nVerdict: ${reports[0].launch_readiness_verdict}`;
        }
      } catch (e) { /* non-critical */ }
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: BLUEPRINT_PROMPT + auditContext,
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
      response_json_schema: BLUEPRINT_SCHEMA,
    });

    const blueprint = {
      ...result,
      title: result.title || 'Xtreme Polishing Systems — Master Factory Blueprint',
      industry: 'epoxy_flooring_polished_concrete',
      target_company: 'Xtreme Polishing Systems (XPS Xpress)',
      generated_at: new Date().toISOString(),
    };

    const saved = await base44.asServiceRole.entities.MasterBlueprint.create(blueprint);

    return Response.json({ ok: true, blueprint_id: saved.id, blueprint });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}