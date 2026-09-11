import { createClientFromRequest } from '../../runtime/index';

// MCP Server CRUD — create, list, update, delete, test connection
// Stores server definitions + tool schemas. The MCP config is generated from these records.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'list';
    const sr = base44.asServiceRole.entities;

    // ── CREATE ──
    if (action === 'create') {
      const { name, description, server_id, transport, endpoint_url, command, args, env_vars, tools, auth_type, auth_token_key, connected_agent_names } = body;
      if (!name || !server_id || !transport) return Response.json({ error: 'name, server_id, transport required' }, { status: 400 });

      // Check for duplicate
      const existing = await sr.McpServer.filter({ server_id }, '-created_date', 5);
      if (existing[0]) return Response.json({ error: 'server_id already exists' }, { status: 409 });

      const record = await sr.McpServer.create({
        name,
        description: description || '',
        server_id,
        transport,
        endpoint_url: endpoint_url || '',
        command: command || '',
        args: args || [],
        env_vars: env_vars || {},
        tools: tools || [],
        auth_type: auth_type || 'none',
        auth_token_key: auth_token_key || '',
        connected_agent_names: connected_agent_names || [],
        status: 'draft',
        tool_count: (tools || []).length
      });

      return Response.json({ ok: true, action: 'create', server: record });
    }

    // ── LIST ──
    if (action === 'list') {
      const servers = await sr.McpServer.list('-created_date', 100);
      return Response.json({ ok: true, servers, count: servers.length });
    }

    // ── UPDATE ──
    if (action === 'update') {
      const { server_id, ...updates } = body;
      if (!server_id) return Response.json({ error: 'server_id required' }, { status: 400 });
      const servers = await sr.McpServer.filter({ server_id }, '-created_date', 5);
      if (!servers[0]) return Response.json({ error: 'Server not found' }, { status: 404 });
      const allowed = ['name', 'description', 'transport', 'endpoint_url', 'command', 'args', 'env_vars', 'tools', 'auth_type', 'auth_token_key', 'connected_agent_names', 'status'];
      const cleanUpdates = {};
      for (const k of allowed) {
        if (updates[k] !== undefined) cleanUpdates[k] = updates[k];
      }
      if (cleanUpdates.tools) cleanUpdates.tool_count = cleanUpdates.tools.length;
      await sr.McpServer.update(servers[0].id, cleanUpdates);
      return Response.json({ ok: true, action: 'update', server_id, updated_fields: Object.keys(cleanUpdates) });
    }

    // ── DELETE ──
    if (action === 'delete') {
      const { server_id } = body;
      if (!server_id) return Response.json({ error: 'server_id required' }, { status: 400 });
      const servers = await sr.McpServer.filter({ server_id }, '-created_date', 5);
      if (!servers[0]) return Response.json({ error: 'Server not found' }, { status: 404 });
      await sr.McpServer.delete(servers[0].id);
      return Response.json({ ok: true, action: 'delete', server_id });
    }

    // ── ADD TOOL ──
    if (action === 'add_tool') {
      const { server_id, tool } = body;
      if (!server_id || !tool || !tool.name) return Response.json({ error: 'server_id and tool.name required' }, { status: 400 });
      const servers = await sr.McpServer.filter({ server_id }, '-created_date', 5);
      if (!servers[0]) return Response.json({ error: 'Server not found' }, { status: 404 });
      const tools = [...(servers[0].tools || []), tool];
      await sr.McpServer.update(servers[0].id, { tools, tool_count: tools.length, status: 'active' });
      return Response.json({ ok: true, action: 'add_tool', server_id, tool_name: tool.name, tool_count: tools.length });
    }

    // ── REMOVE TOOL ──
    if (action === 'remove_tool') {
      const { server_id, tool_name } = body;
      if (!server_id || !tool_name) return Response.json({ error: 'server_id and tool_name required' }, { status: 400 });
      const servers = await sr.McpServer.filter({ server_id }, '-created_date', 5);
      if (!servers[0]) return Response.json({ error: 'Server not found' }, { status: 404 });
      const tools = (servers[0].tools || []).filter(t => t.name !== tool_name);
      await sr.McpServer.update(servers[0].id, { tools, tool_count: tools.length });
      return Response.json({ ok: true, action: 'remove_tool', server_id, tool_name, tool_count: tools.length });
    }

    // ── TEST ──
    if (action === 'test') {
      const { server_id } = body;
      if (!server_id) return Response.json({ error: 'server_id required' }, { status: 400 });
      const servers = await sr.McpServer.filter({ server_id }, '-created_date', 5);
      if (!servers[0]) return Response.json({ error: 'Server not found' }, { status: 404 });
      const server = servers[0];

      let testResult = 'unknown';
      let testOk = false;
      try {
        if (server.transport === 'http' || server.transport === 'sse' || server.transport === 'websocket') {
          if (!server.endpoint_url) { testResult = 'No endpoint URL configured'; }
          else {
            const res = await fetch(server.endpoint_url, { method: 'GET', signal: AbortSignal.timeout(5000) });
            testOk = res.ok;
            testResult = `HTTP ${res.status} ${res.statusText}`;
          }
        } else if (server.transport === 'stdio') {
          testResult = `Command: ${server.command} ${(server.args || []).join(' ')}`;
          testOk = !!server.command;
        }
      } catch (e) {
        testResult = e.message;
      }

      await sr.McpServer.update(server.id, {
        last_tested: new Date().toISOString(),
        last_test_result: testResult,
        status: testOk ? 'active' : 'error'
      });

      return Response.json({ ok: true, action: 'test', server_id, result: testResult, success: testOk });
    }

    // ── EXPORT CONFIG (generate MCP config JSON) ──
    if (action === 'export_config') {
      const servers = await sr.McpServer.filter({ status: 'active' }, '-created_date', 100);
      const config = {
        auth: "oauth",
        tools: {
          functions: []
        }
      };
      for (const server of servers) {
        for (const tool of (server.tools || [])) {
          config.tools.functions.push({
            name: tool.name,
            title: tool.title || tool.name,
            description: tool.description || '',
            input_schema: tool.input_schema || { type: 'object', properties: {} },
            handler: tool.handler || server_id,
            annotations: tool.annotations || { read_only_hint: false, destructive_hint: false, idempotent_hint: false }
          });
        }
      }
      return Response.json({ ok: true, config, tool_count: config.tools.functions.length });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}