import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// ============================================================================
// ingestPromptLibrary — Sequentially ingests every active SystemPrompt into
// the agent's active context, one immediately after another. Each prompt is
// invoked through the LLM, its usage_count is incremented, and an AgentLog
// entry records the ingestion. Designed for autonomous agent self-loading.
// ============================================================================

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      action = 'ingest_all',
      agent_name = 'PRIMUS',
      category_filter,
      max_per_run = 50,
      delay_ms = 0,
    } = body;

    // Normalize model names: entity uses underscores (claude_sonnet_5), API needs hyphens (claude-sonnet-5)
    const normalizeModel = (m: string): string => {
      if (!m || m === 'automatic' || m === 'gemini_3_flash') return m;
      const valid = ['automatic', 'gemini_3_8_flash', 'gpt_5_6_luna', 'claude-sonnet-5', 'gpt_5_6_terra', 'claude_opus_5', 'gpt_5_6_sol', 'gpt_6_astra', 'claude_fable_5_1', 'glm_5_2'];
      if (valid.includes(m)) return m;
      // Map common underscore variants to valid API names
      const map: Record<string, string> = {
        'claude_sonnet_5': 'claude-sonnet-5',
        'claude_opus_5': 'claude_opus_5',
        'gemini_3_1_pro': 'gemini_3_8_flash',
        'gpt_5_mini': 'gpt_5_6_luna',
        'gpt_5_4': 'gpt_5_6_terra',
      };
      return map[m] || 'gemini_3_8_flash';
    };

    // ── INGEST ALL: sequentially process every active prompt ──
    if (action === 'ingest_all') {
      const filter: any = { active: true };
      if (category_filter) filter.category = category_filter;

      const prompts = await base44.asServiceRole.entities.SystemPrompt.filter(filter, 'category', max_per_run);
      if (!prompts || prompts.length === 0) {
        return Response.json({ ok: true, message: 'No active prompts found to ingest', ingested: 0 });
      }

      const results = [];
      let succeeded = 0;
      let failed = 0;

      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        try {
          // Invoke the prompt through the LLM to activate it in agent context
          const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `[SYSTEM INGESTION — Prompt ${i + 1} of ${prompts.length}]\n\nAgent: ${agent_name}\nCategory: ${prompt.category}\n\n--- PROMPT ---\n${prompt.prompt_text}\n--- END PROMPT ---\n\nAcknowledge that you have internalized this prompt. Confirm your understanding in one sentence.`,
            model: normalizeModel(prompt.target_model),
          });

          const responseText = typeof llmResponse === 'string' ? llmResponse : JSON.stringify(llmResponse);

          // Increment usage_count
          await base44.asServiceRole.entities.SystemPrompt.update(prompt.id, {
            usage_count: (prompt.usage_count || 0) + 1,
            last_optimized_at: new Date().toISOString(),
          });

          // Log ingestion
          await base44.asServiceRole.entities.AgentLog.create({
            agent_name,
            category: 'prompt_ingestion',
            level: 'success',
            message: `Ingested prompt: ${prompt.name} (${prompt.category})`,
            detail: `Sequence ${i + 1}/${prompts.length}. Response: ${responseText.slice(0, 200)}`,
          });

          results.push({
            id: prompt.id,
            name: prompt.name,
            category: prompt.category,
            sequence: i + 1,
            status: 'success',
          });
          succeeded++;

          if (delay_ms > 0) await new Promise(r => setTimeout(r, delay_ms));
        } catch (err) {
          failed++;
          results.push({
            id: prompt.id,
            name: prompt.name,
            category: prompt.category,
            sequence: i + 1,
            status: 'failed',
            error: err.message,
          });

          await base44.asServiceRole.entities.AgentLog.create({
            agent_name,
            category: 'prompt_ingestion',
            level: 'error',
            message: `Failed to ingest prompt: ${prompt.name}`,
            detail: err.message,
          });
        }
      }

      return Response.json({
        ok: true,
        agent: agent_name,
        total: prompts.length,
        succeeded,
        failed,
        results,
      });
    }

    // ── INGEST SINGLE: process one specific prompt by ID ──
    if (action === 'ingest_one') {
      const { prompt_id } = body;
      if (!prompt_id) return Response.json({ error: 'prompt_id required' }, { status: 400 });

      const prompt = await base44.asServiceRole.entities.SystemPrompt.get(prompt_id);
      if (!prompt) return Response.json({ error: 'Prompt not found' }, { status: 404 });

      const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `[SYSTEM INGESTION — Single Prompt]\n\nAgent: ${agent_name}\nCategory: ${prompt.category}\n\n--- PROMPT ---\n${prompt.prompt_text}\n--- END PROMPT ---\n\nAcknowledge that you have internalized this prompt.`,
        model: normalizeModel(prompt.target_model),
      });

      const responseText = typeof llmResponse === 'string' ? llmResponse : JSON.stringify(llmResponse);

      await base44.asServiceRole.entities.SystemPrompt.update(prompt_id, {
        usage_count: (prompt.usage_count || 0) + 1,
        last_optimized_at: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.AgentLog.create({
        agent_name,
        category: 'prompt_ingestion',
        level: 'success',
        message: `Ingested single prompt: ${prompt.name}`,
        detail: responseText.slice(0, 300),
      });

      return Response.json({ ok: true, prompt_id, name: prompt.name, response: responseText.slice(0, 500) });
    }

    // ── STATUS: show ingestion progress ──
    if (action === 'status') {
      const all = await base44.asServiceRole.entities.SystemPrompt.filter({ active: true }, 'category', 200);
      const ingested = all.filter(p => (p.usage_count || 0) > 0);
      const never_ingested = all.filter(p => (p.usage_count || 0) === 0);

      return Response.json({
        ok: true,
        total_active: all.length,
        ingested_count: ingested.length,
        never_ingested_count: never_ingested.length,
        avg_usage: all.length > 0 ? Math.round(all.reduce((s, p) => s + (p.usage_count || 0), 0) / all.length) : 0,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}