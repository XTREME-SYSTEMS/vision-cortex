import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { project_id, platforms } = body;

    if (!project_id) {
      return Response.json({ error: 'project_id is required' }, { status: 400 });
    }

    const project = await base44.asServiceRole.entities.FactoryProject.get(project_id);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const { industry, sub_industry, business_name, brand_pack, competitor_research, target_audience } = project;
    const targetPlatforms = platforms || ['instagram', 'tiktok', 'twitter', 'linkedin', 'facebook'];

    // ── Generate 30 viral content posts ──
    const contentPrompt = `You are a viral content strategist and social media expert.
Business: ${business_name}
Industry: ${industry} / ${sub_industry}
Brand voice: ${brand_pack?.voice || 'professional and engaging'}
Target audience: ${target_audience || 'general'}
Platforms: ${targetPlatforms.join(', ')}

Viral hooks from research: ${(competitor_research?.viral_hooks || []).join(' | ')}
Trending topics: ${(competitor_research?.trending_topics || []).join(' | ')}
Best content formats: ${(competitor_research?.best_content_formats || []).join(' | ')}

Generate 30 viral social media posts distributed across these platforms: ${targetPlatforms.join(', ')}.
Each post must have:
- A scroll-stopping hook (use the viral hooks as inspiration)
- Body content (2-4 sentences, platform-appropriate length)
- A clear CTA (book, follow, click, share)
- 3-5 relevant hashtags
- The best posting time for that platform

Mix content types: educational, entertaining, behind-the-scenes, social proof, trending, controversial (tasteful).
Distribute roughly evenly across platforms.

Return JSON:
{
  "posts": [
    {
      "platform": "instagram",
      "type": "educational",
      "hook": "...",
      "body": "...",
      "cta": "...",
      "hashtags": ["#tag1", "#tag2"],
      "best_post_time": "Tuesday 11am"
    }
  ]
}`;

    const contentResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: contentPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          posts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                platform: { type: 'string' },
                type: { type: 'string' },
                hook: { type: 'string' },
                body: { type: 'string' },
                cta: { type: 'string' },
                hashtags: { type: 'array', items: { type: 'string' } },
                best_post_time: { type: 'string' }
              }
            }
          }
        },
        required: ['posts']
      }
    });

    // ── Update project ──
    await base44.asServiceRole.entities.FactoryProject.update(project_id, {
      viral_content: contentResult.posts,
      social_config: {
        platforms: targetPlatforms,
        auto_post_enabled: false,
        posting_schedule: 'daily',
        auto_respond_enabled: false
      },
      stage: 'content_generated'
    });

    return Response.json({
      project_id,
      posts: contentResult.posts,
      count: contentResult.posts.length
    });
  } catch (error) {
    console.error('factoryContentGenerator error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}