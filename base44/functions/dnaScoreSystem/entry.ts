import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// dnaScoreSystem — recalculates every system's verified current_score from its
// capabilities using the multi-score model. CRITICAL RULE (spec §27): the aggregate
// NEVER hides a critical failure — if any capability has a critical gap or any
// blocking gap exists, the score is capped regardless of the average.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sr = base44.asServiceRole.entities;
    const systems = await sr.SystemDNA_System.list('category', 50);
    const caps = await sr.SystemDNA_Capability.list('-benchmark_position', 500);
    const gaps = await sr.SystemDNA_Gap.list('-severity', 200);

    const results = [];
    for (const sys of systems) {
      const sysCaps = caps.filter((c) => c.system_id === sys.dna_id);
      const sysGaps = gaps.filter((g) => g.system_id === sys.dna_id);
      const criticalGaps = sysGaps.filter((g) => g.severity === 'P0' || g.is_blocking);
      const blockingGaps = sysGaps.filter((g) => g.is_blocking);

      // Base score = average benchmark_position across capabilities
      const avg = sysCaps.length
        ? Math.round(sysCaps.reduce((a, c) => a + (c.benchmark_position || 0), 0) / sysCaps.length)
        : 0;

      // CRITICAL RULE: aggregate never hides a critical failure.
      // - Any blocking gap → cap at 40
      // - Any critical (P0) gap → cap at 60
      // - Any capability with gap_severity "critical" → cap at 70
      let score = avg;
      let capReason = null;
      if (blockingGaps.length > 0) { score = Math.min(score, 40); capReason = `${blockingGaps.length} blocking gap(s)`; }
      else if (criticalGaps.length > 0) { score = Math.min(score, 60); capReason = `${criticalGaps.length} critical gap(s)`; }
      else {
        const criticalCap = sysCaps.some((c) => c.gap_severity === 'critical');
        if (criticalCap) { score = Math.min(score, 70); capReason = 'critical capability gap'; }
      }

      // Count failed tests = capabilities implemented but not validated
      const failedTests = sysCaps.filter((c) => c.implemented && !c.validated).length;
      // Blocked requirements (proxy: gaps that are blocking)
      const blockedReqs = blockingGaps.length;

      // Health status
      let health = 'healthy';
      if (blockingGaps.length > 0 || score < 25) health = 'critical';
      else if (criticalGaps.length > 0 || score < 50) health = 'degraded';

      // Validation health
      let valHealth = 'validated';
      if (sysCaps.length === 0 || sysCaps.every((c) => !c.validated)) valHealth = 'untested';
      else if (sysCaps.some((c) => c.implemented && !c.validated)) valHealth = 'partial';

      // Security health
      let secHealth = 'secure';
      if (sysGaps.some((g) => g.is_blocking)) secHealth = 'critical';
      else if (sysCaps.some((c) => !c.hardened)) secHealth = 'partial';

      const updates = {
        current_score: score,
        critical_gaps_count: criticalGaps.length,
        blocked_requirements_count: blockedReqs,
        failed_tests_count: failedTests,
        health_status: health,
        validation_health: valHealth,
        security_health: secHealth,
      };

      await sr.SystemDNA_System.update(sys.id, updates);
      results.push({ system: sys.name, score, capped: !!capReason, capReason, caps: sysCaps.length, criticalGaps: criticalGaps.length });
    }

    return Response.json({ scored: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}