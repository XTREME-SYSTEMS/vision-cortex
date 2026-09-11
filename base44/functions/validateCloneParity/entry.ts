import { createClientFromRequest } from '../../runtime/index';

// ============================================================================
// validateCloneParity — validates visual + operational + content parity
// ============================================================================
// Compares the original system against the clone spec and returns:
//   - Visual parity score (layout, styles, components)
//   - Operational parity score (functionality, APIs, auth)
//   - Content parity score (text, images, media)
//   - List of gaps with fixes
//   - Test-by-test breakdown
//   - Aggregate score (0-1) — 1.0 = 100% parity
// ============================================================================

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Owner only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { clone_spec, target_url, job_id, attempt = 1 } = body;
    if (!clone_spec) return Response.json({ error: 'clone_spec is required' }, { status: 400 });

    // Run validation tests via LLM
    const validationPrompt = `You are a DEEP parity validator. Compare this clone specification against the original system and score it across multiple dimensions.

ORIGINAL URL: ${target_url || 'unknown'}
ATTEMPT: ${attempt}

CLONE SPEC:
${JSON.stringify(clone_spec).substring(0, 20000)}

Run these validation tests and return scores:

VISUAL TESTS:
1. layout_parity — Does the clone replicate the original layout structure?
2. style_parity — Do colors, fonts, spacing match?
3. component_parity — Are all UI components present?
4. responsive_parity — Is responsive behavior maintained?

OPERATIONAL TESTS:
5. navigation_parity — Are all routes/pages accessible?
6. form_parity — Are all forms and inputs functional?
7. api_parity — Are all API endpoints covered (or inferred)?
8. auth_parity — Is authentication replicated or equivalent?
9. data_parity — Is data flow (CRUD) replicated?

CONTENT TESTS:
10. text_parity — Is all text content present?
11. media_parity — Are all images/media present or equivalent?
12. metadata_parity — Are SEO tags, meta, schema present?

For EACH test, return: { name, passed (boolean), score (0-1), detail }
Also return:
- "gaps" — array of { category, description, severity, fix } for anything that fails
- "visual_parity" — average of visual tests
- "operational_parity" — average of operational tests
- "content_parity" — average of content tests
- "aggregate_score" — weighted: visual 0.3, operational 0.4, content 0.3

Return ONLY valid JSON.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: validationPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          tests: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                passed: { type: 'boolean' },
                score: { type: 'number' },
                detail: { type: 'string' },
              },
            },
          },
          gaps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string' },
                description: { type: 'string' },
                severity: { type: 'string' },
                fix: { type: 'string' },
              },
            },
          },
          visual_parity: { type: 'number' },
          operational_parity: { type: 'number' },
          content_parity: { type: 'number' },
          aggregate_score: { type: 'number' },
        },
        required: ['tests', 'gaps', 'visual_parity', 'operational_parity', 'content_parity', 'aggregate_score'],
      },
    });

    const tests = result.tests || [];
    const gaps = result.gaps || [];
    const testsPassed = tests.filter(t => t.passed).length;
    const isApproved = result.aggregate_score >= 1.0;

    const validationResults = {
      tests,
      gaps,
      tests_passed: testsPassed,
      tests_total: tests.length,
      test_details: tests,
    };

    // Update CloneJob if job_id provided
    if (job_id) {
      try {
        await base44.asServiceRole.entities.CloneJob.update(job_id, {
          parity_score: result.aggregate_score,
          visual_parity: result.visual_parity,
          operational_parity: result.operational_parity,
          content_parity: result.content_parity,
          validation_results: validationResults,
          status: isApproved ? 'passed' : 'failed',
        });
      } catch (e) { /* job update is best-effort */ }
    }

    return Response.json({
      status: isApproved ? 'passed' : 'failed',
      visual_parity: result.visual_parity,
      operational_parity: result.operational_parity,
      content_parity: result.content_parity,
      aggregate_score: result.aggregate_score,
      is_approved: isApproved,
      tests_passed: testsPassed,
      tests_total: tests.length,
      gaps,
      tests,
      attempt,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}