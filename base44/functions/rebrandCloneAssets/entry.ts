import { createClientFromRequest } from '../../runtime/index';

// ============================================================================
// rebrandCloneAssets — intelligent rebrand system
// ============================================================================
// Actions:
//   "scan" — Scans the cloned system, identifies logos, images, and content
//            that must be changed legally. Creates CloneRebrandAsset records.
//   "regenerate" — Generates 10 different revisions of each asset using LLM.
//   "approve" — Marks a specific revision as approved for a given asset.
// ============================================================================

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Owner only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { action, clone_job_id, template_id, asset_id, revision_index } = body;

    // ----------------------------------------------------------------
    // SCAN — identify all assets that must change legally
    // ----------------------------------------------------------------
    if (action === 'scan') {
      if (!clone_job_id) return Response.json({ error: 'clone_job_id is required for scan' }, { status: 400 });

      const job = await base44.asServiceRole.entities.CloneJob.get(clone_job_id);
      const cloneSpec = job.clone_spec || {};

      const scanPrompt = `You are an IP/legal compliance scanner. Analyze this cloned system specification and identify ALL assets that must be changed for legal compliance — logos, brand names, copyrighted text, trademarked terms, contact info, images that belong to the original brand.

CLONE SPEC:
${JSON.stringify(cloneSpec).substring(0, 20000)}

ORIGINAL URL: ${job.target_url}

Return a JSON array of assets that must change. For each:
- "asset_type": logo | image | text | brand_name | color | font | copyright | trademark | tagline | contact_info
- "original_content": the current content/value
- "original_url": URL if it's an image/logo
- "description": what it is
- "location": where it appears (header, footer, hero, etc.)
- "severity": critical (must change legally) | warning (should change) | info (optional)
- "must_change": true/false
- "legal_reason": why it must change (trademark, copyright, IP, etc.)

Be thorough — check every page, component, and content block. Return ONLY a JSON array.`;

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: scanPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            assets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  asset_type: { type: 'string' },
                  original_content: { type: 'string' },
                  original_url: { type: 'string' },
                  description: { type: 'string' },
                  location: { type: 'string' },
                  severity: { type: 'string' },
                  must_change: { type: 'boolean' },
                  legal_reason: { type: 'string' },
                },
              },
            },
          },
          required: ['assets'],
        },
      });

      const assets = result.assets || [];
      const created = [];

      for (const asset of assets) {
        const record = await base44.asServiceRole.entities.CloneRebrandAsset.create({
          clone_job_id,
          template_id: template_id || job.template_id || '',
          asset_type: asset.asset_type,
          original_url: asset.original_url || '',
          original_content: asset.original_content || '',
          description: asset.description || '',
          location: asset.location || '',
          severity: asset.severity || 'warning',
          must_change: asset.must_change !== false,
          legal_reason: asset.legal_reason || '',
          revisions: [],
          approved_revision_index: -1,
          status: 'scanned',
        });
        created.push(record.id);
      }

      await base44.asServiceRole.entities.CloneJob.update(clone_job_id, {
        rebrand_status: 'scanned',
      });

      return Response.json({
        status: 'success',
        action: 'scan',
        assets_found: assets.length,
        asset_ids: created,
      });
    }

    // ----------------------------------------------------------------
    // REGENERATE — create 10 revisions for each asset (or a specific one)
    // ----------------------------------------------------------------
    if (action === 'regenerate') {
      let assetsToRevise = [];

      if (asset_id) {
        const asset = await base44.asServiceRole.entities.CloneRebrandAsset.get(asset_id);
        assetsToRevise = [asset];
      } else if (clone_job_id) {
        assetsToRevise = await base44.asServiceRole.entities.CloneRebrandAsset.filter({
          clone_job_id,
          status: 'scanned',
        });
      } else {
        return Response.json({ error: 'asset_id or clone_job_id required for regenerate' }, { status: 400 });
      }

      const updatedAssets = [];

      for (const asset of assetsToRevise) {
        const revisionPrompt = `You are a brand rebranding expert. Generate 10 DIFFERENT revision options for this asset that must be rebranded.

ASSET TYPE: ${asset.asset_type}
ORIGINAL CONTENT: ${asset.original_content}
DESCRIPTION: ${asset.description}
LOCATION: ${asset.location}
LEGAL REASON: ${asset.legal_reason}
SEVERITY: ${asset.severity}

Generate 10 distinct revision options. Each should be:
- Legally safe (no trademark/copyright infringement)
- Professional and on-brand for a ${asset.asset_type}
- Distinctly different from each other (different styles, tones, approaches)

For text assets (brand_name, tagline, text, copyright): return the new text content.
For color assets: return hex color values.
For font assets: return font family names (open-source only).

Return a JSON object with "revisions" array, each item: { "index": 0-9, "content": "the new value", "style_notes": "brief description of the approach" }`;

        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: revisionPrompt,
          response_json_schema: {
            type: 'object',
            properties: {
              revisions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    index: { type: 'number' },
                    content: { type: 'string' },
                    style_notes: { type: 'string' },
                  },
                },
              },
            },
            required: ['revisions'],
          },
        });

        const revisions = (result.revisions || []).slice(0, 10).map((r, i) => ({
          ...r,
          index: i,
        }));

        await base44.asServiceRole.entities.CloneRebrandAsset.update(asset.id, {
          revisions,
          status: 'revising',
        });

        updatedAssets.push({ asset_id: asset.id, revisions: revisions.length });
      }

      if (clone_job_id) {
        await base44.asServiceRole.entities.CloneJob.update(clone_job_id, {
          rebrand_status: 'revising',
        });
      }

      return Response.json({
        status: 'success',
        action: 'regenerate',
        assets_updated: updatedAssets.length,
        details: updatedAssets,
      });
    }

    // ----------------------------------------------------------------
    // APPROVE — mark a specific revision as approved
    // ----------------------------------------------------------------
    if (action === 'approve') {
      if (!asset_id) return Response.json({ error: 'asset_id required for approve' }, { status: 400 });

      const asset = await base44.asServiceRole.entities.CloneRebrandAsset.get(asset_id);
      await base44.asServiceRole.entities.CloneRebrandAsset.update(asset_id, {
        approved_revision_index: revision_index,
        status: 'approved',
      });

      // Check if all assets for this job are approved
      if (asset.clone_job_id) {
        const allAssets = await base44.asServiceRole.entities.CloneRebrandAsset.filter({
          clone_job_id: asset.clone_job_id,
        });
        const allApproved = allAssets.every(a => a.status === 'approved' || a.status === 'skipped');
        if (allApproved) {
          await base44.asServiceRole.entities.CloneJob.update(asset.clone_job_id, {
            rebrand_status: 'approved',
          });
        }
      }

      return Response.json({
        status: 'success',
        action: 'approve',
        asset_id,
        approved_revision_index: revision_index,
      });
    }

    return Response.json({ error: 'Unknown action. Use scan, regenerate, or approve.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}