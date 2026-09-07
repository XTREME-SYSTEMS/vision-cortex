import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, RefreshCw, Shield, Cpu, Globe, Mail, Database, Server, Eye, Key, Lock, Network, Code, Rocket, Hammer, Brain, Users, Search, MessageSquare, FileText, Reply, Plus, GitBranch, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  Globe, Zap, Search, Eye, Database, Cpu, Key, Code, Server, GitBranch,
  MessageSquare, Mail, Reply, FileText, Hammer, Rocket, Brain, Users,
  Network, Plus, Lock, Shield, ShieldCheck
};

const CATEGORY_META = {
  browser: { label: 'Browser & Scraping', color: 'text-blue-500', bg: 'bg-blue-500/8', border: 'border-blue-500/30' },
  execution: { label: 'Execution', color: 'text-amber-500', bg: 'bg-amber-500/8', border: 'border-amber-500/30' },
  data_access: { label: 'Data Access', color: 'text-emerald-500', bg: 'bg-emerald-500/8', border: 'border-emerald-500/30' },
  frontend_editing: { label: 'Frontend Editing', color: 'text-cyan-500', bg: 'bg-cyan-500/8', border: 'border-cyan-500/30' },
  backend_editing: { label: 'Backend Editing', color: 'text-violet-500', bg: 'bg-violet-500/8', border: 'border-violet-500/30' },
  communications: { label: 'Communications', color: 'text-pink-500', bg: 'bg-pink-500/8', border: 'border-pink-500/30' },
  email: { label: 'Email', color: 'text-indigo-500', bg: 'bg-indigo-500/8', border: 'border-indigo-500/30' },
  scraping: { label: 'Scraping', color: 'text-teal-500', bg: 'bg-teal-500/8', border: 'border-teal-500/30' },
  accounts: { label: 'Accounts', color: 'text-orange-500', bg: 'bg-orange-500/8', border: 'border-orange-500/30' },
  build: { label: 'Build', color: 'text-lime-500', bg: 'bg-lime-500/8', border: 'border-lime-500/30' },
  deploy: { label: 'Deploy', color: 'text-green-500', bg: 'bg-green-500/8', border: 'border-green-500/30' },
  ai_inference: { label: 'AI Inference', color: 'text-purple-500', bg: 'bg-purple-500/8', border: 'border-purple-500/30' },
  mcp: { label: 'MCP', color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/8', border: 'border-fuchsia-500/30' },
  security: { label: 'Security', color: 'text-red-500', bg: 'bg-red-500/8', border: 'border-red-500/30' },
};

export default function CapabilityTogglePanel() {
  const [capabilities, setCapabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState({});
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('manageCapabilities', { action: 'list' });
      setCapabilities(res.capabilities || []);
    } catch (e) {
      console.error('Failed to load capabilities:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const seed = async () => {
    setLoading(true);
    try {
      await base44.functions.invoke('manageCapabilities', { action: 'seed' });
      load();
    } catch (e) { alert('Failed: ' + e.message); }
  };

  const toggle = async (capId, currentEnabled) => {
    setToggling({ ...toggling, [capId]: true });
    try {
      await base44.functions.invoke('manageCapabilities', {
        action: 'toggle',
        capability_id: capId,
        enabled: !currentEnabled
      });
      load();
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setToggling({ ...toggling, [capId]: false }); }
  };

  const enableAll = async () => {
    for (const cap of capabilities) {
      if (!cap.enabled) {
        await base44.functions.invoke('manageCapabilities', {
          action: 'toggle',
          capability_id: cap.capability_id,
          enabled: true
        });
      }
    }
    load();
  };

  const disableAll = async () => {
    for (const cap of capabilities) {
      if (cap.enabled) {
        await base44.functions.invoke('manageCapabilities', {
          action: 'toggle',
          capability_id: cap.capability_id,
          enabled: false
        });
      }
    }
    load();
  };

  // Group by category
  const grouped = capabilities.reduce((acc, cap) => {
    if (!acc[cap.category]) acc[cap.category] = [];
    acc[cap.category].push(cap);
    return acc;
  }, {});

  const filteredCategories = filter === 'all'
    ? Object.keys(grouped)
    : [filter];

  const enabledCount = capabilities.filter(c => c.enabled).length;

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Loading capabilities...</div>;
  }

  if (capabilities.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border/40 rounded-xl">
        <Cpu className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground mb-3">No capabilities initialized yet</p>
        <Button size="sm" onClick={seed}>
          <Zap className="w-3.5 h-3.5 mr-1.5" /> Initialize All Capabilities
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold">Agent Capability Toggles</h3>
          <p className="text-[11px] text-muted-foreground">{enabledCount}/{capabilities.length} capabilities enabled</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={enableAll} className="h-8 text-xs">
            <Zap className="w-3 h-3 mr-1" /> Enable All
          </Button>
          <Button size="sm" variant="outline" onClick={disableAll} className="h-8 text-xs">
            <Shield className="w-3 h-3 mr-1" /> Disable All
          </Button>
          <Button size="sm" variant="outline" onClick={seed} className="h-8 text-xs">
            <RefreshCw className="w-3 h-3 mr-1" /> Re-seed
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'text-[10px] px-2 py-1 rounded-md border transition-colors',
            filter === 'all' ? 'bg-foreground text-background border-foreground' : 'border-border/40 text-muted-foreground hover:border-border'
          )}
        >
          All ({capabilities.length})
        </button>
        {Object.keys(grouped).map(cat => {
          const meta = CATEGORY_META[cat] || {};
          const count = grouped[cat].length;
          const enabled = grouped[cat].filter(c => c.enabled).length;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                'text-[10px] px-2 py-1 rounded-md border transition-colors',
                filter === cat ? cn(meta.bg, meta.border, meta.color) : 'border-border/40 text-muted-foreground hover:border-border'
              )}
            >
              {meta.label || cat} ({enabled}/{count})
            </button>
          );
        })}
      </div>

      {/* Capability Grid by Category */}
      {filteredCategories.map(cat => {
        const meta = CATEGORY_META[cat] || {};
        const caps = grouped[cat] || [];
        if (caps.length === 0) return null;
        return (
          <div key={cat} className={cn('rounded-xl border p-3', meta.border, meta.bg)}>
            <div className="flex items-center gap-2 mb-2.5">
              <span className={cn('text-xs font-medium', meta.color)}>{meta.label || cat}</span>
              <span className="text-[10px] text-muted-foreground">{caps.filter(c => c.enabled).length}/{caps.length} on</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {caps.map(cap => {
                const Icon = ICON_MAP[cap.icon] || Cpu;
                return (
                  <div
                    key={cap.id}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg border p-2.5 transition-all',
                      cap.enabled
                        ? 'border-foreground/20 bg-background/60'
                        : 'border-border/30 bg-muted/10 opacity-60'
                    )}
                  >
                    <div className={cn(
                      'h-8 w-8 rounded-md grid place-items-center shrink-0',
                      cap.enabled ? cn(meta.bg, meta.color) : 'bg-muted/30 text-muted-foreground'
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">{cap.name}</span>
                        {cap.requires_approval && (
                          <Shield className="w-3 h-3 text-amber-500 shrink-0" title="Requires approval" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 leading-tight">{cap.description}</p>
                    </div>
                    <button
                      onClick={() => toggle(cap.capability_id, cap.enabled)}
                      disabled={toggling[cap.capability_id]}
                      className={cn(
                        'shrink-0 relative w-9 h-5 rounded-full transition-colors',
                        cap.enabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                      )}
                    >
                      {toggling[cap.capability_id] && <Loader2 className="w-3 h-3 animate-spin absolute inset-0 m-auto text-foreground" />}
                      <span className={cn(
                        'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
                        cap.enabled ? 'translate-x-4' : 'translate-x-0.5'
                      )} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}