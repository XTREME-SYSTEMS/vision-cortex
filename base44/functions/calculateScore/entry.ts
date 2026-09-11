import { createClientFromRequest } from '../../runtime/index';

// Parity evaluation engine — the 1.00 gate of the Deep Clone Factory.
// Scores visual + functional compliance, persists a ScoreRecord, and returns
// diagnostics with a recommended fix action when parity fails.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { runId, targetUrl, cloneUrl, visualData, functionalData, stageReached } = body;

    if (!runId || !targetUrl) {
      return Response.json({ error: 'runId and targetUrl are required' }, { status: 400 });
    }

    const visual = visualData || {};
    const functional = functionalData || {};

    // 1. Visual compliance matrix
    let visualScore = 1.0 - ((visual.pixelVariancePercentage || 0) / 100);
    if ((visual.unmatchedDomNodes || []).length > 0) {
      visualScore -= visual.unmatchedDomNodes.length * 0.05;
    }
    if ((visual.breakpointFailures || []).length > 0) {
      visualScore -= visual.breakpointFailures.length * 0.10;
    }
    visualScore = Math.max(0.0, Math.min(1.0, visualScore));

    // 2. Functional protocol compliance matrix
    let functionalScore = 1.0;
    if ((functional.unmappedEndpoints || []).length > 0) {
      functionalScore -= functional.unmappedEndpoints.length * 0.15;
    }
    if ((functional.responseCodeMismatches || []).length > 0) {
      functionalScore -= functional.responseCodeMismatches.length * 0.20;
    }
    if ((functional.latencyDeltaMs || 0) > 500) {
      functionalScore -= 0.05;
    }
    functionalScore = Math.max(0.0, Math.min(1.0, functionalScore));

    // 3. Aggregate telemetry pass score
    const aggregateScore = Math.round(((visualScore * 0.5) + (functionalScore * 0.5)) * 100) / 100;
    const isApproved = aggregateScore === 1.00;

    // 4. Structural defect diagnosis if parity fails
    let diagnostics = null;
    let severity = 'PASS';
    let recommendedFixAction = 'NONE';

    if (!isApproved) {
      severity = aggregateScore < 0.85 ? 'CRITICAL' : 'REPAIRABLE';
      recommendedFixAction = aggregateScore < 0.85 ? 'TRIGGER_ENGINE_RECOMPILE' : 'INJECT_MOCK_FALLBACK';
      diagnostics = {
        diagnosisId: `DIAG-${runId}-${Date.now()}`,
        failedNodes: visual.unmatchedDomNodes || [],
        missingRoutes: functional.unmappedEndpoints || [],
        severity,
        recommendedFixAction
      };
    }

    // 5. Persist to ScoreRecord entity
    await base44.entities.ScoreRecord.create({
      run_id: runId,
      target_url: targetUrl,
      clone_url: cloneUrl || '',
      visual_score: visualScore,
      functional_score: functionalScore,
      aggregate_score: aggregateScore,
      is_approved: isApproved,
      severity,
      failed_nodes: visual.unmatchedDomNodes || [],
      missing_routes: functional.unmappedEndpoints || [],
      recommended_fix_action: recommendedFixAction,
      stage_reached: stageReached || 0
    });

    return Response.json({
      runId,
      targetUrl,
      visualScore,
      functionalScore,
      aggregateScore,
      isApproved,
      diagnostics
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}