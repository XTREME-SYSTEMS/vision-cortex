import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  buildGrowthOSWebsiteConfig,
  buildGrowthOSBlueprint,
} from '../../shared/growthOSTemplate.ts';

/**
 * factoryGrowthOSGenerator
 * Stamps the Growth OS website template for any industry + location.
 * Deterministic shell (the template) + probabilistic core (LLM fills the
 * industry-specific service/problem/property catalogs). Repeatable hundreds
 * of times — the industry changes, the operating system stays the same.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { project_id } = body;
    if (!project_id) return Response.json({ error: 'project_id is required' }, { status: 400 });

    const project = await base44.asServiceRole.entities.FactoryProject.get(project_id);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const { industry, sub_industry, business_name, brand_pack, target_locations, competitor_research } = project;
    if (!brand_pack) return Response.json({ error: 'Brand pack not yet created. Select a logo first.' }, { status: 400 });

    const locations = target_locations?.length ? target_locations : [];

    // ── Probabilistic core: LLM generates the industry-specific catalogs ──
    const catalogPrompt = `You are a market-intelligence expert building a service-business Growth OS.
Industry: ${industry} / ${sub_industry}
Business: ${business_name || '(unnamed)'}
Competitor gaps: ${(competitor_research?.competitors || []).map(c => c.gap).filter(Boolean).join('; ') || 'general market'}

Generate the industry-specific catalogs that drive the Growth OS website. Be concrete and commercial.

1. **services** — 6-12 specific services this business offers. Each: { name, description, target_problem }.
2. **problems** — 6-10 common problems/intent signals customers have (e.g., "Why is my concrete cracking?"). Each: { title, description, related_service }.
3. **property_types** — 5-8 property types served (e.g., warehouse, restaurant, garage). Each: { name, description, relevant_services (array of service names) }.

Return JSON:
{
  "services": [{ "name": "...", "description": "...", "target_problem": "..." }],
  "problems": [{ "title": "...", "description": "...", "related_service": "..." }],
  "property_types": [{ "name": "...", "description": "...", "relevant_services": ["..."] }]
}`;

    const catalogs = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: catalogPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          services: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                target_problem: { type: 'string' },
              },
              required: ['name', 'description'],
            },
          },
          problems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                related_service: { type: 'string' },
              },
              required: ['title', 'description'],
            },
          },
          property_types: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                relevant_services: { type: 'array', items: { type: 'string' } },
              },
              required: ['name', 'description'],
            },
          },
        },
        required: ['services', 'problems', 'property_types'],
      },
    });

    const services = catalogs.services || [];
    const problems = catalogs.problems || [];
    const propertyTypes = catalogs.property_types || [];

    // ── Deterministic shell: stamp the template ──
    const websiteConfig = buildGrowthOSWebsiteConfig({
      industry,
      sub_industry,
      services,
      problems,
      property_types: propertyTypes,
      locations,
      brand_pack,
      business_name,
    });

    const blueprint = buildGrowthOSBlueprint({
      services,
      problems,
      property_types: propertyTypes,
      locations,
    });

    await base44.asServiceRole.entities.FactoryProject.update(project_id, {
      website_config: websiteConfig,
      product_type: 'growth_os',
      stage: 'website_built',
      // Store the full Growth OS blueprint alongside the website config
      // so downstream agents (SEO, lead hunter, visual quote) can read it.
      social_config: {
        ...(project.social_config || {}),
        growth_os_blueprint: blueprint,
      },
    });

    return Response.json({
      project_id,
      product_type: 'growth_os',
      pages_generated: websiteConfig.pages.length,
      services: services.length,
      problems: problems.length,
      property_types: propertyTypes.length,
      locations: locations.length,
      primary_cta: websiteConfig.primary_cta,
      website_config: websiteConfig,
    });
  } catch (error) {
    console.error('factoryGrowthOSGenerator error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}