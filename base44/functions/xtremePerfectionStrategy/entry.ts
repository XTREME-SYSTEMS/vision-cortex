import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { browseSession, str } from '../../shared/cloudBrowser.ts';

// xtremePerfectionStrategy — Deep architectural perfection audit for the Xtreme AI v2 system.
//
// This goes beyond the standard 5-dimension audit. It analyzes:
//   1. The live site via Cloud Browser (the Eyes)
//   2. The system's architecture, identifying archive/legacy bloat
//   3. The autonomous builder workflow and how Vision Cortex should operate it
//   4. The full refactoring strategy to take the system from current → 100%
//
// Produces a comprehensive SystemPerfectionReport with:
//   - Archive systems to remove/consolidate (bloat identification)
//   - Refactoring strategy (clean architecture)
//   - Vision Cortex autonomous operation plan
//   - Step-by-step perfection roadmap with execution prompts
//
// Invoke: base44.functions.invoke('xtremePerfectionStrategy', { site_id })
// Returns: { ok, report_id, strategy }

const ARCHITECTURE_PROMPT = `You are the Vision Cortex Master Architect. Perform a DEEP architectural perfection analysis of the Xtreme AI v2 system at {URL} (repo: {REPO}).

Live page content captured by Cloud Browser:
"""
{PAGE_CONTENT}
"""
(If empty, rely on the URL and your live web research.)

The user reports this system has "a ton of archive systems in it" making it "bulky and messy." They love the workflow, horizontal step-by-step timeline, vision statement, strategy system, and quality of results — but it needs fine-tuning, archive cleanup, and Vision Cortex perfected to operate it autonomously.

Do ALL of the following in one pass:

1. SYSTEM IDENTITY — Classify the system_type and write a detailed system_description of what Xtreme AI v2 does, its target audience, and its core value proposition.

2. ARCHITECTURE ANALYSIS — Analyze the system's architecture:
   - tech_stack: detected technologies (framework, hosting, database, AI models, etc.)
   - core_systems: the ACTIVE, essential systems that power the product (the ones the user loves)
   - archive_systems: legacy/dead/redundant systems that create bloat (be specific — name them, describe what they were, why they're archived)
   - bloat_assessment: how bulky is the system, what percentage is dead weight, what's the maintenance burden

3. BENCHMARK — Research the #1 benchmark_system that exemplifies the ideal autonomous AI builder/SaaS platform. Research 2-4 competitor_benchmarks with their key strengths and URLs.

4. REFACTORING STRATEGY — Produce a detailed refactoring strategy:
   - what_to_archive: specific systems/modules to remove or consolidate
   - what_to_refactor: systems that need restructuring (not removal)
   - what_to_preserve: the systems the user loves (workflow, timeline, vision, strategy) — protect these
   - clean_architecture_target: the target state after refactoring

5. VISION CORTEX OPERATION — How should Vision Cortex (the Brain) autonomously operate this system:
   - orchestration_model: how Vision Cortex should command the builder
   - autonomous_loops: what should run 24/7 without human intervention
   - quality_gates: what validation must pass before any change goes live
   - human_touchpoints: where human approval is still needed

6. PERFECTION ROADMAP — A step-by-step execution plan (ordered phases) to take the system from current state to 100%:
   - Each phase: name, objective, specific actions, acceptance criteria
   - The FIRST phase must be archive cleanup (remove the bloat)
   - Subsequent phases: refactor core, wire Vision Cortex, perfect quality, harden, launch

7. SCORES — Score these 5 dimensions 0-100 with evidence:
   - performance, seo, security, accessibility, content

Return strict JSON.`;

const SYNTHESIS_PROMPT = `You are the Vision Cortex synthesis engine. Below is the deep architectural analysis for Xtreme AI v2. Produce a FULL, ZERO-AMBIGUITY perfection strategy.

Analysis:
{ANALYSIS_JSON}

Produce:

1. dimension_analysis — For EACH of the 5 dimensions (performance, seo, security, accessibility, content):
   - current_score, target_score: 100
   - gap: precise, evidence-based description of what's missing
   - root_cause: the underlying reason
   - perfection_prompt: a COMPLETE, copy-paste-ready prompt that an autonomous builder agent could execute to bring THIS dimension to 100%. Include the site URL, the specific dimension, the benchmark to match, exact issues, and acceptance criteria (score = 100, zero critical issues).

2. archive_cleanup_prompt — A single, comprehensive, copy-paste-ready prompt to identify and safely remove ALL archive/legacy/dead systems from the codebase. Include: how to identify dead code, how to safely remove without breaking active systems, how to verify nothing breaks, and acceptance criteria (zero dead weight, all active systems intact).

3. refactoring_prompt — A comprehensive prompt to refactor the remaining active systems into a clean, modular architecture. Include: the target architecture, module boundaries, how to preserve the loved workflow/timeline/vision/strategy systems, and acceptance criteria.

4. vision_cortex_operation_prompt — A comprehensive prompt to wire Vision Cortex as the autonomous operator of the refactored system. Include: orchestration endpoints, autonomous loop definitions, quality gates, and the exact integration points.

5. overall_summary — A full, unambiguous paragraph covering: the system's identity, current state, every weakness, the archive bloat, the refactoring path, how Vision Cortex will operate it, and the exact path to 100%.

6. launch_readiness_verdict — one of "launch_ready", "near_ready", "not_ready", "unknown".

Return strict JSON.`;

const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    system_type: { type: 'string' },
    system_description: { type: 'string' },
    tech_stack: { type: 'array', items: { type: 'string' } },
    core_systems: { type: 'array', items: { type: 'string' } },
    archive_systems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          reason_archived: { type: 'string' },
          removal_safe: { type: 'boolean' },
        },
      },
    },
    bloat_assessment: { type: 'string' },
    benchmark_system: { type: 'string' },
    competitor_benchmarks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          system: { type: 'string' },
          strength: { type: 'string' },
          url: { type: 'string' },
        },
      },
    },
    what_to_archive: { type: 'array', items: { type: 'string' } },
    what_to_refactor: { type: 'array', items: { type: 'string' } },
    what_to_preserve: { type: 'array', items: { type: 'string' } },
    clean_architecture_target: { type: 'string' },
    orchestration_model: { type: 'string' },
    autonomous_loops: { type: 'array', items: { type: 'string' } },
    quality_gates: { type: 'array', items: { type: 'string' } },
    human_touchpoints: { type: 'array', items: { type: 'string' } },
    perfection_roadmap: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          phase: { type: 'string' },
          objective: { type: 'string' },
          actions: { type: 'array', items: { type: 'string' } },
          acceptance_criteria: { type: 'string' },
        },
      },
    },
    scores: {
      type: 'object',
      properties: {
        performance: { type: 'number' },
        seo: { type: 'number' },
        security: { type: 'number' },
        accessibility: { type: 'number' },
        content: { type: 'number' },
      },
    },
    overall_score: { type: 'number' },
  },
  required: ['system_type', 'system_description', 'tech_stack', 'core_systems', 'archive_systems', 'perfection_roadmap', 'scores'],
};

const SYNTHESIS_SCHEMA = {
  type: 'object',
  properties: {
    dimension_analysis: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dimension: { type: 'string' },
          current_score: { type: 'number' },
          target_score: { type: 'number' },
          gap: { type: 'string' },
          root_cause: { type: 'string' },
          perfection_prompt: { type: 'string' },
        },
      },
    },
    perfection_prompts: {
      type: 'array',
      items: { type: 'object', properties: { dimension: { type: 'string' }, prompt: { type: 'string' } } },
    },
    archive_cleanup_prompt: { type: 'string' },
    refactoring_prompt: { type: 'string' },
    vision_cortex_operation_prompt: { type: 'string' },
    overall_summary: { type: 'string' },
    launch_readiness_verdict: { type: 'string' },
  },
  required: ['dimension_analysis', 'overall_summary', 'launch_readiness_verdict', 'archive_cleanup_prompt', 'refactoring_prompt', 'vision_cortex_operation_prompt'],
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { site_id, autonomous = false } = body;
    if (!site_id) return Response.json({ error: 'site_id is required' }, { status: 400 });

    const sr = base44.asServiceRole.entities;
    const site = await sr.MonitoredSite.get(site_id);
    if (!site) return Response.json({ error: 'Site not found' }, { status: 404 });

    // ── 1. Cloud Browser: read the live page (the Eyes) — best-effort, 20s cap ──
    let pageContent = '';
    try {
      const browseP = browseSession(site.url, 25000);
      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error('browse timeout')), 20000));
      pageContent = await Promise.race([browseP, timeoutP]);
    } catch (e) {
      pageContent = `[Cloud Browser unavailable: ${e.message}]`;
    }

    // ── 2. Deep architectural analysis with live web context ──
    const analysisPrompt = ARCHITECTURE_PROMPT
      .replace('{URL}', site.url)
      .replace('{REPO}', site.github_repo || 'N/A')
      .replace('{PAGE_CONTENT}', str(pageContent, 30000));

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
      response_json_schema: ANALYSIS_SCHEMA,
    });

    const scores = analysis.scores || {};
    const overall = analysis.overall_score || Math.round(
      [scores.performance, scores.seo, scores.security, scores.accessibility, scores.content]
        .filter((v) => v != null).reduce((a, b) => a + b, 0) / 5
    );

    // ── 3. Synthesize perfection prompts + strategy ──
    const synth = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: SYNTHESIS_PROMPT.replace('{ANALYSIS_JSON}', JSON.stringify({ ...analysis, site_url: site.url, site_name: site.name })),
      model: 'gemini_3_1_pro',
      response_json_schema: SYNTHESIS_SCHEMA,
    });

    const dimensionAnalysis = synth.dimension_analysis || [];
    const perfectionPrompts = synth.perfection_prompts || dimensionAnalysis.map((d) => ({ dimension: d.dimension, prompt: d.perfection_prompt }));

    // ── 4. Persist the report ──
    const report = await sr.SystemPerfectionReport.create({
      site_id: site.id,
      site_url: site.url,
      site_name: site.name,
      system_type: analysis.system_type || 'autonomous_ai_builder',
      system_description: analysis.system_description || '',
      tech_stack: analysis.tech_stack || [],
      benchmark_system: analysis.benchmark_system || '',
      competitor_benchmarks: analysis.competitor_benchmarks || [],
      scores,
      overall_score: overall,
      dimension_analysis: dimensionAnalysis,
      perfection_prompts: perfectionPrompts,
      overall_summary: synth.overall_summary || '',
      launch_readiness_verdict: synth.launch_readiness_verdict || 'unknown',
      autonomous: !!autonomous,
    });

    // ── 5. Update the monitored site scores ──
    await sr.MonitoredSite.update(site.id, {
      performance_score: scores.performance || 0,
      seo_score: scores.seo || 0,
      security_score: scores.security || 0,
      accessibility_score: scores.accessibility || 0,
      content_score: scores.content || 0,
      audit_score: overall,
      last_audit_at: new Date().toISOString(),
      last_action: 'perfection_strategy',
      last_action_at: new Date().toISOString(),
      last_action_summary: synth.overall_summary?.slice(0, 500) || '',
      status: overall >= 85 ? 'healthy' : overall >= 60 ? 'active' : overall >= 30 ? 'degraded' : 'critical',
    });

    // ── 6. Create SystemEnhancement records for each roadmap phase ──
    const roadmap = analysis.perfection_roadmap || [];
    const enhancements = [];
    for (let i = 0; i < roadmap.length; i++) {
      const phase = roadmap[i];
      const prompt = i === 0 ? synth.archive_cleanup_prompt :
                     i === 1 ? synth.refactoring_prompt :
                     i === 2 ? synth.vision_cortex_operation_prompt :
                     (dimensionAnalysis[i - 3]?.perfection_prompt || '');
      try {
        const enh = await sr.SystemEnhancement.create({
          title: `Phase ${i + 1}: ${phase.phase || 'Unknown'}`,
          description: phase.objective || '',
          existing_system: analysis.system_description || '',
          downfall: phase.actions?.join('; ') || '',
          recommended_enhancement: phase.objective || '',
          technical_protocols: phase.actions || [],
          surround_enhancements: [],
          web_search_sources: (analysis.competitor_benchmarks || []).map((c) => c.url).filter(Boolean),
          category: i === 0 ? 'healing' : i === 1 ? 'optimization' : i === 2 ? 'integration' : 'feature',
          status: 'pending',
          priority: i + 1,
          source: 'autonomous',
          implementation_plan: prompt,
          build_order_step: `Phase ${i + 1}`,
        });
        enhancements.push(enh.id);
      } catch (e) { /* continue */ }
    }

    await sr.AgentLog.create({
      agent_name: 'vision_cortex',
      level: 'success',
      message: `Xtreme perfection strategy generated for ${site.url}: ${overall}/100 — ${roadmap.length} phases, ${enhancements.length} enhancements queued`,
      auto_action: 'xtreme_perfection_strategy',
    });

    return Response.json({
      ok: true,
      report_id: report.id,
      site_id: site.id,
      url: site.url,
      system_type: analysis.system_type,
      overall_score: overall,
      scores,
      launch_readiness_verdict: synth.launch_readiness_verdict,
      archive_systems: analysis.archive_systems,
      core_systems: analysis.core_systems,
      what_to_archive: analysis.what_to_archive,
      what_to_preserve: analysis.what_to_preserve,
      perfection_roadmap: roadmap,
      dimension_analysis: dimensionAnalysis,
      archive_cleanup_prompt: synth.archive_cleanup_prompt,
      refactoring_prompt: synth.refactoring_prompt,
      vision_cortex_operation_prompt: synth.vision_cortex_operation_prompt,
      overall_summary: synth.overall_summary,
      enhancement_ids: enhancements,
    });
  } catch (error) {
    console.error('xtremePerfectionStrategy error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}