import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// ============================================================================
// deepCloneSystem — DEEP-powered universal system cloner
// ============================================================================
// Given any URL, this function:
//   1. Fetches the target site via cloud browser
//   2. Extracts all pages, components, styles, content
//   3. Identifies what it CAN'T directly clone (backend logic, DBs, APIs)
//   4. Uses LLM to infer/template the missing parts for full parity
//   5. Generates a complete frontend + backend clone spec
//   6. Returns the spec + parity assessment
// ============================================================================

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Owner only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { target_url, industry, job_id } = body;
    if (!target_url) return Response.json({ error: 'target_url is required' }, { status: 400 });

    const logs = [];
    const log = (msg) => logs.push(`[${new Date().toISOString()}] ${msg}`);

    log(`DEEP Clone System initiated for ${target_url}`);

    // Step 1: Fetch the target site via cloud browser
    log('Step 1: Fetching target site via cloud browser engine...');
    let siteData = null;
    try {
      const scrapeRes = await base44.asServiceRole.functions.invoke('stealthBrowse', {
        url: target_url,
        extract_content: true,
        extract_links: true,
        extract_styles: true,
        screenshot: true,
      });
      // Extract only serializable fields — the raw response may contain circular refs
      const d = scrapeRes.data || scrapeRes;
      siteData = {
        html: d.html || d.content || '',
        title: d.title || '',
        text: d.text || d.textContent || '',
        links: Array.isArray(d.links) ? d.links.slice(0, 100) : [],
        styles: d.styles || {},
        screenshot_url: d.screenshot_url || d.screenshot || '',
        pages: d.pages || [{ url: target_url, html: d.html || d.content || '' }],
      };
      log(`Fetched ${siteData.pages.length} page(s), ${siteData.links.length} links`);
    } catch (e) {
      log(`Cloud browser failed, falling back to direct fetch: ${e.message}`);
      try {
        const fetchRes = await fetch(target_url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VisionCortexClone/1.0)' },
        });
        const html = await fetchRes.text();
        siteData = { html, pages: [{ url: target_url, html }], links: [], styles: {} };
        log(`Direct fetch: ${html.length} chars of HTML`);
      } catch (e2) {
        return Response.json({ error: `Failed to fetch target: ${e2.message}` }, { status: 500 });
      }
    }

    // Step 2: Extract structure — pages, components, styles, content
    log('Step 2: Extracting site structure via LLM...');
    const extractPrompt = `You are a DEEP system clone architect. Analyze this website HTML/content and extract a COMPLETE structural specification.

TARGET URL: ${target_url}
INDUSTRY: ${industry || 'unknown'}

SITE DATA (first 15000 chars):
${JSON.stringify(siteData).substring(0, 15000)}

Extract and return a JSON object with:
1. "pages" — array of page specs, each with: name, route, layout_type, sections[]
2. "components" — array of reusable component specs, each with: name, type, props, purpose
3. "styles" — color palette (hex values), typography (font families), spacing, border_radius
4. "content" — all text content organized by page/section
5. "navigation" — nav structure, links, menu items
6. "uncloneable" — array of things that CANNOT be directly cloned (backend APIs, databases, auth, payment processing, real-time features) — be specific
7. "inferred" — for each uncloneable item, describe how to infer/template a replacement (e.g. "use Supabase for database", "use Stripe for payments", "generate auth with Base44 built-in")

Return ONLY valid JSON. Be thorough — this must achieve 100% parity.`;

    const extractResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: extractPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          pages: { type: 'array', items: { type: 'object' } },
          components: { type: 'array', items: { type: 'object' } },
          styles: { type: 'object' },
          content: { type: 'object' },
          navigation: { type: 'object' },
          uncloneable: { type: 'array', items: { type: 'string' } },
          inferred: { type: 'array', items: { type: 'object' } },
        },
        required: ['pages', 'components', 'styles', 'uncloneable', 'inferred'],
      },
    });

    const cloneSpec = extractResult;

    log(`Extracted ${cloneSpec.pages?.length || 0} pages, ${cloneSpec.components?.length || 0} components`);
    log(`Uncloneable items: ${cloneSpec.uncloneable?.length || 0} — inferring replacements...`);

    // Step 3: Infer backend spec for uncloneable items
    log('Step 3: Generating backend specification for inferred components...');
    const backendPrompt = `You are a DEEP backend architect. Given the following frontend clone spec and list of uncloneable items, generate a COMPLETE backend specification.

UNCLONEABLE ITEMS:
${JSON.stringify(cloneSpec.uncloneable || [], null, 2)}

INFERRED REPLACEMENTS:
${JSON.stringify(cloneSpec.inferred || [], null, 2)}

FRONTEND PAGES:
${JSON.stringify((cloneSpec.pages || []).map(p => p.name), null, 2)}

Generate a JSON object with:
1. "entities" — array of entity schemas needed (name, fields with types, relationships)
2. "functions" — array of backend functions needed (name, purpose, inputs, outputs)
3. "apis" — array of external API integrations needed (service, purpose, auth_type)
4. "database_schema" — database tables/collections needed
5. "auth_model" — authentication approach (use Base44 built-in auth where possible)

Return ONLY valid JSON. Every uncloneable item MUST have a corresponding inferred solution.`;

    const backendResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: backendPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          entities: { type: 'array', items: { type: 'object' } },
          functions: { type: 'array', items: { type: 'object' } },
          apis: { type: 'array', items: { type: 'object' } },
          database_schema: { type: 'object' },
          auth_model: { type: 'string' },
        },
        required: ['entities', 'functions', 'auth_model'],
      },
    });

    cloneSpec.entities = backendResult.entities || [];
    cloneSpec.functions = backendResult.functions || [];
    cloneSpec.apis = backendResult.apis || [];
    cloneSpec.database_schema = backendResult.database_schema || {};
    cloneSpec.auth_model = backendResult.auth_model || 'Base44 built-in auth';

    log(`Backend spec: ${cloneSpec.entities?.length || 0} entities, ${cloneSpec.functions?.length || 0} functions`);

    // Step 4: Update CloneJob if job_id provided
    if (job_id) {
      try {
        await base44.asServiceRole.entities.CloneJob.update(job_id, {
          status: 'validating',
          clone_progress: 80,
          clone_spec: cloneSpec,
          logs,
        });
      } catch (e) {
        log(`Warning: could not update job: ${e.message}`);
      }
    }

    log('DEEP Clone System complete — spec ready for validation');

    return Response.json({
      status: 'success',
      target_url,
      clone_spec: cloneSpec,
      logs,
      summary: {
        pages: cloneSpec.pages?.length || 0,
        components: cloneSpec.components?.length || 0,
        entities: cloneSpec.entities?.length || 0,
        functions: cloneSpec.functions?.length || 0,
        uncloneable: cloneSpec.uncloneable?.length || 0,
        inferred: cloneSpec.inferred?.length || 0,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}