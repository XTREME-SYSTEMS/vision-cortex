import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

// Capability Toggle Management
// toggle, list, configure, seed defaults

const DEFAULT_CAPABILITIES = [
  // Browser & Scraping
  { capability_id: 'headless_browser', name: 'Headless Form-Fill Browser', category: 'browser', icon: 'Globe', description: 'Full headless browser with form filling, navigation, screenshots, and page interaction' },
  { capability_id: 'asyncio_parallel', name: 'Asyncio Parallel Execution', category: 'execution', icon: 'Zap', description: 'Parallel async task execution — multiple agents/processes running concurrently' },
  { capability_id: 'browser_scraping', name: 'Browser Scraping', category: 'scraping', icon: 'Search', description: 'Scrape any URL via cloud browser — extract text, HTML, structured data' },
  { capability_id: 'stealth_browse', name: 'Stealth / Covert Browse', category: 'scraping', icon: 'Eye', description: 'Traceless browsing — nothing persisted, anti-detection headers' },

  // Data Access
  { capability_id: 'full_read', name: 'Full Read Access', category: 'data_access', icon: 'Database', description: 'Read all entities, vault entries, intel, and system data' },
  { capability_id: 'full_write', name: 'Full Write Access', category: 'data_access', icon: 'Database', description: 'Create and update all entities, vault entries, and system data' },
  { capability_id: 'full_execute', name: 'Full Execute Access', category: 'execution', icon: 'Cpu', description: 'Execute all backend functions, workflows, and external commands' },
  { capability_id: 'account_access', name: 'Account Access', category: 'accounts', icon: 'Key', description: 'Access all connected accounts (Vercel, Supabase, Railway, Groq, Google, GitHub, Stripe)' },

  // Editing
  { capability_id: 'frontend_editing', name: 'Frontend Editing', category: 'frontend_editing', icon: 'Code', description: 'Edit React pages, components, styles, and layout in real-time' },
  { capability_id: 'backend_editing', name: 'Backend Editing', category: 'backend_editing', icon: 'Server', description: 'Edit backend functions, entities, workflows, and agents' },
  { capability_id: 'entity_editing', name: 'Entity Schema Editing', category: 'backend_editing', icon: 'Database', description: 'Create and modify entity schemas' },
  { capability_id: 'workflow_editing', name: 'Workflow Editing', category: 'backend_editing', icon: 'GitBranch', description: 'Create and modify automated workflows' },

  // Communications
  { capability_id: 'xtreme_comms', name: 'Xtreme Communications', category: 'communications', icon: 'MessageSquare', description: 'Full access to Xtreme Comms — SMS, voice, social posting, outreach campaigns' },
  { capability_id: 'email_send', name: 'Email — Send', category: 'email', icon: 'Mail', description: 'Send emails via connected email accounts' },
  { capability_id: 'email_read', name: 'Email — Read', category: 'email', icon: 'Mail', description: 'Read and search emails from connected accounts' },
  { capability_id: 'email_reply', name: 'Email — Reply', category: 'email', icon: 'Reply', description: 'Reply to and forward emails' },
  { capability_id: 'email_draft', name: 'Email — Draft', category: 'email', icon: 'FileText', description: 'Create and manage email drafts' },

  // Build & Deploy
  { capability_id: 'build_apps', name: 'Build Apps', category: 'build', icon: 'Hammer', description: 'Trigger app builds via Xtreme Builder pipeline' },
  { capability_id: 'deploy_apps', name: 'Deploy Apps', category: 'deploy', icon: 'Rocket', description: 'Deploy apps to Vercel, Railway, and other hosting providers' },
  { capability_id: 'domain_management', name: 'Domain Management', category: 'deploy', icon: 'Globe', description: 'Register, configure, and manage domains' },

  // AI
  { capability_id: 'llm_inference', name: 'LLM Inference', category: 'ai_inference', icon: 'Brain', description: 'Run LLM calls via Groq, Vercel Gateway, or Base44 Core' },
  { capability_id: 'multi_agent_debate', name: 'Multi-Agent Debate', category: 'ai_inference', icon: 'Users', description: 'Council sessions and multi-agent deliberation' },

  // MCP
  { capability_id: 'mcp_server_access', name: 'MCP Server Access', category: 'mcp', icon: 'Network', description: 'Connect to and use MCP servers' },
  { capability_id: 'mcp_server_create', name: 'MCP Server Creation', category: 'mcp', icon: 'Plus', description: 'Create and manage MCP servers' },

  // Security
  { capability_id: 'vault_access', name: 'Vault Access', category: 'security', icon: 'Lock', description: 'Access encrypted vault entries and credentials' },
  { capability_id: 'key_management', name: 'Key Management', category: 'security', icon: 'Key', description: 'Generate, rotate, and revoke API keys' },
  { capability_id: 'security_audit', name: 'Security Audit', category: 'security', icon: 'Shield', description: 'Run security scans and access audit logs' },
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'list';
    const sr = base44.asServiceRole.entities;

    // ── SEED DEFAULTS ──
    if (action === 'seed') {
      const existing = await sr.CapabilityToggle.list('-created_date', 200);
      const existingIds = new Set(existing.map(c => c.capability_id));
      const toCreate = DEFAULT_CAPABILITIES
        .filter(c => !existingIds.has(c.capability_id))
        .map(c => ({
          ...c,
          enabled: c.capability_id === 'llm_inference' || c.capability_id === 'full_read', // safe defaults
          config: {},
          requires_approval: ['full_execute', 'account_access', 'deploy_apps', 'key_management'].includes(c.capability_id),
          last_toggled_by: 'system',
          last_toggled_at: new Date().toISOString()
        }));
      if (toCreate.length > 0) {
        await sr.CapabilityToggle.bulkCreate(toCreate);
      }
      return Response.json({ ok: true, action: 'seed', created: toCreate.length, total: existing.length + toCreate.length });
    }

    // ── LIST ──
    if (action === 'list') {
      const caps = await sr.CapabilityToggle.list('-created_date', 200);
      return Response.json({ ok: true, capabilities: caps, count: caps.length });
    }

    // ── TOGGLE ──
    if (action === 'toggle') {
      const { capability_id, enabled } = body;
      if (!capability_id) return Response.json({ error: 'capability_id required' }, { status: 400 });
      const caps = await sr.CapabilityToggle.filter({ capability_id }, '-created_date', 5);
      if (!caps[0]) return Response.json({ error: 'Capability not found' }, { status: 404 });
      await sr.CapabilityToggle.update(caps[0].id, {
        enabled: enabled !== undefined ? enabled : !caps[0].enabled,
        last_toggled_by: user.email || user.id,
        last_toggled_at: new Date().toISOString()
      });
      return Response.json({ ok: true, action: 'toggle', capability_id, enabled: enabled !== undefined ? enabled : !caps[0].enabled });
    }

    // ── CONFIGURE ──
    if (action === 'configure') {
      const { capability_id, config, requires_approval, agent_names } = body;
      if (!capability_id) return Response.json({ error: 'capability_id required' }, { status: 400 });
      const caps = await sr.CapabilityToggle.filter({ capability_id }, '-created_date', 5);
      if (!caps[0]) return Response.json({ error: 'Capability not found' }, { status: 404 });
      const updates = {};
      if (config !== undefined) updates.config = config;
      if (requires_approval !== undefined) updates.requires_approval = requires_approval;
      if (agent_names !== undefined) updates.agent_names = agent_names;
      await sr.CapabilityToggle.update(caps[0].id, updates);
      return Response.json({ ok: true, action: 'configure', capability_id, updated_fields: Object.keys(updates) });
    }

    // ── CHECK (used by other functions to verify a capability is enabled) ──
    if (action === 'check') {
      const { capability_id, agent_name } = body;
      if (!capability_id) return Response.json({ error: 'capability_id required' }, { status: 400 });
      const caps = await sr.CapabilityToggle.filter({ capability_id }, '-created_date', 5);
      if (!caps[0]) return Response.json({ enabled: false, exists: false });
      const enabled = caps[0].enabled && (
        !caps[0].agent_names?.length ||
        !agent_name ||
        caps[0].agent_names.includes(agent_name)
      );
      return Response.json({ enabled, exists: true, requires_approval: caps[0].requires_approval, config: caps[0].config });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}