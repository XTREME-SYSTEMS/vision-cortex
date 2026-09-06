import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Key, Copy, Loader2, Check, ArrowLeftRight, ArrowRight, ArrowLeft,
  Brain, Server, Database, Globe, Zap, Cpu, CreditCard, Coins,
  Search, Calendar, Github, Mail, Telescope, ShieldCheck, Activity,
  RefreshCw, Copy as CopyIcon, Eye, MessageSquare,
} from 'lucide-react';
import {
  API_KEY_CATEGORIES, CATEGORY_BY_ID, TIER_LABELS, SYNC_LABELS,
  resolveCategory,
} from '@/lib/apiKeyCategories';
import { cn } from '@/lib/utils';

const ICONS = {
  Brain, Server, Database, Globe, Zap, Cpu, CreditCard, Coins,
  Search, Calendar, Github, Mail, Telescope, ShieldCheck, Activity,
  RefreshCw, Copy: CopyIcon, Eye, MessageSquare,
};

const COLOR_MAP = {
  violet: { ring: 'ring-violet-500/40', bg: 'bg-violet-500/8', text: 'text-violet-500', border: 'border-violet-500/30', dot: 'bg-violet-500' },
  purple: { ring: 'ring-purple-500/40', bg: 'bg-purple-500/8', text: 'text-purple-500', border: 'border-purple-500/30', dot: 'bg-purple-500' },
  indigo: { ring: 'ring-indigo-500/40', bg: 'bg-indigo-500/8', text: 'text-indigo-500', border: 'border-indigo-500/30', dot: 'bg-indigo-500' },
  fuchsia: { ring: 'ring-fuchsia-500/40', bg: 'bg-fuchsia-500/8', text: 'text-fuchsia-500', border: 'border-fuchsia-500/30', dot: 'bg-fuchsia-500' },
  blue: { ring: 'ring-blue-500/40', bg: 'bg-blue-500/8', text: 'text-blue-500', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  cyan: { ring: 'ring-cyan-500/40', bg: 'bg-cyan-500/8', text: 'text-cyan-500', border: 'border-cyan-500/30', dot: 'bg-cyan-500' },
  teal: { ring: 'ring-teal-500/40', bg: 'bg-teal-500/8', text: 'text-teal-500', border: 'border-teal-500/30', dot: 'bg-teal-500' },
  amber: { ring: 'ring-amber-500/40', bg: 'bg-amber-500/8', text: 'text-amber-500', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  orange: { ring: 'ring-orange-500/40', bg: 'bg-orange-500/8', text: 'text-orange-500', border: 'border-orange-500/30', dot: 'bg-orange-500' },
  emerald: { ring: 'ring-emerald-500/40', bg: 'bg-emerald-500/8', text: 'text-emerald-500', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
  yellow: { ring: 'ring-yellow-500/40', bg: 'bg-yellow-500/8', text: 'text-yellow-500', border: 'border-yellow-500/30', dot: 'bg-yellow-500' },
  green: { ring: 'ring-green-500/40', bg: 'bg-green-500/8', text: 'text-green-500', border: 'border-green-500/30', dot: 'bg-green-500' },
  lime: { ring: 'ring-lime-500/40', bg: 'bg-lime-500/8', text: 'text-lime-500', border: 'border-lime-500/30', dot: 'bg-lime-500' },
  slate: { ring: 'ring-slate-500/40', bg: 'bg-slate-500/8', text: 'text-slate-500', border: 'border-slate-500/30', dot: 'bg-slate-500' },
  rose: { ring: 'ring-rose-500/40', bg: 'bg-rose-500/8', text: 'text-rose-500', border: 'border-rose-500/30', dot: 'bg-rose-500' },
  red: { ring: 'ring-red-500/40', bg: 'bg-red-500/8', text: 'text-red-500', border: 'border-red-500/30', dot: 'bg-red-500' },
  sky: { ring: 'ring-sky-500/40', bg: 'bg-sky-500/8', text: 'text-sky-500', border: 'border-sky-500/30', dot: 'bg-sky-500' },
  pink: { ring: 'ring-pink-500/40', bg: 'bg-pink-500/8', text: 'text-pink-500', border: 'border-pink-500/30', dot: 'bg-pink-500' },
};

function CategoryCard({ cat, selected, onClick, keyCount }) {
  const Icon = ICONS[cat.icon] || Key;
  const c = COLOR_MAP[cat.color] || COLOR_MAP.violet;
  const syncCfg = SYNC_LABELS[cat.sync];
  const SyncIcon = syncCfg?.icon === 'ArrowLeftRight' ? ArrowLeftRight : syncCfg?.icon === 'ArrowRight' ? ArrowRight : ArrowLeft;
  const tierCfg = TIER_LABELS[cat.tier];

  return (
    <button
      onClick={() => onClick(cat.id)}
      className={cn(
        'text-left rounded-lg border p-2.5 transition-all hover:scale-[1.02] relative',
        selected ? cn(c.border, c.bg, 'ring-2', c.ring) : 'border-border/50 bg-card hover:border-border'
      )}
    >
      <div className="flex items-start gap-2">
        <div className={cn('h-7 w-7 rounded-md grid place-items-center shrink-0', c.bg)}>
          <Icon className={cn('w-3.5 h-3.5', c.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium truncate">{cat.label}</span>
            {cat.limitless && <span className="text-[8px] font-mono text-violet-500 bg-violet-500/10 px-1 rounded shrink-0">∞</span>}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn('inline-flex items-center gap-0.5 text-[9px]', c.text)}>
              <SyncIcon className="w-2.5 h-2.5" /> {syncCfg?.label}
            </span>
            <span className={cn('text-[9px] px-1 rounded', tierCfg.bg, tierCfg.color)}>{tierCfg.label}</span>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2 leading-tight">{cat.description}</p>
      {keyCount > 0 && (
        <span className="absolute top-1.5 right-1.5 text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-foreground text-background">
          {keyCount}
        </span>
      )}
    </button>
  );
}

export default function ApiKeyManager() {
  const [vaultEntries, setVaultEntries] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('cortex_mesh');
  const [prefix, setPrefix] = useState('vc');
  const [length, setLength] = useState(48);
  const [assignTo, setAssignTo] = useState('');
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadVault = useCallback(async () => {
    try {
      const list = await base44.entities.VaultEntry.list('-updated_date', 100);
      setVaultEntries(list || []);
    } catch {}
  }, []);
  useEffect(() => { loadVault(); }, [loadVault]);

  const activeCategory = CATEGORY_BY_ID[selectedCategory];

  // Auto-set prefix when category changes
  useEffect(() => {
    if (activeCategory?.prefixes?.[0]) {
      setPrefix(activeCategory.prefixes[0]);
    }
  }, [selectedCategory]);

  // Count keys per category
  const keysByCategory = useMemo(() => {
    const counts = {};
    for (const v of vaultEntries) {
      const cat = v.category || resolveCategory(null, v.account_type)?.id;
      if (cat) counts[cat] = (counts[cat] || 0) + (v.assigned_api_keys?.length || 0);
    }
    return counts;
  }, [vaultEntries]);

  // Filter vault entries by selected category
  const filteredEntries = useMemo(() => {
    if (!activeCategory) return vaultEntries;
    return vaultEntries.filter(v => {
      const cat = v.category || resolveCategory(null, v.account_type)?.id;
      return cat === selectedCategory || activeCategory.services.includes(v.account_type);
    });
  }, [vaultEntries, selectedCategory, activeCategory]);

  const generate = async () => {
    setLoading(true);
    setGenerated(null);
    try {
      const res = await base44.functions.invoke('generateApiKey', {
        prefix,
        length: Number(length),
        vault_entry_id: assignTo || undefined,
        category: selectedCategory,
      });
      setGenerated(res);
      loadVault();
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setLoading(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(generated.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const c = activeCategory ? (COLOR_MAP[activeCategory.color] || COLOR_MAP.violet) : COLOR_MAP.violet;
  const Icon = activeCategory ? (ICONS[activeCategory.icon] || Key) : Key;

  return (
    <div className="space-y-4">
      {/* Category Grid */}
      <div className="rounded-xl border border-border/60 bg-card p-3">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-sm font-semibold">Ecosystem Categories</h3>
          <span className="text-[10px] text-muted-foreground">{API_KEY_CATEGORIES.length} categories · {Object.values(keysByCategory).reduce((a, b) => a + b, 0)} keys issued</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {API_KEY_CATEGORIES.map(cat => (
            <CategoryCard
              key={cat.id}
              cat={cat}
              selected={selectedCategory === cat.id}
              onClick={setSelectedCategory}
              keyCount={keysByCategory[cat.id] || 0}
            />
          ))}
        </div>
      </div>

      {/* Active Category + Generator */}
      {activeCategory && (
        <div className={cn('rounded-xl border p-4 space-y-3', c.border, c.bg)}>
          <div className="flex items-center gap-2.5">
            <div className={cn('h-9 w-9 rounded-lg grid place-items-center', c.bg)}>
              <Icon className={cn('w-4.5 h-4.5', c.text)} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                {activeCategory.label}
                {activeCategory.limitless && <span className="text-[10px] font-mono text-violet-500">∞ limitless</span>}
              </h3>
              <p className="text-[11px] text-muted-foreground">{activeCategory.description}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium', c.text)}>
                {activeCategory.sync === 'bi-directional' ? <ArrowLeftRight className="w-3 h-3" /> : activeCategory.sync === 'outbound' ? <ArrowRight className="w-3 h-3" /> : <ArrowLeft className="w-3 h-3" />}
                {SYNC_LABELS[activeCategory.sync]?.label}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {activeCategory.services.length} services · {activeCategory.app_types.length} app links
              </span>
            </div>
          </div>

          {/* Linked services */}
          <div className="flex flex-wrap gap-1">
            {activeCategory.services.map(svc => (
              <span key={svc} className="text-[10px] px-1.5 py-0.5 rounded-md bg-background/60 border border-border/40 font-mono">
                {svc}
              </span>
            ))}
          </div>

          {/* Generator form */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div>
              <Label className="text-[11px]">Prefix</Label>
              <Input value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="vc" className="h-9" />
            </div>
            <div>
              <Label className="text-[11px]">Length</Label>
              <Input type="number" value={length} onChange={e => setLength(e.target.value)} min="16" max="128" className="h-9" />
            </div>
            <div>
              <Label className="text-[11px]">Assign to Vault Entry</Label>
              <select value={assignTo} onChange={e => setAssignTo(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="">— None —</option>
                {filteredEntries.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>
          <Button size="sm" onClick={generate} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Key className="w-4 h-4 mr-1.5" />}
            Generate {activeCategory.label.split('·')[0].trim()} Key
          </Button>
        </div>
      )}

      {/* Generated key */}
      {generated && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-emerald-500">Key Generated</h4>
            <button onClick={copy} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md bg-background/50 hover:bg-background transition-colors">
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs font-mono break-all bg-background/50 rounded-md p-2 border border-border/30">{generated.key}</p>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {generated.category && <span>Category: <code className="text-foreground">{generated.category}</code></span>}
            {generated.assigned_to && <span>→ {generated.assigned_to}</span>}
          </div>
          <p className="text-[10px] text-muted-foreground">⚠ Store securely. Will not be shown again. Share across Brain ↔ Eyes ↔ Comms for bi-directional sync.</p>
        </div>
      )}

      {/* Keys in this category */}
      {filteredEntries.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
          <h4 className="text-[11px] font-medium mb-2">Keys in this category ({filteredEntries.length} entries)</h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {filteredEntries.map(v => (
              <div key={v.id} className="flex items-center gap-2 text-[11px] py-1 border-b border-border/20">
                <span className={cn('w-1.5 h-1.5 rounded-full', c.dot)} />
                <span className="font-medium w-32 truncate">{v.name}</span>
                <span className="text-muted-foreground font-mono text-[10px]">{v.account_type}</span>
                <span className="flex-1 truncate text-muted-foreground">
                  {(v.assigned_api_keys || []).length} key{(v.assigned_api_keys || []).length !== 1 ? 's' : ''}
                </span>
                {v.last_synced && <span className="text-[9px] text-muted-foreground/60">{new Date(v.last_synced).toLocaleDateString()}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}