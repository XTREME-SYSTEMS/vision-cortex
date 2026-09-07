import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Puzzle, Search, Plus, X, Check, Loader2, Globe, ShieldCheck,
  Phone, Telescope, Code, Cpu, Brain, Zap, Mail, MessageSquare,
  TrendingUp, Database, Sparkles, Settings as SettingsIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  Puzzle, Globe, ShieldCheck, Phone, Telescope, Code, Cpu, Brain, Zap,
  Mail, MessageSquare, TrendingUp, Database, Sparkles, Settings: SettingsIcon,
};

const COLOR_MAP = {
  blue: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  green: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  purple: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
  orange: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  red: 'bg-red-500/10 text-red-500 border-red-500/30',
  cyan: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
  pink: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
  yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
};

const CATEGORIES = ['all', 'productivity', 'research', 'communication', 'system', 'data', 'creative', 'custom'];

export default function Plugins() {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [toggling, setToggling] = useState(null);

  const load = useCallback(async () => {
    try {
      const list = await base44.entities.Plugin.list('-created_date', 100);
      setPlugins(list);
    } catch (e) {
      console.error('Failed to load plugins:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (plugin) => {
    setToggling(plugin.id);
    try {
      await base44.entities.Plugin.update(plugin.id, { enabled: !plugin.enabled });
      setPlugins((ps) => ps.map((p) => p.id === plugin.id ? { ...p, enabled: !p.enabled } : p));
    } catch (e) {
      console.error('Toggle failed:', e);
    } finally {
      setToggling(null);
    }
  };

  const filtered = plugins.filter((p) => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || p.category === category;
    return matchSearch && matchCat;
  });

  const enabledCount = plugins.filter((p) => p.enabled).length;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Puzzle className="w-5 h-5 text-violet-500" />
            <h1 className="font-display text-2xl tracking-tight">Plugin Store</h1>
            <span className="text-[10px] text-muted-foreground">{enabledCount} active</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Extend Prime with specialized capabilities — enabled plugins inject their instructions into every conversation</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-sm hover:opacity-90"
        >
          <Plus className="w-3.5 h-3.5" /> Create Plugin
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plugins…"
            className="w-full bg-muted rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap transition-colors capitalize',
                category === c ? 'bg-foreground text-background border-foreground' : 'bg-muted border-border/40 hover:bg-muted/70'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Plugin grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading plugins…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Puzzle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No plugins found. Create one to extend Prime's capabilities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => {
            const Icon = ICON_MAP[p.icon] || Puzzle;
            const colorClass = COLOR_MAP[p.color] || COLOR_MAP.blue;
            return (
              <div key={p.id} className={cn('rounded-xl border p-4 transition-all', p.enabled ? 'border-foreground/20 bg-card' : 'border-border/40 bg-card hover:border-border/60')}>
                <div className="flex items-start gap-3 mb-2">
                  <div className={cn('w-10 h-10 rounded-lg grid place-items-center shrink-0 border', colorClass)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate">{p.name}</h3>
                    <p className="text-[10px] text-muted-foreground capitalize">{p.category} · v{p.version || '1.0.0'}</p>
                  </div>
                  {p.is_builtin && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/30">Built-in</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{p.description}</p>
                {p.capabilities?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.capabilities.slice(0, 3).map((c, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/20">{c}</span>
                    ))}
                    {p.capabilities.length > 3 && <span className="text-[9px] text-muted-foreground">+{p.capabilities.length - 3}</span>}
                  </div>
                )}
                <button
                  onClick={() => toggle(p)}
                  disabled={toggling === p.id}
                  className={cn(
                    'w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border transition-colors',
                    p.enabled
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-muted border-border/40 hover:bg-muted/70'
                  )}
                >
                  {toggling === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : p.enabled ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  {p.enabled ? 'Enabled' : 'Enable'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create plugin modal */}
      {showCreate && (
        <CreatePluginModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}

function CreatePluginModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    plugin_id: '',
    name: '',
    description: '',
    category: 'custom',
    system_prompt: '',
    capabilities: '',
    color: 'blue',
    icon: 'Puzzle',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    if (!form.plugin_id || !form.name) { setError('Plugin ID and name are required'); return; }
    setSaving(true);
    setError(null);
    try {
      await base44.entities.Plugin.create({
        ...form,
        capabilities: form.capabilities ? form.capabilities.split(',').map((c) => c.trim()).filter(Boolean) : [],
        is_builtin: false,
      });
      onCreated();
    } catch (e) {
      setError(e.message || 'Failed to create plugin');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border/60 max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Create Custom Plugin</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <div>
          <label className="text-xs font-medium block mb-1">Name *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, plugin_id: e.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="My Custom Plugin" className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Description</label>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this plugin does" className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">System Prompt</label>
          <textarea value={form.system_prompt} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} rows={4} placeholder="Instructions injected into Prime when this plugin is enabled…" className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring">
              {CATEGORIES.filter((c) => c !== 'all').map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Color</label>
            <select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring">
              {Object.keys(COLOR_MAP).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Capabilities (comma-separated)</label>
          <input value={form.capabilities} onChange={(e) => setForm({ ...form, capabilities: e.target.value })} placeholder="web search, code analysis, data lookup" className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button onClick={save} disabled={saving} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-foreground text-background text-sm hover:opacity-90 disabled:opacity-40">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Create Plugin
        </button>
      </div>
    </div>
  );
}