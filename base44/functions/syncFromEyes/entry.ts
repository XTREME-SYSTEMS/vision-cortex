import { createClientFromRequest, secrets } from '../../runtime/index';

export default async function(req) {
  try {
    // Verify the inbound API key from V-2 (Eyes/Cloud Browser)
    const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization') || '';
    const providedKey = authHeader.replace('Bearer ', '').trim();
    const expectedKey = secrets.get('VISION_CORTEX_EYES_API_KEY');

    if (!expectedKey || providedKey !== expectedKey) {
      return Response.json({ error: 'Unauthorized — invalid Eyes API key' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { items, batch_id, source } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'No items provided' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Map incoming intel items to IntelFeed records
    const records = items.slice(0, 500).map((item) => ({
      category: item.category || 'autonomous_intel',
      headline: item.headline || item.title || 'Untitled',
      summary: item.summary || item.description || '',
      source: item.source || source || 'cloud_browser',
      url: item.url || '',
      signals: item.signals || [],
      correlations: item.correlations || [],
      region: item.region || '',
      impact_score: item.impact_score || 0,
    }));

    const created = await base44.asServiceRole.entities.IntelFeed.bulkCreate(records);

    return Response.json({
      status: 'success',
      ingested: created.length,
      batch_id: batch_id || null,
      message: `V-1 Brain received ${created.length} intel items from V-2 Eyes`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}