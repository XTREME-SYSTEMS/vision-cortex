import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { project_id, action } = body;

    if (!project_id) return Response.json({ error: 'project_id is required' }, { status: 400 });

    const project = await base44.asServiceRole.entities.FactoryProject.get(project_id);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const { viral_content, brand_pack, social_ai_state, business_name, industry, sub_industry } = project;
    const currentState = social_ai_state || {
      engagement_metrics: { total_posts: 0, total_replies: 0, avg_engagement_rate: 0 },
      learned_patterns: [],
      response_templates: []
    };

    // ── Action: generate_response_templates ──
    // Creates AI response templates for common comment types
    if (action === 'generate_response_templates') {
      const templatePrompt = `You are a social media community manager.
Business: ${business_name}
Industry: ${industry} / ${sub_industry}
Brand voice: ${brand_pack?.voice || 'professional and friendly'}

Generate 10 response templates for common social media comment types:
- Positive praise ("Love this!")
- Questions about pricing
- Questions about services
- Complaints/negative feedback
- Spam/solicitation (polite deflection)
- Local/area questions
- Competitor mentions
- Booking/appointment requests
- General engagement ("Cool!" "Nice!")
- Viral-comment opportunities (witty responses that could go viral)

Each template should have a {type} and {template} with [placeholders] for personalization.

Return JSON: { "templates": [{ "type": "...", "template": "..." }] }`;

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: templatePrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            templates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  template: { type: 'string' }
                }
              }
            }
          },
          required: ['templates']
        }
      });

      const newState = {
        ...currentState,
        response_templates: result.templates
      };

      await base44.asServiceRole.entities.FactoryProject.update(project_id, {
        social_ai_state: newState
      });

      return Response.json({ project_id, response_templates: result.templates });
    }

    // ── Action: learn ──
    // Analyzes engagement data and extracts patterns to improve future content
    if (action === 'learn') {
      const { engagement_data } = body;

      const learnPrompt = `You are a social media analytics expert.
Business: ${business_name}
Industry: ${industry} / ${sub_industry}

Here is recent engagement data from social media posts:
${JSON.stringify(engagement_data || currentState.engagement_metrics)}

Analyze this data and extract:
1. **Learned patterns** — what hooks, formats, times, and content types perform best. Be specific and actionable.
2. **Improvement recommendations** — 5 specific changes to make to the next batch of content.
3. **Best performing hook** — the hook that got the most engagement.
4. **Worst performing hook** — the hook that got the least.
5. **Updated engagement metrics** — recalculate totals.

Return JSON:
{
  "learned_patterns": ["pattern1", "pattern2", ...],
  "improvements": ["improvement1", "improvement2", ...],
  "best_performing_hook": "...",
  "worst_performing_hook": "...",
  "updated_metrics": { "total_posts": N, "total_replies": N, "avg_engagement_rate": N }
}`;

      const learnResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: learnPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            learned_patterns: { type: 'array', items: { type: 'string' } },
            improvements: { type: 'array', items: { type: 'string' } },
            best_performing_hook: { type: 'string' },
            worst_performing_hook: { type: 'string' },
            updated_metrics: {
              type: 'object',
              properties: {
                total_posts: { type: 'number' },
                total_replies: { type: 'number' },
                avg_engagement_rate: { type: 'number' }
              }
            }
          },
          required: ['learned_patterns', 'improvements']
        }
      });

      const newState = {
        ...currentState,
        engagement_metrics: {
          ...currentState.engagement_metrics,
          ...learnResult.updated_metrics,
          best_performing_hook: learnResult.best_performing_hook,
          worst_performing_hook: learnResult.worst_performing_hook
        },
        learned_patterns: [...(currentState.learned_patterns || []), ...learnResult.learned_patterns],
        last_learned_at: new Date().toISOString()
      };

      await base44.asServiceRole.entities.FactoryProject.update(project_id, {
        social_ai_state: newState
      });

      return Response.json({
        project_id,
        learned_patterns: learnResult.learned_patterns,
        improvements: learnResult.improvements,
        updated_state: newState
      });
    }

    // ── Action: auto_respond ──
    // Generates a response to a specific comment using learned templates
    if (action === 'auto_respond') {
      const { comment, commenter_name } = body;
      if (!comment) return Response.json({ error: 'comment is required for auto_respond' }, { status: 400 });

      const respondPrompt = `You are a social media community manager for ${business_name}.
Brand voice: ${brand_pack?.voice || 'professional and friendly'}

Response templates available:
${JSON.stringify(currentState.response_templates || [])}

A user named ${commenter_name || 'someone'} commented: "${comment}"

Generate the best response. Match the comment's intent to the closest template type, then personalize it.
If the comment is a question about services/pricing, include a soft CTA.
If it's negative, acknowledge and redirect to DM.
If it's a viral opportunity, be witty and on-brand.

Return JSON: { "response": "...", "type": "...", "should_flag": false }`;

      const respondResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: respondPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            response: { type: 'string' },
            type: { type: 'string' },
            should_flag: { type: 'boolean' }
          },
          required: ['response', 'type']
        }
      });

      return Response.json({
        project_id,
        comment,
        ...respondResult
      });
    }

    return Response.json({ error: 'Unknown action. Use: generate_response_templates, learn, or auto_respond' }, { status: 400 });
  } catch (error) {
    console.error('factorySocialAI error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}