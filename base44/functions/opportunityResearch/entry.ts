import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { str } from '../../shared/cloudBrowser.ts';

// Does preliminary research on an opportunity + drafts a humanistic response email.
// Called after sweep (batch) or on-demand from the dashboard.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Owner only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const opportunityId = str(body?.opportunity_id, 100);

    // Batch mode: research all pending opportunities
    let opps = [];
    if (opportunityId) {
      const opp = await base44.asServiceRole.entities.Opportunity.get(opportunityId);
      if (!opp) return Response.json({ error: 'Opportunity not found' }, { status: 404 });
      opps = [opp];
    } else {
      const maxBatch = Math.min(Number(body?.max_batch) || 5, 10);
      opps = await base44.asServiceRole.entities.Opportunity.filter(
        { research_status: 'pending' },
        '-created_date',
        maxBatch
      );
    }

    if (opps.length === 0) {
      return Response.json({ message: 'No pending opportunities to research', researched: 0 });
    }

    let researched = 0;
    let failed = 0;

    for (const opp of opps) {
      try {
        const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are a senior business development analyst for a technology services company. We build websites, web apps, mobile apps, AI automation systems, data scraping pipelines, and business automation tools.

Analyze this opportunity and provide:

1. RESEARCH — Preliminary analysis of what they need and how we can help:
   - summary: 2-3 sentence overview of the opportunity
   - what_they_need: Specific services they're requesting
   - proposed_approach: How we would deliver the solution
   - estimated_value: Rough project value range (e.g., "$2,000-$8,000")
   - competitive_angle: Why we're uniquely positioned to win this (our AI/automation/website capabilities)
   - services_we_can_offer: Array of specific services we can pitch

2. RESPONSE DRAFT — A warm, humanistic, conversational email response to their posting:
   - Must sound like a real person writing personally — NOT a template, NOT corporate, NOT robotic
   - Reference specifics from their posting to show we actually read it
   - Be genuinely helpful and friendly, not salesy
   - Keep it concise (150-250 words) — people skim
   - Include a soft call to action (a quick chat or a question)
   - Sign off as "J" (the owner)
   - Write a compelling subject line that references their specific need

OPPORTUNITY:
Title: ${opp.title}
Source: ${opp.source}
Source URL: ${opp.source_url}
Description: ${opp.description}
Location: ${opp.location || 'N/A'}
Budget: ${opp.budget || 'N/A'}
Keywords: ${(opp.keywords || []).join(', ')}

Return JSON with this structure:
{
  "research": {
    "summary": "...",
    "what_they_need": "...",
    "proposed_approach": "...",
    "estimated_value": "...",
    "competitive_angle": "...",
    "services_we_can_offer": ["...", "..."]
  },
  "response_subject": "...",
  "response_draft": "..."
}`,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              research: {
                type: 'object',
                properties: {
                  summary: { type: 'string' },
                  what_they_need: { type: 'string' },
                  proposed_approach: { type: 'string' },
                  estimated_value: { type: 'string' },
                  competitive_angle: { type: 'string' },
                  services_we_can_offer: { type: 'array', items: { type: 'string' } }
                }
              },
              response_subject: { type: 'string' },
              response_draft: { type: 'string' }
            }
          }
        });

        await base44.asServiceRole.entities.Opportunity.update(opp.id, {
          research: llm?.research || {},
          response_subject: str(llm?.response_subject, 200),
          response_draft: str(llm?.response_draft, 4000),
          research_status: 'done',
          response_status: 'drafted',
          status: 'researched'
        });
        researched++;
      } catch (err) {
        await base44.asServiceRole.entities.Opportunity.update(opp.id, {
          research_status: 'failed'
        });
        failed++;
      }
    }

    return Response.json({
      researched,
      failed,
      total: opps.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}