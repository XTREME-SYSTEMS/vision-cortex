import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

// Full API Key lifecycle management:
// generate, list, revoke, rotate, update, delete, log_usage
// Keys are hashed (SHA-256) — plaintext shown ONLY once at generation.

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function makePreview(key) {
  if (key.length <= 16) return key;
  return key.slice(0, 8) + '...' + key.slice(-4);
}

function getClientIp(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') || 'unknown';
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'list';
    const sr = base44.asServiceRole.entities;
    const audit = sr.VaultAuditLog;
    const ip = getClientIp(req);

    // ── GENERATE ──
    if (action === 'generate') {
      const { name, prefix = 'vc', length = 48, category = '', vault_entry_id, permissions = ['read', 'write'], scopes = [], notes = '' } = body;
      if (!name) return Response.json({ error: 'Key name required' }, { status: 400 });

      // Generate cryptographically random hex
      const bytes = new Uint8Array(Math.floor(length / 2));
      crypto.getRandomValues(bytes);
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const key = `${prefix}_${hex}`;
      const keyHash = await sha256(key);
      const keyPreview = makePreview(key);

      // Optionally link to vault entry
      let assignedTo = '';
      if (vault_entry_id) {
        try {
          const entry = await sr.VaultEntry.get(vault_entry_id);
          const existing = entry.assigned_api_keys || [];
          existing.push(keyPreview);
          await sr.VaultEntry.update(vault_entry_id, {
            assigned_api_keys: existing,
            last_synced: new Date().toISOString(),
            ...(category ? { category } : {})
          });
          assignedTo = entry.name;
        } catch (e) { /* vault link optional */ }
      }

      // Create the ApiKey record
      const record = await sr.ApiKey.create({
        name,
        key_hash: keyHash,
        key_preview: keyPreview,
        prefix,
        category,
        vault_entry_id: vault_entry_id || '',
        assigned_to: assignedTo,
        status: 'active',
        permissions,
        scopes,
        usage_count: 0,
        rotation_count: 0,
        created_by: user.email || user.id,
        notes
      });

      // Audit log
      await audit.create({
        action: 'key_generate',
        resource_type: 'api_key',
        resource_id: record.id,
        resource_name: name,
        details: `Generated key "${name}" (${keyPreview}) with permissions: ${permissions.join(', ')}`,
        ip_address: ip,
        user_agent: req.headers.get('user-agent') || '',
        severity: 'info',
        success: true
      });

      // Return the FULL key — only time it will ever be shown
      return Response.json({
        ok: true,
        action: 'generate',
        key, // ← plaintext, shown once
        key_preview: keyPreview,
        key_id: record.id,
        name,
        category,
        assigned_to: assignedTo,
        permissions,
        message: 'Save this key now — it will not be shown again.'
      });
    }

    // ── LIST ──
    if (action === 'list') {
      const keys = await sr.ApiKey.list('-created_date', 200);
      // Never return key_hash, only preview
      const safe = keys.map(k => ({
        id: k.id,
        name: k.name,
        key_preview: k.key_preview,
        prefix: k.prefix,
        category: k.category,
        assigned_to: k.assigned_to,
        status: k.status,
        permissions: k.permissions || [],
        scopes: k.scopes || [],
        usage_count: k.usage_count || 0,
        rotation_count: k.rotation_count || 0,
        last_used: k.last_used,
        last_rotated: k.last_rotated,
        created_date: k.created_date,
        created_by: k.created_by,
        notes: k.notes
      }));
      return Response.json({ ok: true, keys: safe, count: safe.length });
    }

    // ── REVOKE ──
    if (action === 'revoke') {
      const { key_id } = body;
      if (!key_id) return Response.json({ error: 'key_id required' }, { status: 400 });
      const key = await sr.ApiKey.get(key_id);
      await sr.ApiKey.update(key_id, { status: 'revoked' });
      await audit.create({
        action: 'key_revoke',
        resource_type: 'api_key',
        resource_id: key_id,
        resource_name: key.name,
        details: `Revoked key "${key.name}" (${key.key_preview})`,
        ip_address: ip,
        severity: 'warning',
        success: true
      });
      return Response.json({ ok: true, action: 'revoke', key_id, status: 'revoked' });
    }

    // ── ROTATE ──
    if (action === 'rotate') {
      const { key_id, prefix: newPrefix } = body;
      if (!key_id) return Response.json({ error: 'key_id required' }, { status: 400 });
      const oldKey = await sr.ApiKey.get(key_id);

      // Generate new key
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const newKeyStr = `${newPrefix || oldKey.prefix || 'vc'}_${hex}`;
      const newHash = await sha256(newKeyStr);
      const newPreview = makePreview(newKeyStr);

      await sr.ApiKey.update(key_id, {
        key_hash: newHash,
        key_preview: newPreview,
        status: 'active',
        last_rotated: new Date().toISOString(),
        rotation_count: (oldKey.rotation_count || 0) + 1
      });

      await audit.create({
        action: 'key_rotate',
        resource_type: 'api_key',
        resource_id: key_id,
        resource_name: oldKey.name,
        details: `Rotated key "${oldKey.name}" — old: ${oldKey.key_preview}, new: ${newPreview}`,
        ip_address: ip,
        severity: 'warning',
        success: true
      });

      return Response.json({
        ok: true,
        action: 'rotate',
        key: newKeyStr, // ← new plaintext, shown once
        key_preview: newPreview,
        key_id,
        rotation_count: (oldKey.rotation_count || 0) + 1,
        message: 'New key generated. Old key is now invalid. Save this new key now.'
      });
    }

    // ── UPDATE ──
    if (action === 'update') {
      const { key_id, name, permissions, scopes, notes, rate_limit, expires_at } = body;
      if (!key_id) return Response.json({ error: 'key_id required' }, { status: 400 });
      const key = await sr.ApiKey.get(key_id);
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (permissions !== undefined) updates.permissions = permissions;
      if (scopes !== undefined) updates.scopes = scopes;
      if (notes !== undefined) updates.notes = notes;
      if (rate_limit !== undefined) updates.rate_limit = rate_limit;
      if (expires_at !== undefined) updates.expires_at = expires_at;

      await sr.ApiKey.update(key_id, updates);
      await audit.create({
        action: 'update',
        resource_type: 'api_key',
        resource_id: key_id,
        resource_name: name || key.name,
        details: `Updated key "${name || key.name}" — fields: ${Object.keys(updates).join(', ')}`,
        ip_address: ip,
        severity: 'info',
        success: true
      });
      return Response.json({ ok: true, action: 'update', key_id, updated_fields: Object.keys(updates) });
    }

    // ── DELETE ──
    if (action === 'delete') {
      const { key_id } = body;
      if (!key_id) return Response.json({ error: 'key_id required' }, { status: 400 });
      const key = await sr.ApiKey.get(key_id);
      await sr.ApiKey.delete(key_id);
      await audit.create({
        action: 'delete',
        resource_type: 'api_key',
        resource_id: key_id,
        resource_name: key.name,
        details: `Deleted key "${key.name}" (${key.key_preview})`,
        ip_address: ip,
        severity: 'critical',
        success: true
      });
      return Response.json({ ok: true, action: 'delete', key_id });
    }

    // ── LOG USAGE (called by other functions when a key is used) ──
    if (action === 'log_usage') {
      const { key_id, ip_address } = body;
      if (!key_id) return Response.json({ ok: true });
      try {
        const key = await sr.ApiKey.get(key_id);
        await sr.ApiKey.update(key_id, {
          usage_count: (key.usage_count || 0) + 1,
          last_used: new Date().toISOString(),
          last_used_ip: ip_address || ip
        });
      } catch {}
      return Response.json({ ok: true });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}