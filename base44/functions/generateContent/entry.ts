import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { enhancedInvoke } from '../../shared/aiEnhancement.ts';

// Wraps Core.InvokeLLM with best-model routing + optional self-critique.
// The category param controls which model is used (defaults to content_generation).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const prompt = body.prompt;
    if (!prompt) return Response.json({ error: "Prompt required" }, { status: 400 });

    const res = await enhancedInvoke(base44, {
      prompt,
      category: body.category || 'content_generation',
      schema: body.response_json_schema,
      add_context_from_internet: body.add_context_from_internet || false,
      self_critique: body.self_critique || false,
    });
    return Response.json({ output: res });
  } catch (error) {
    console.error("generateContent error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}