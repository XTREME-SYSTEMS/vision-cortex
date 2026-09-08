import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// ============================================================================
// ingestPromptLibrary — installs master prompts into the persistent PromptQueue
// (the "queen" system). Prompts wait in the queue until a dispatcher picks them
// up and invokes their target backend function. This replaces the old
// fire-and-forget approach: prompts now persist between runs.
//
// Actions:
//   install_all    — install every active SystemPrompt into the queue (idempotent)
//   install_one    — install a single prompt by prompt_id
//   status         — queue stats
//   dispatch_next  — pick the next due prompt and invoke its target function
// ============================================================================

// Sensible default: category -> backend function
const CATEGORY_FUNCTION_MAP: Record<string, string> = {
  audit: 'deepSystemAudit',
  heal: 'dnaSelfHeal',
  harden: 'vaultSecurity',
  optimize: 'autoEnhanceAll',
  manage: 'masterLoopOrchestrator',
  build: 'dispatchToBuilder',
  intelligence: 'intelligenceGatherer',
  communication: 'persistentMessageAgent',
  prediction: 'councilPredict',
  simulation: 'simulateStrategy',
  strategy: 'councilBlueprint',
  governance: 'runFullValidation',
  reflection: 'autoRecommendAllSystems',
  coding: 'implementEnhancement',
  memory: 'bootstrapCoreDocuments',
  discovery: 'DeepDiscoveryScan',
  scraping: 'cloudBrowserPipeline',
  clone: 'deepCloneSystem',
  provision: 'provisionVercel',
  other: 'masterLoopOrchestrator',
};

const DEFAULT_CADENCE: Record<string, number> = {
  audit: 24,
  heal: 12,
  harden: 168,
  optimize: 168,
  manage: 6,
  build: 0,
  intelligence: 24,
  communication: 0,
  prediction: 24,
  simulation: 0,
  strategy: 168,
  governance: 24,
  reflection: 24,
  coding: 0,
  memory: 168,
  discovery: 24,
  scraping: 0,
  clone: 0,
  provision: 0,
  other: 24,
};

function nextRunFromCadence(hours: number): string {
  if (!hours || hours <= 0) return new Date(Date.now() + 60000).toISOString(); // 1 min for one-shot
  return new Date(Date.now() + hours * 3600 * 1000).toISOString();
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'install_all';

    // ── INSTALL ALL: enqueue every active prompt (idempotent) ──
    if (action === 'install_all') {
      const prompts = await base44.asServiceRole.entities.SystemPrompt.filter(
        { active: true },
        'category',
        200
      );
      if (!prompts || prompts.length === 0) {
        return Response.json({ ok: true, message: 'No active prompts to install', installed: 0 });
      }

      // Pull existing queue entries so we don't duplicate
      const existing = await base44.asServiceRole.entities.PromptQueue.list('-created_date', 500);
      const existingByPromptId = new Map((existing || []).map((q) => [q.prompt_id, q]));

      const results = [];
      let installed = 0;
      let skipped = 0;

      for (const prompt of prompts) {
        const targetFunction = body?.function_map?.[prompt.category] || CATEGORY_FUNCTION_MAP[prompt.category] || 'masterLoopOrchestrator';
        const cadence = body?.cadence_map?.[prompt.category] ?? DEFAULT_CADENCE[prompt.category] ?? 24;

        if (existingByPromptId.has(prompt.id)) {
          // Update target function / cadence if changed, keep status
          const entry = existingByPromptId.get(prompt.id);
          if (entry.target_function !== targetFunction || entry.cadence_hours !== cadence) {
            await base44.asServiceRole.entities.PromptQueue.update(entry.id, {
              target_function: targetFunction,
              cadence_hours: cadence,
              prompt_name: prompt.name,
              category: prompt.category,
            });
          }
          skipped++;
          results.push({ prompt_id: prompt.id, name: prompt.name, status: 'already_queued' });
          continue;
        }

        await base44.asServiceRole.entities.PromptQueue.create({
          prompt_id: prompt.id,
          prompt_name: prompt.name,
          category: prompt.category,
          target_function: targetFunction,
          priority: 'medium',
          status: 'queued',
          cadence_hours: cadence,
          next_run_at: nextRunFromCadence(cadence),
          run_count: 0,
          fail_count: 0,
          payload: {},
          active: true,
        });

        // Tick usage_count so the library reflects installation
        await base44.asServiceRole.entities.SystemPrompt.update(prompt.id, {
          usage_count: (prompt.usage_count || 0) + 1,
          last_optimized_at: new Date().toISOString(),
        });

        installed++;
        results.push({ prompt_id: prompt.id, name: prompt.name, target_function: targetFunction, status: 'installed' });
      }

      await base44.asServiceRole.entities.AgentLog.create({
        agent_name: 'PRIMUS',
        category: 'prompt_ingestion',
        level: 'success',
        message: `Installed ${installed} prompts into queue (${skipped} already queued)`,
        detail: JSON.stringify({ installed, skipped, total: prompts.length }).slice(0, 500),
      });

      return Response.json({
        ok: true,
        total: prompts.length,
        installed,
        skipped,
        results,
      });
    }

    // ── INSTALL ONE: enqueue a single prompt ──
    if (action === 'install_one') {
      const { prompt_id } = body;
      if (!prompt_id) return Response.json({ error: 'prompt_id required' }, { status: 400 });

      const prompt = await base44.asServiceRole.entities.SystemPrompt.get(prompt_id);
      if (!prompt) return Response.json({ error: 'Prompt not found' }, { status: 404 });

      const targetFunction = body?.target_function || CATEGORY_FUNCTION_MAP[prompt.category] || 'masterLoopOrchestrator';
      const cadence = body?.cadence_hours ?? DEFAULT_CADENCE[prompt.category] ?? 24;

      // Check existing
      const existing = await base44.asServiceRole.entities.PromptQueue.filter({ prompt_id }, 'created_date', 1);
      if (existing && existing.length > 0) {
        return Response.json({ ok: true, message: 'Already queued', queue_id: existing[0].id });
      }

      const entry = await base44.asServiceRole.entities.PromptQueue.create({
        prompt_id: prompt.id,
        prompt_name: prompt.name,
        category: prompt.category,
        target_function: targetFunction,
        priority: body?.priority || 'medium',
        status: 'queued',
        cadence_hours: cadence,
        next_run_at: nextRunFromCadence(cadence),
        run_count: 0,
        fail_count: 0,
        payload: body?.payload || {},
        active: true,
      });

      await base44.asServiceRole.entities.SystemPrompt.update(prompt_id, {
        usage_count: (prompt.usage_count || 0) + 1,
        last_optimized_at: new Date().toISOString(),
      });

      return Response.json({ ok: true, queue_id: entry.id, prompt_name: prompt.name, target_function: targetFunction });
    }

    // ── STATUS: queue stats ──
    if (action === 'status') {
      const queue = await base44.asServiceRole.entities.PromptQueue.list('-created_date', 500);
      const byStatus = (queue || []).reduce((acc, q) => {
        acc[q.status] = (acc[q.status] || 0) + 1;
        return acc;
      }, {});
      const dueNow = (queue || []).filter((q) => q.active && q.status === 'queued' && (!q.next_run_at || new Date(q.next_run_at) <= new Date())).length;

      return Response.json({
        ok: true,
        total_in_queue: (queue || []).length,
        by_status: byStatus,
        due_now: dueNow,
      });
    }

    // ── DISPATCH NEXT: pick the next due prompt and invoke its target function ──
    if (action === 'dispatch_next') {
      const [queued, failed, skipped] = await Promise.all([
        base44.asServiceRole.entities.PromptQueue.filter({ active: true, status: 'queued' }, 'next_run_at', 50),
        base44.asServiceRole.entities.PromptQueue.filter({ active: true, status: 'failed' }, 'next_run_at', 50),
        base44.asServiceRole.entities.PromptQueue.filter({ active: true, status: 'skipped' }, 'next_run_at', 50),
      ]);
      const candidates = [
        ...(failed || []),
        ...(skipped || []),
        ...(queued || []).filter((q) => !q.next_run_at || new Date(q.next_run_at) <= new Date()),
      ];
      if (candidates.length === 0) {
        const allDue = [...(queued || []), ...(failed || [])].sort((a, b) => new Date(a.next_run_at || 0) - new Date(b.next_run_at || 0));
        return Response.json({ ok: true, message: 'No prompts due yet', next_due: allDue[0]?.next_run_at || null });
      }

      const skippedList = [];
      for (const entry of candidates) {
        const now = new Date().toISOString();
        await base44.asServiceRole.entities.PromptQueue.update(entry.id, { status: 'processing', last_run_at: now });

        try {
          const prompt = await base44.asServiceRole.entities.SystemPrompt.get(entry.prompt_id);
          const fnPayload = {
            prompt_id: entry.prompt_id,
            prompt_text: prompt?.prompt_text || '',
            prompt_name: entry.prompt_name,
            name: entry.prompt_name,
            title: entry.prompt_name,
            strategy_name: entry.prompt_name,
            category: entry.category,
            queue_id: entry.id,
            ...(entry.payload || {}),
          };

          const fnResult = await base44.asServiceRole.functions.invoke(entry.target_function, fnPayload);
          const resultStr = typeof fnResult === 'string' ? fnResult : JSON.stringify(fnResult?.data || fnResult || {});

          const cadence = entry.cadence_hours || 0;
          const isOneShot = cadence <= 0;
          await base44.asServiceRole.entities.PromptQueue.update(entry.id, {
            status: isOneShot ? 'completed' : 'queued',
            last_result: resultStr.slice(0, 500),
            run_count: (entry.run_count || 0) + 1,
            next_run_at: isOneShot ? null : nextRunFromCadence(cadence),
          });

          await base44.asServiceRole.entities.AgentLog.create({
            agent_name: 'PRIMUS',
            category: 'prompt_dispatch',
            level: 'success',
            message: `Dispatched prompt: ${entry.prompt_name} -> ${entry.target_function}`,
            detail: resultStr.slice(0, 300),
          });

          return Response.json({
            ok: true,
            dispatched: entry.prompt_name,
            target_function: entry.target_function,
            result: resultStr.slice(0, 500),
            skipped_count: skippedList.length,
          });
        } catch (err) {
          const is400 = (err?.message || '').includes('400');
          const newStatus = is400 ? 'skipped' : 'failed';
          await base44.asServiceRole.entities.PromptQueue.update(entry.id, {
            status: newStatus,
            last_result: err.message.slice(0, 500),
            fail_count: (entry.fail_count || 0) + 1,
            next_run_at: is400 ? null : nextRunFromCadence(entry.cadence_hours || 24),
          });
          await base44.asServiceRole.entities.AgentLog.create({
            agent_name: 'PRIMUS',
            category: 'prompt_dispatch',
            level: is400 ? 'warn' : 'error',
            message: `${is400 ? 'Skipped (needs manual inputs)' : 'Failed dispatch'}: ${entry.prompt_name} -> ${entry.target_function}`,
            detail: err.message.slice(0, 300),
          });

          if (is400) {
            skippedList.push({ name: entry.prompt_name, target_function: entry.target_function, error: err.message });
            continue; // try the next candidate
          }
          return Response.json({ ok: false, error: err.message, dispatched: entry.prompt_name });
        }
      }

      // All candidates were skipped
      return Response.json({
        ok: false,
        message: 'All due prompts require specific manual inputs — none could be auto-dispatched',
        skipped: skippedList,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}