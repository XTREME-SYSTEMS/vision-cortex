import { createClientFromRequest } from '../../runtime/index';

// Generates a secure random API key or token.
// Supports: api_key (sk-xxx), token (tok_xxx), secret (sec_xxx), custom prefix.
// Accepts a `category` to route the key into an ecosystem layer for bi-directional sync.
export default async function(req: any) {
  const base44 = createClientFromRequest(req);
  try {
    const u = await base44.auth.me();
    if (!u || u.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 401 });
  } catch {}

  const { prefix = 'sk', length = 48, assign_to, vault_entry_id, category = '' } = await req.json().catch(() => ({}));

  // Generate cryptographically random hex
  const bytes = new Uint8Array(Math.floor(length / 2));
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const key = `${prefix}_${hex}`;

  const result = { key, prefix, category, generated_at: new Date().toISOString() };

  // If assigned to a vault entry, store the reference + category
  if (vault_entry_id) {
    try {
      const entry = await base44.asServiceRole.entities.VaultEntry.get(vault_entry_id);
      const existing = entry.assigned_api_keys || [];
      existing.push(key);
      const updateData: any = { assigned_api_keys: existing, last_synced: new Date().toISOString() };
      if (category) updateData.category = category;
      await base44.asServiceRole.entities.VaultEntry.update(vault_entry_id, updateData);
      result.assigned_to = entry.name;
    } catch (e: any) {
      result.assignment_error = e.message;
    }
  }

  return Response.json(result);
}