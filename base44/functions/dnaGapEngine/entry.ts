import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// dnaGapEngine — scans capabilities + requirements and creates SystemDNA_Gap
// records for anything below the benchmark bar. Deduplicates against existing
// gaps so the autonomous loop doesn't flood the ledger. (Spec §29, rules 8-9)

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sr = base44.asServiceRole.entities;
    const caps = await sr.SystemDNA_Capability.list('-benchmark_position', 500);
    const existingGaps = await sr.SystemDNA_Gap.list('-severity', 500);

    // Dedup key: system_id + capability
    const existingKeys = new Set(existingGaps.map((g) => `${g.system_id}|${g.capability_id || ''}`));

    const newGaps = [];
    let counter = existingGaps.length + 1;

    for (const cap of caps) {
      const key = `${cap.system_id}|${cap.dna_id}`;
      if (existingKeys.has(key)) continue;

      // Determine if this capability has a gap
      let hasGap = false;
      let severity = 'P3';
      let targetState = cap.benchmark_state || 'benchmark standard';
      let currentState = cap.current_state || 'UNKNOWN';
      let difference = '';
      let isBlocking = false;

      if (!cap.implemented) {
        hasGap = true;
        severity = cap.category === 'security' ? 'P0' : 'P1';
        difference = `Capability not implemented. Target: ${targetState}.`;
      } else if (cap.category === 'security' && !cap.hardened) {
        hasGap = true;
        severity = 'P0';
        isBlocking = true;
        difference = `Security capability implemented but not hardened.`;
      } else if (cap.implemented && !cap.validated) {
        hasGap = true;
        severity = 'P1';
        difference = `Implemented but not validated — no evidence it works.`;
      } else if ((cap.benchmark_position || 0) < 50) {
        hasGap = true;
        severity = 'P2';
        difference = `Below 50% of benchmark (score ${cap.benchmark_position}).`;
      } else if ((cap.benchmark_position || 0) < 70) {
        hasGap = true;
        severity = 'P3';
        difference = `Below 70% of benchmark (score ${cap.benchmark_position}).`;
      }

      if (!hasGap) continue;

      const dnaId = `GAP-${String(counter).padStart(6, '0')}`;
      counter++;
      newGaps.push({
        dna_id: dnaId,
        system_id: cap.system_id,
        capability_id: cap.dna_id,
        target_state: targetState,
        current_state: currentState,
        measurable_difference: difference,
        severity,
        priority: severity,
        impact: `${cap.system_name} / ${cap.module} / ${cap.capability}`,
        proposed_solution: cap.gap_description || '',
        status: 'open',
        is_blocking: isBlocking,
      });
    }

    let created = [];
    if (newGaps.length > 0) {
      created = await sr.SystemDNA_Gap.bulkCreate(newGaps);
    }

    return Response.json({
      scanned: caps.length,
      gaps_created: created.length,
      blocked: newGaps.filter((g) => g.is_blocking).length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}