import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Network, Plus, Loader2, Trash2, Pencil, Play, Download,
  Server, Globe, Terminal, X, Check, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TRANSPORTS = [
  { id: 'http', label: 'HTTP', icon: Globe },
  { id: 'sse', label: 'SSE (Server-Sent Events)', icon: Globe },
  { id: 'websocket', label: 'WebSocket', icon: Network },
  { id: 'stdio', label: 'Stdio (Local Process)', icon: Terminal },
];

const AUTH_TYPES = [
  { id: 'none', label: 'None' },
  { id: 'bearer', label: 'Bearer Token' },
  { id: 'api_key', label: 'API Key' },
  { id: 'oauth', label: 'OAuth' },
];

export default function McpManager() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  // Create form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [serverId, setServerId] = useState('');
  const [transport, setTransport] = useState('http');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [authType, setAuthType] = useState('none');
  const [authTokenKey, setAuthTokenKey] = useState('');
  const [toolName, setToolName] = useState('');
  const [toolDesc, setToolDesc] = useState('');
  const [toolHandler, setToolHandler] = useState('');
  const [tools, setTools] = useState([]);

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('manageMcpServers', { action: 'list' });
      setServers(res.servers || []);
    } catch (e) {
      console.error('Failed to load MCP servers:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setName(''); setDescription(''); setServerId(''); setTransport('http');
    setEndpointUrl(''); setCommand(''); setArgs(''); setAuthType('none');
    setAuthTokenKey(''); setToolName(''); setToolDesc(''); setToolHandler('');
    setTools([]);
  };

  const addTool = () => {
    if (!toolName.trim()) return;
    setTools([...tools, {
      name: toolName.trim(),
      title: toolName.trim(),
      description: toolDesc.trim(),
      handler: toolHandler.trim() || serverId,
      input_schema: { type: 'object', properties: {} },
      annotations: { read_only_hint: false, destructive_hint: false, idempotent_hint: false }
    }]);
    setToolName(''); setToolDesc(''); setToolHandler('');
  };

  const removeTool = (tName) => {
    setTools(tools.filter(t => t.name !== tName));
  };

  const create = async () => {
    if (!name.trim() || !serverId.trim()) { alert('Name and Server ID required'); return; }
    setActionLoading({ ...actionLoading, create: true });
    try {
      const argsArr = args.split('\n').map(a => a.trim()).filter(Boolean);
      await base44.functions.invoke('manageMcpServers', {
        action: 'create',
        name: name.trim(),
        description: description.trim(),
        server_id: serverId.trim(),
        transport,
        endpoint_url: endpointUrl.trim(),
        command: command.trim(),
        args: argsArr,
        auth_type: authType,
        auth_token_key: authTokenKey.trim(),
        tools
      });
      resetForm();
      setShowCreate(false);
      load();
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setActionLoading({ ...actionLoading, create: false }); }
  };

  const testServer = async (serverId) => {
    setActionLoading({ ...actionLoading, [`test_${serverId}`]: true });
    try {
      const res = await base44.functions.invoke('manageMcpServers', { action: 'test', server_id: serverId });
      alert(res.success ? `✓ Connection successful: ${res.result}` : `✗ Failed: ${res.result}`);
      load();
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setActionLoading({ ...actionLoading, [`test_${serverId}`]: false }); }
  };

  const deleteServer = async (serverId, name) => {
    if (!confirm(`Delete MCP server "${name}"?`)) return;
    setActionLoading({ ...actionLoading, [`del_${serverId}`]: true });
    try {
      await base44.functions.invoke('manageMcpServers', { action: 'delete', server_id: serverId });
      load();
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setActionLoading({ ...actionLoading, [`del_${serverId}`]: false }); }
  };

  const exportConfig = async () => {
    try {
      const res = await base44.functions.invoke('manageMcpServers', { action: 'export_config' });
      const blob = new Blob([JSON.stringify(res.config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'mcp-config.json'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('Failed: ' + e.message); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold">MCP Servers</h3>
          <p className="text-[11px] text-muted-foreground">{servers.length} servers · {servers.reduce((s, sv) => s + (sv.tool_count || 0), 0)} tools</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportConfig} className="h-8 text-xs">
            <Download className="w-3 h-3 mr-1" /> Export Config
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setShowCreate(!showCreate); }}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Server
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Create MCP Server</h4>
            <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-[11px]">Server Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Tool Server" className="h-9" />
            </div>
            <div>
              <Label className="text-[11px]">Server ID (slug) *</Label>
              <Input value={serverId} onChange={e => setServerId(e.target.value)} placeholder="e.g. my_tool_server" className="h-9" />
            </div>
            <div className="col-span-2">
              <Label className="text-[11px]">Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this server do?" className="h-9" />
            </div>
            <div className="col-span-2">
              <Label className="text-[11px]">Transport Type</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {TRANSPORTS.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTransport(t.id)}
                      className={cn(
                        'flex items-center gap-1.5 text-[10px] px-2 py-1.5 rounded-md border transition-colors',
                        transport === t.id ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-500' : 'border-border/40 text-muted-foreground'
                      )}
                    >
                      <Icon className="w-3 h-3" /> {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {(transport === 'http' || transport === 'sse' || transport === 'websocket') && (
              <div className="col-span-2">
                <Label className="text-[11px]">Endpoint URL</Label>
                <Input value={endpointUrl} onChange={e => setEndpointUrl(e.target.value)} placeholder="https://my-server.com/mcp" className="h-9" />
              </div>
            )}
            {transport === 'stdio' && (
              <>
                <div className="col-span-2">
                  <Label className="text-[11px]">Command</Label>
                  <Input value={command} onChange={e => setCommand(e.target.value)} placeholder="e.g. npx, python, node" className="h-9" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[11px]">Arguments (one per line)</Label>
                  <textarea value={args} onChange={e => setArgs(e.target.value)} placeholder="-y&#10;@modelcontextprotocol/server-sqlite" className="w-full h-20 rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono" />
                </div>
              </>
            )}
            <div>
              <Label className="text-[11px]">Auth Type</Label>
              <select value={authType} onChange={e => setAuthType(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                {AUTH_TYPES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </div>
            {authType !== 'none' && (
              <div>
                <Label className="text-[11px]">Auth Token Secret Name</Label>
                <Input value={authTokenKey} onChange={e => setAuthTokenKey(e.target.value)} placeholder="e.g. MY_MCP_TOKEN" className="h-9" />
              </div>
            )}
          </div>

          {/* Tools Section */}
          <div className="border-t border-border/30 pt-3">
            <Label className="text-[11px] mb-2 block">Tools</Label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <Input value={toolName} onChange={e => setToolName(e.target.value)} placeholder="tool name" className="h-8 text-xs" />
              <Input value={toolDesc} onChange={e => setToolDesc(e.target.value)} placeholder="description" className="h-8 text-xs" />
              <div className="flex gap-1">
                <Input value={toolHandler} onChange={e => setToolHandler(e.target.value)} placeholder="handler fn" className="h-8 text-xs flex-1" />
                <Button size="sm" onClick={addTool} className="h-8 px-2"><Plus className="w-3 h-3" /></Button>
              </div>
            </div>
            {tools.length > 0 && (
              <div className="space-y-1">
                {tools.map(t => (
                  <div key={t.name} className="flex items-center gap-2 text-[11px] bg-muted/20 rounded-md px-2 py-1.5">
                    <Zap className="w-3 h-3 text-fuchsia-500 shrink-0" />
                    <span className="font-mono font-medium">{t.name}</span>
                    <span className="text-muted-foreground truncate flex-1">{t.description}</span>
                    <button onClick={() => removeTool(t.name)} className="text-red-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button size="sm" onClick={create} disabled={actionLoading.create}>
            {actionLoading.create ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
            Create MCP Server
          </Button>
        </div>
      )}

      {/* Servers List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading MCP servers...</div>
      ) : servers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border/40 rounded-xl">
          No MCP servers yet. Click "Create Server" to build one.
        </div>
      ) : (
        <div className="space-y-2">
          {servers.map(s => (
            <div key={s.id} className="rounded-xl border border-border/40 bg-card p-3">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'h-9 w-9 rounded-lg grid place-items-center shrink-0',
                  s.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                  s.status === 'error' ? 'bg-red-500/10 text-red-500' :
                  'bg-muted/30 text-muted-foreground'
                )}>
                  <Server className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className={cn(
                      'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                      s.status === 'active' ? 'bg-emerald-500/15 text-emerald-500' :
                      s.status === 'error' ? 'bg-red-500/15 text-red-500' :
                      s.status === 'paused' ? 'bg-amber-500/15 text-amber-500' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {s.status}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono">{s.transport}</span>
                    <span className="text-[9px] text-muted-foreground">{s.tool_count || 0} tools</span>
                  </div>
                  {s.description && <p className="text-[11px] text-muted-foreground mt-0.5">{s.description}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-[10px] font-mono text-muted-foreground/70 truncate">{s.server_id}</code>
                    {s.endpoint_url && <code className="text-[10px] font-mono text-muted-foreground/70 truncate">{s.endpoint_url}</code>}
                  </div>
                  {s.last_test_result && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">Last test: {s.last_test_result}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => testServer(s.server_id)} disabled={actionLoading[`test_${s.server_id}`]} title="Test" className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                    {actionLoading[`test_${s.server_id}`] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => deleteServer(s.server_id, s.name)} disabled={actionLoading[`del_${s.server_id}`]} title="Delete" className="p-1.5 rounded hover:bg-red-500/10 text-red-500">
                    {actionLoading[`del_${s.server_id}`] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              {/* Tools */}
              {(s.tools || []).length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/20 flex flex-wrap gap-1">
                  {s.tools.map(t => (
                    <span key={t.name} className="text-[9px] px-1.5 py-0.5 rounded-md bg-fuchsia-500/10 text-fuchsia-500 font-mono">
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}