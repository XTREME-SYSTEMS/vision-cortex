import { createClientFromRequest } from '../../runtime/index';

// Deep Discovery Scan — competitive intelligence for a clone target niche.
// Uses LLM + web context to profile the top competitors, pricing, and a financial
// projection for the rebranded clone. Feeds the Clone Factory pipeline.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { niche, targetDomain, competitorCount } = body;

    if (!niche) {
      return Response.json({ error: 'niche is required' }, { status: 400 });
    }

    const count = Math.min(competitorCount || 3, 5);

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a strategic business analyst and competitive intelligence expert.
Research the top ${count} competitors in the "${niche}" industry${targetDomain ? ` (excluding ${targetDomain})` : ''}.

For each competitor provide:
- name: the company/product name
- url: their primary website
- pricing: their pricing model and starting price
- strength: their single biggest competitive strength
- weakness: their biggest exploitable weakness
- market_share_estimate: rough % of the niche they hold

Also provide:
- total_addressable_market: estimated TAM for this niche
- growth_rate: estimated annual growth %
- recommended_positioning: the white-space positioning a rebranded clone should take to win
- financial_projection_12mo: a conservative 12-month revenue projection for a well-executed clone entering this niche
- top_3_risks: the 3 biggest risks of entering this niche

Return ONLY a JSON object with this exact shape:
{
  "competitors": [{ "name": "", "url": "", "pricing": "", "strength": "", "weakness": "", "market_share_estimate": "" }],
  "total_addressable_market": "",
  "growth_rate": "",
  "recommended_positioning": "",
  "financial_projection_12mo": "",
  "top_3_risks": ["", "", ""]
}`,
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
                pricing: { type: 'string' },
                strength: { type: 'string' },
                weakness: { type: 'string' },
                market_share_estimate: { type: 'string' }
              }
            }
          },
          total_addressable_market: { type: 'string' },
          growth_rate: { type: 'string' },
          recommended_positioning: { type: 'string' },
          financial_projection_12mo: { type: 'string' },
          top_3_risks: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json({
      niche,
      targetDomain: targetDomain || null,
      competitors: llmResponse.competitors || [],
      totalAddressableMarket: llmResponse.total_addressable_market || '',
      growthRate: llmResponse.growth_rate || '',
      recommendedPositioning: llmResponse.recommended_positioning || '',
      financialProjection12mo: llmResponse.financial_projection_12mo || '',
      topRisks: llmResponse.top_3_risks || []
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}