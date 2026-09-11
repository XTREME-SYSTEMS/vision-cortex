import { createClientFromRequest } from '../../runtime/index';

// Vault Security System
// Audit log retrieval, security scan, access verification, threat detection

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'audit_log';
    const sr = base44.asServiceRole.entities;

    // ── AUDIT LOG ──
    if (action === 'audit_log') {
      const { limit = 50, severity, resource_type } = body;
      let logs = await sr.VaultAuditLog.list('-created_date', limit);
      if (severity) logs = logs.filter(l => l.severity === severity);
      if (resource_type) logs = logs.filter(l => l.resource_type === resource_type);
      return Response.json({ ok: true, logs, count: logs.length });
    }

    // ── LOG EVENT ──
    if (action === 'log') {
      const { event_action, resource_type, resource_id, resource_name, details, severity, success } = body;
      if (!event_action || !resource_type) return Response.json({ error: 'event_action and resource_type required' }, { status: 400 });
      const log = await sr.VaultAuditLog.create({
        action: event_action,
        resource_type,
        resource_id: resource_id || '',
        resource_name: resource_name || '',
        details: details || '',
        ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        user_agent: req.headers.get('user-agent') || '',
        severity: severity || 'info',
        success: success !== undefined ? success : true
      });
      return Response.json({ ok: true, log_id: log.id });
    }

    // ── SECURITY SCAN ──
    if (action === 'scan') {
      const findings = [];

      // Check 1: Vault entries without RLS (should all be admin-only)
      const vaultEntries = await sr.VaultEntry.list('-created_date', 100);
      // Check for entries with plaintext passwords that could be exposed
      const withPasswords = vaultEntries.filter(v => v.credentials?.password);
      if (withPasswords.length > 0) {
        findings.push({
          severity: 'warning',
          title: 'Plaintext Passwords in Vault',
          description: `${withPasswords.length} vault entries store passwords in plaintext. Consider encrypting or using OAuth tokens instead.`,
          recommendation: 'Migrate to OAuth connectors or encrypt sensitive credentials'
        });
      }

      // Check 2: API keys — check for old keys never rotated
      const apiKeys = await sr.ApiKey.list('-created_date', 100);
      const activeKeys = apiKeys.filter(k => k.status === 'active');
      const staleKeys = activeKeys.filter(k => {
        if (!k.last_rotated && !k.created_date) return false;
        const age = Date.now() - new Date(k.last_rotated || k.created_date).getTime();
        return age > 90 * 24 * 60 * 60 * 1000; // 90+ days
      });
      if (staleKeys.length > 0) {
        findings.push({
          severity: 'warning',
          title: 'Stale API Keys',
          description: `${staleKeys.length} API keys haven't been rotated in 90+ days.`,
          recommendation: 'Rotate stale keys regularly'
        });
      }

      // Check 3: Revoked keys still in vault entries
      const revokedPreviews = new Set(apiKeys.filter(k => k.status === 'revoked').map(k => k.key_preview));
      const vaultsWithRevoked = vaultEntries.filter(v =>
        (v.assigned_api_keys || []).some(k => revokedPreviews.has(k))
      );
      if (vaultsWithRevoked.length > 0) {
        findings.push({
          severity: 'critical',
          title: 'Revoked Keys Still in Vault',
          description: `${vaultsWithRevoked.length} vault entries still reference revoked API keys.`,
          recommendation: 'Remove revoked key references from vault entries'
        });
      }

      // Check 4: Capabilities requiring approval that are enabled
      const caps = await sr.CapabilityToggle.list('-created_date', 200);
      const riskyEnabled = caps.filter(c => c.enabled && c.requires_approval);
      if (riskyEnabled.length > 0) {
        findings.push({
          severity: 'warning',
          title: 'High-Risk Capabilities Enabled',
          description: `${riskyEnabled.length} capabilities that require approval are currently enabled: ${riskyEnabled.map(c => c.name).join(', ')}.`,
          recommendation: 'Review whether these capabilities should remain enabled'
        });
      }

      // Check 5: Email accounts with errors
      const emailAccounts = await sr.EmailAccount.list('-created_date', 50);
      const erroredEmails = emailAccounts.filter(e => e.status === 'error');
      if (erroredEmails.length > 0) {
        findings.push({
          severity: 'warning',
          title: 'Email Account Errors',
          description: `${erroredEmails.length} email accounts have errors: ${erroredEmails.map(e => e.label).join(', ')}.`,
          recommendation: 'Reconnect or fix errored email accounts'
        });
      }

      // Compute security score
      const criticalCount = findings.filter(f => f.severity === 'critical').length;
      const warningCount = findings.filter(f => f.severity === 'warning').length;
      const score = Math.max(0, 100 - (criticalCount * 25) - (warningCount * 10));

      return Response.json({
        ok: true,
        action: 'scan',
        findings,
        security_score: score,
        summary: {
          vault_entries: vaultEntries.length,
          active_api_keys: activeKeys.length,
          revoked_api_keys: apiKeys.filter(k => k.status === 'revoked').length,
          capabilities_total: caps.length,
          capabilities_enabled: caps.filter(c => c.enabled).length,
          email_accounts: emailAccounts.length,
          email_accounts_connected: emailAccounts.filter(e => e.status === 'connected').length,
          critical_findings: criticalCount,
          warnings: warningCount
        }
      });
    }

    // ── DASHBOARD (combined stats) ──
    if (action === 'dashboard') {
      const [vaultEntries, apiKeys, caps, emails, logs] = await Promise.all([
        sr.VaultEntry.list('-created_date', 100),
        sr.ApiKey.list('-created_date', 100),
        sr.CapabilityToggle.list('-created_date', 200),
        sr.EmailAccount.list('-created_date', 50),
        sr.VaultAuditLog.list('-created_date', 10)
      ]);

      return Response.json({
        ok: true,
        stats: {
          vault_entries: vaultEntries.length,
          api_keys_active: apiKeys.filter(k => k.status === 'active').length,
          api_keys_revoked: apiKeys.filter(k => k.status === 'revoked').length,
          capabilities_enabled: caps.filter(c => c.enabled).length,
          capabilities_total: caps.length,
          emails_connected: emails.filter(e => e.status === 'connected').length,
          emails_total: emails.length,
          recent_events: logs
        }
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}