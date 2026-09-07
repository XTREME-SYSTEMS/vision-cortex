import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// ============================================================================
// DRIVE ORGANIZER — Automatically organizes scraped intelligence files and
// strategy documents into specific Google Drive project folders per agent.
// ============================================================================

const ROOT_FOLDER_NAME = 'Vision Cortex';
const AGENT_FOLDER_PREFIX = 'Agent - ';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Auth: admin user OR workflow context
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    if (user && user.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'organize_all';
    const sr = base44.asServiceRole;

    // Get Google Drive connection
    let driveConn;
    try {
      driveConn = await sr.connectors.getConnection('googledrive');
    } catch {
      return Response.json({ error: 'Google Drive not connected. Authorize the googledrive connector first.' }, { status: 400 });
    }
    const accessToken = driveConn.accessToken;
    const authHeader = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // ─── ENSURE FOLDER STRUCTURE ──────────────────────────────────────
    if (action === 'ensure_folders') {
      const agents = await sr.entities.AgentProfile.list('-order', 100).catch(() => []);
      const result = await ensureAgentFolders(accessToken, authHeader, agents, sr);
      return Response.json({ ok: true, action: 'ensure_folders', ...result });
    }

    // ─── ORGANIZE INTELLIGENCE FILES ───────────────────────────────────
    if (action === 'organize_intel') {
      const intel = await sr.entities.IntelFeed.filter({ drive_organized: false }, '-created_date', 50).catch(() => []);
      if (intel.length === 0) {
        return Response.json({ ok: true, action: 'organize_intel', organized: 0, message: 'No unorganized intelligence files.' });
      }

      const agents = await sr.entities.AgentProfile.list('-order', 100).catch(() => []);
      const folderMap = await getOrCreateAgentFolders(accessToken, authHeader, agents, sr);

      let organized = 0;
      let failed = 0;
      for (const item of intel) {
        const targetAgent = item.assigned_agent || item.source_agent || 'Unassigned';
        const folderId = folderMap[targetAgent] || folderMap['_Unassigned'];
        if (!folderId) { failed++; continue; }

        // If the intel item has a file_url, move/copy it to the agent folder
        const fileUrl = item.file_url || item.document_url || item.url;
        if (fileUrl && fileUrl.includes('drive.google.com')) {
          const fileId = extractFileId(fileUrl);
          if (fileId) {
            try {
              await moveFileToFolder(accessToken, authHeader, fileId, folderId);
              await sr.entities.IntelFeed.update(item.id, { drive_organized: true, drive_folder_id: folderId });
              organized++;
            } catch { failed++; }
          }
        } else {
          // Create a text document with the intel content in the agent folder
          try {
            await createDocInFolder(accessToken, authHeader, folderId, item.title || 'Intel Item', item);
            await sr.entities.IntelFeed.update(item.id, { drive_organized: true, drive_folder_id: folderId });
            organized++;
          } catch { failed++; }
        }
      }

      return Response.json({ ok: true, action: 'organize_intel', organized, failed, total: intel.length });
    }

    // ─── ORGANIZE STRATEGY DOCUMENTS ────────────────────────────────────
    if (action === 'organize_strategies') {
      const docs = await sr.entities.ArchitecturalDocument.filter({ status: 'architected' }, '-created_date', 50).catch(() => []);
      const coreDocs = await sr.entities.CoreDocument.filter({ status: 'active' }, '-created_date', 50).catch(() => []);
      const allDocs = [...docs, ...coreDocs];

      const agents = await sr.entities.AgentProfile.list('-order', 100).catch(() => []);
      const folderMap = await getOrCreateAgentFolders(accessToken, authHeader, agents, sr);

      let organized = 0;
      for (const doc of allDocs) {
        const targetAgent = doc.assigned_agent || doc.last_evolved_by || 'Omni-Architect';
        const folderId = folderMap[targetAgent] || folderMap['_Unassigned'];
        if (!folderId) continue;

        try {
          await createDocInFolder(accessToken, authHeader, folderId, doc.title || 'Strategy Doc', doc);
          organized++;
        } catch {}
      }

      return Response.json({ ok: true, action: 'organize_strategies', organized, total: allDocs.length });
    }

    // ─── ORGANIZE EVERYTHING ───────────────────────────────────────────
    if (action === 'organize_all') {
      const agents = await sr.entities.AgentProfile.list('-order', 100).catch(() => []);
      const folders = await ensureAgentFolders(accessToken, authHeader, agents, sr);

      // Organize intel
      const intelRes = await sr.entities.IntelFeed.list('-created_date', 50).catch(() => []);
      let intelOrganized = 0;
      const folderMap = folders.folder_map;
      for (const item of intelRes) {
        const targetAgent = item.assigned_agent || item.source_agent || '_Unassigned';
        const folderId = folderMap[targetAgent];
        if (!folderId) continue;
        try {
          await createDocInFolder(accessToken, authHeader, folderId, item.title || 'Intel', item);
          intelOrganized++;
        } catch {}
      }

      // Organize strategy docs
      const stratRes = await sr.entities.ArchitecturalDocument.list('-created_date', 50).catch(() => []);
      let stratOrganized = 0;
      for (const doc of stratRes) {
        const targetAgent = doc.assigned_agent || 'Omni-Architect';
        const folderId = folderMap[targetAgent] || folderMap['_Unassigned'];
        if (!folderId) continue;
        try {
          await createDocInFolder(accessToken, authHeader, folderId, doc.title || 'Strategy', doc);
          stratOrganized++;
        } catch {}
      }

      return Response.json({
        ok: true,
        action: 'organize_all',
        folders_created: folders.created,
        folders_reused: folders.reused,
        intel_organized: intelOrganized,
        strategies_organized: stratOrganized
      });
    }

    // ─── SAVE REPORT: Save a single finalized strategy report to Drive ───
    if (action === 'save_report') {
      const { document_id } = body;
      if (!document_id) return Response.json({ error: 'document_id required' }, { status: 400 });

      const doc = await sr.entities.ArchitecturalDocument.get(document_id).catch(() => null);
      if (!doc) return Response.json({ error: 'Document not found' }, { status: 404 });

      const agents = await sr.entities.AgentProfile.list('-order', 100).catch(() => []);
      const folderMap = await getOrCreateAgentFolders(accessToken, authHeader, agents, sr);

      const targetAgent = doc.assigned_agent || doc.last_evolved_by || 'Omni-Architect';
      const folderId = folderMap[targetAgent] || folderMap['_Unassigned'];
      if (!folderId) return Response.json({ error: 'Could not find or create target folder' }, { status: 500 });

      const fileName = `${(doc.title || 'Strategy Report').slice(0, 80)}.json`;
      const content = JSON.stringify({
        title: doc.title,
        doc_type: doc.doc_type,
        target_system: doc.target_system,
        status: doc.status,
        content: doc.content,
        implementation_code: doc.implementation_code,
        validation_score: doc.validation_score,
        created_date: doc.created_date,
        updated_date: doc.updated_date
      }, null, 2);

      // Create file in the agent's folder
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ name: fileName, parents: [folderId], mimeType: 'application/json' })
      });
      if (!createRes.ok) return Response.json({ error: 'Failed to create file in Drive' }, { status: 500 });
      const file = await createRes.json();

      // Upload content
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: content
      });

      return Response.json({
        ok: true,
        action: 'save_report',
        document_id,
        title: doc.title,
        file_id: file.id,
        folder_id: folderId,
        agent: targetAgent,
        message: `Report "${doc.title}" saved to ${targetAgent}'s Drive folder`
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ─── HELPERS ────────────────────────────────────────────────────────────

async function ensureAgentFolders(accessToken, authHeader, agents, sr) {
  // Find or create root folder
  const rootId = await findOrCreateFolder(accessToken, authHeader, ROOT_FOLDER_NAME, null);
  const folderMap = {};
  let created = 0;
  let reused = 0;

  // _Unassigned catch-all
  const unassignedId = await findOrCreateFolder(accessToken, authHeader, '_Unassigned', rootId);
  folderMap['_Unassigned'] = unassignedId;

  for (const agent of agents) {
    const name = `${AGENT_FOLDER_PREFIX}${agent.name}`;
    const folderId = await findOrCreateFolder(accessToken, authHeader, name, rootId);
    folderMap[agent.name] = folderId;
    if (folderId) reused++;
  }

  // Persist folder IDs on agent profiles for reuse
  for (const agent of agents) {
    if (folderMap[agent.name]) {
      try {
        await sr.entities.AgentProfile.update(agent.id, { drive_folder_id: folderMap[agent.name] });
      } catch {}
    }
  }

  return { created, reused, folder_map: folderMap, root_folder_id: rootId };
}

async function getOrCreateAgentFolders(accessToken, authHeader, agents, sr) {
  // Check if agents already have drive_folder_id
  const folderMap = {};
  let needsEnsure = false;
  for (const agent of agents) {
    if (agent.drive_folder_id) {
      folderMap[agent.name] = agent.drive_folder_id;
    } else {
      needsEnsure = true;
    }
  }
  if (needsEnsure) {
    const result = await ensureAgentFolders(accessToken, authHeader, agents, sr);
    Object.assign(folderMap, result.folder_map);
  }
  return folderMap;
}

async function findOrCreateFolder(accessToken, authHeader, name, parentId) {
  // Search for existing folder
  const query = parentId
    ? `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    : `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files?.length > 0) return searchData.files[0].id;
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {})
    })
  });
  if (createRes.ok) {
    const created = await createRes.json();
    return created.id;
  }
  return null;
}

async function moveFileToFolder(accessToken, authHeader, fileId, folderId) {
  // Get current parents
  const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const oldParents = metaRes.ok ? (await metaRes.json()).parents || [] : [];
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}&removeParents=${oldParents.join(',')}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
}

async function createDocInFolder(accessToken, authHeader, folderId, title, data) {
  // Create a Google Doc with the content
  const content = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      name: `${title.slice(0, 80)}.json`,
      parents: [folderId],
      mimeType: 'application/json'
    })
  });
  if (!res.ok) return null;
  const file = await res.json();
  // Upload content
  await fetch(`https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=media`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: content
  });
  return file.id;
}

function extractFileId(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/) || url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}