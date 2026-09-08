import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Library, Search, Copy, Check, Database, Cloud, HardDrive, Github } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CloneLibraryTab({ refreshKey }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      const list = await base44.entities.CloneTemplate.list('-created_date', 100);
      setTemplates(list || []);
    } catch { setTemplates([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const filtered = templates.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.industry?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Library className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Template Library</h3>
          <span className="text-[11px] text-muted-foreground">{templates.length} templates</span>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-input bg-background outline-none focus:ring-1 focus:ring-ring w-48"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border/40 rounded-xl">
          <Library className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No templates yet. Run a clone pipeline to save validated templates here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(t => (
            <div key={t.id} className={cn('border rounded-lg p-3 bg-card cursor-pointer transition-colors', selected?.id === t.id ? 'border-violet-500/50 bg-violet-500/5' : 'border-border hover:border-border/80')} onClick={() => setSelected(t)}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.industry}</p>
                </div>
                <span className={cn('text-[9px] px-2 py-0.5 rounded-full font-medium',
                  t.parity_score >= 1 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500')}>
                  {(t.parity_score * 100).toFixed(0)}% parity
                </span>
              </div>
              <div className="flex gap-3 text-[10px] text-muted-foreground">
                <span>{t.frontend_spec?.pages?.length || 0} pages</span>
                <span>{t.backend_spec?.entities?.length || 0} entities</span>
                <span>{t.backend_spec?.functions?.length || 0} functions</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                {t.provisioned && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">provisioned</span>}
                {t.rebrand_completed && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">rebranded</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template detail */}
      {selected && (
        <div className="border rounded-lg p-4 bg-card border-border space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">{selected.name}</h4>
            <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-xs">close</button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div><span className="text-muted-foreground">Source:</span> <a href={selected.source_url} target="_blank" rel="noreferrer" className="text-violet-500 hover:underline truncate">{selected.source_url}</a></div>
            <div><span className="text-muted-foreground">Auth:</span> {selected.backend_spec?.auth_model || 'N/A'}</div>
            <div><span className="text-muted-foreground">Status:</span> {selected.status}</div>
          </div>

          {selected.uncloneable_items?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Uncloneable Items (inferred)</p>
              <div className="space-y-1">
                {selected.uncloneable_items.map((u, i) => (
                  <div key={i} className="text-xs border rounded-md p-2 bg-muted/30 border-border">
                    <span className="text-amber-500 font-medium">⚠ {u}</span>
                    {selected.inferred_items?.[i] && (
                      <p className="text-emerald-500 mt-0.5">→ {JSON.stringify(selected.inferred_items[i])}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Frontend Pages</p>
              <div className="space-y-0.5">
                {(selected.frontend_spec?.pages || []).map((p, i) => (
                  <div key={i} className="text-xs font-mono text-muted-foreground">{p.name || p.route || `page-${i}`}</div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Backend Entities</p>
              <div className="space-y-0.5">
                {(selected.backend_spec?.entities || []).map((e, i) => (
                  <div key={i} className="text-xs font-mono text-muted-foreground">{e.name || `entity-${i}`}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}