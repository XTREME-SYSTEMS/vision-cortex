import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { project_id } = body;

    if (!project_id) {
      return Response.json({ error: 'project_id is required' }, { status: 400 });
    }

    const project = await base44.asServiceRole.entities.FactoryProject.get(project_id);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const { industry, sub_industry, target_audience } = project;

    // ── Research competitors, viral hooks, trending topics via web search ──
    const researchPrompt = `You are a competitive intelligence analyst and viral content strategist.
Industry: ${industry}
Sub-industry: ${sub_industry}
Target audience: ${target_audience || 'general consumers in this space'}

Research the current landscape and return:

1. **Top 5 competitors** — name, URL, key strengths, key weaknesses, and the gap we can exploit.

2. **10 viral content hooks** — proven, scroll-stopping opening lines specific to this sub-industry. These should be the kind of hooks that get shared, saved, and commented on. Base them on what's currently trending.

3. **10 trending topics** — subjects, pain points, and conversations currently gaining traction in this space.

4. **5 best content formats** — which formats (carousel, reel, long-form video, thread, story, blog) perform best for this audience and why.

Return JSON with this exact schema:
{
  "competitors": [
    { "name": "...", "url": "...", "strengths": "...", "weaknesses": "...", "gap": "..." }
  ],
  "viral_hooks": ["hook1", "hook2", ...],
  "trending_topics": ["topic1", "topic2", ...],
  "best_content_formats": ["format1 - why", "format2 - why", ...]
}`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: researchPrompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          competitors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                url: { type: 'string' },
                strengths: { type: 'string' },
                weaknesses: { type: 'string' },
                gap: { type: 'string' }
              }
            }
          },
          viral_hooks: { type: 'array', items: { type: 'string' } },
          trending_topics: { type: 'array', items: { type: 'string' } },
          best_content_formats: { type: 'array', items: { type: 'string' } }
        },
        required: ['competitors', 'viral_hooks', 'trending_topics', 'best_content_formats']
      }
    });

    const research = llmResponse;

    // ── Update project ──
    await base44.asServiceRole.entities.FactoryProject.update(project_id, {
      competitor_research: research,
      stage: 'researched'
    });

    return Response.json({
      project_id,
      ...research
    });
  } catch (error) {
    console.error('factoryResearchIndustry error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}