import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, RefreshCw, FileText, GitBranch, ShieldCheck, AlertCircle, CheckCircle, Clock, Zap, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_META = {
  vision_mission: { label: 'Vision & Mission', color: 'text-violet-500', bg: 'bg-violet-500/8', border: 'border-violet-500/30' },
  blueprint: { label: 'Blueprint', color: 'text-blue-500', bg: 'bg-blue-500/8', border: 'border-blue-500/30' },
  operations: { label: 'Operations', color: 'text-cyan-500', bg: 'bg-cyan-500/8', border: 'border-cyan-500/30' },
  governance: { label: 'Governance', color: 'text-emerald-500', bg: 'bg-emerald-500/8', border: 'border-emerald-500/30' },
  corporate_structure: { label: 'Corporate Structure', color: 'text-amber-500', bg: 'bg-amber-500/8', border: 'border-amber-500/30' },
  company_info: { label: 'Company Info', color: 'text-orange-500', bg: 'bg-orange-500/8', border: 'border-orange-500/30' },
  legal_compliance: { label: 'Legal & Compliance', color: 'text-red-500', bg: 'bg-red-500/8', border: 'border-red-500/30' },
  agent_charters: { label: 'Agent Charters', color: 'text-purple-500', bg: 'bg-purple-500/8', border: 'border-purple-500/30' },
  memory: { label: 'Memory', color: 'text-indigo-500', bg: 'bg-indigo-500/8', border: 'border-indigo-500/30' },
  communication: { label: 'Communication', color: 'text-teal-500', bg: 'bg-teal-500/8', border: 'border-teal-500/30' },
  intelligence: { label: 'Intelligence', color: 'text-rose-500', bg: 'bg-rose-500/8', border: 'border-rose-500/30' },
  security: { label: 'Security', color: 'text-red-500', bg: 'bg-red-500/8', border: 'border-red-500/30' },
  financial: { label: 'Financial', color: 'text-yellow-500', bg: 'bg-yellow-500/8', border: 'border-yellow-500/30' },
  technical: { label: 'Technical', color: 'text-slate-500', bg: 'bg-slate-500/8', border: 'border-slate-500/30' },
  architecture: { label: 'Architecture', color: 'text-violet-500', bg: 'bg-violet-500/8', border: 'border-violet-500/30' },
  knowledge: { label: 'Knowledge Base', color: 'text-blue-500', bg: 'bg-blue-500/8', border: 'border-blue-500/30' },
};

const PRIORITY_BADGE = {
  critical: { label: 'CRITICAL', color: 'text-red-500 bg-red-500/10' },
  mandatory: { label: 'MANDATORY', color: 'text-amber-500 bg-amber-500/10' },
  standard: { label: 'STANDARD', color: 'text-blue-500 bg-blue-500/10' },
  reference: { label: 'REFERENCE', color: 'text-muted-foreground bg-muted' },
};

export default function DocumentEvolutionMonitor() {
  const [docs, setDocs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [evolving, setEvolving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showDocModal, setShowDocModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [docList, eventList] = await Promise.all([
        base44.entities.CoreDocument.list('-created_date', 200).catch(() => []),
        base44.entities.DocumentEvolution.list('-created_date', 10).catch(() => []),
      ]);
      setDocs(docList || []);
      setEvents(eventList || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const bootstrap = async () => {
    setBootstrapping(true);
    try {
      await base44.functions.invoke('bootstrapCoreDocuments', {});
      await load();
    } catch (e) { console.error(e); }
    setBootstrapping(false);
  };

  const validate = async () => {
    setValidating(true);
    try {
      await base44.functions.invoke('evolveDocument', { mode: 'validate' });
      await load();
    } catch (e) { console.error(e); }
    setValidating(false);
  };

  const evolve = async (docId) => {
    setEvolving(true);
    try {
      await base44.functions.invoke('evolveDocument', {
        source_document_id: docId,
        trigger: 'manual',
        change_description: `Manual evolution trigger from monitor`
      });
      await load();
    } catch (e) { console.error(e); }
    setEvolving(false);
  };

  // Group docs by category
  const grouped = docs.reduce((acc, d) => {
    const key = d.category || 'technical';
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  const criticalCount = docs.filter(d => d.priority === 'critical').length;
  const activeCount = docs.filter(d => d.status === 'active').length;
  const totalEvolutions = docs.reduce((sum, d) => sum + (d.evolution_count || 0), 0);
  const avgValidation = docs.length > 0 ? docs.reduce((s, d) => s + (d.validation_score || 0), 0) / docs.length : 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <GitBranch className="w-4 h-4" /> Document Evolution System
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {docs.length} core documents · {criticalCount} critical · {totalEvolutions} total evolutions · Codex Keeper agent guardians
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={validate}
            disabled={validating || docs.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/60 text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
          >
            {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            Validate
          </button>
          <button
            onClick={bootstrap}
            disabled={bootstrapping}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {bootstrapping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            {bootstrapping ? 'Bootstrapping...' : 'Bootstrap Core'}
          </button>
        </div>
      </div>

      {/* Stats */}
      {docs.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-lg border border-border/60 bg-card p-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Documents</div>
            <div className="text-lg font-semibold mt-0.5">{docs.length}</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-card p-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Active</div>
            <div className="text-lg font-semibold mt-0.5 text-emerald-500">{activeCount}</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-card p-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Evolutions</div>
            <div className="text-lg font-semibold mt-0.5 text-blue-500">{totalEvolutions}</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-card p-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Health</div>
            <div className={cn('text-lg font-semibold mt-0.5', avgValidation >= 0.8 ? 'text-emerald-500' : avgValidation >= 0.5 ? 'text-amber-500' : 'text-red-500')}>
              {(avgValidation * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && docs.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading document ecosystem...
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border/60 rounded-lg">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No core documents bootstrapped yet. Click "Bootstrap Core" to establish the entire Vision Cortex foundation.
        </div>
      ) : (
        <>
          {/* Documents grouped by category */}
          <div className="space-y-2.5">
            {Object.entries(grouped).map(([cat, catDocs]) => {
              const meta = CATEGORY_META[cat] || CATEGORY_META.technical;
              return (
                <div key={cat} className={cn('rounded-lg border p-2.5', meta.border, meta.bg)}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn('text-xs font-semibold uppercase tracking-wider', meta.color)}>{meta.label}</span>
                    <span className="text-[10px] text-muted-foreground">({catDocs.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {catDocs.map((doc) => {
                      const priority = PRIORITY_BADGE[doc.priority] || PRIORITY_BADGE.standard;
                      return (
                        <div
                          key={doc.id}
                          className="rounded-md border border-border/40 bg-card p-2 hover:border-border/80 transition-colors cursor-pointer"
                          onClick={() => { setSelectedDoc(doc); setShowDocModal(true); }}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={cn('text-[8px] font-bold px-1 py-0.5 rounded', priority.color)}>{priority.label}</span>
                            <span className="font-mono text-[9px] text-muted-foreground/60 ml-auto">v{doc.version}</span>
                          </div>
                          <div className="text-[12px] font-medium mb-0.5 truncate">{doc.title}</div>
                          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                            <span className="font-mono">{doc.document_id}</span>
                            {doc.evolution_count > 0 && <span className="text-blue-500">· {doc.evolution_count} evolutions</span>}
                            {(doc.dependents || []).length > 0 && <span className="text-violet-500">· {(doc.dependents || []).length} dependents</span>}
                          </div>
                          <div className="flex items-center gap-1 mt-1.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); evolve(doc.document_id); }}
                              disabled={evolving}
                              className="text-[9px] flex items-center gap-1 px-1.5 py-0.5 rounded bg-foreground/5 hover:bg-foreground/10 text-foreground disabled:opacity-40 transition-colors"
                            >
                              {evolving ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                              Evolve
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent evolution events */}
          {events.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Evolution Events</span>
              </div>
              <div className="space-y-1.5">
                {events.map((evt) => (
                  <div key={evt.id} className="flex items-center gap-2 text-[11px] py-1 border-b border-border/30 last:border-0">
                    {evt.status === 'completed' ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : evt.status === 'failed' ? (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    ) : (
                      <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
                    )}
                    <span className="font-mono text-muted-foreground">{evt.event_id}</span>
                    <span className="text-foreground/80 truncate flex-1">{evt.source_document_title || evt.source_document_id}</span>
                    <span className="text-muted-foreground shrink-0">{evt.cascaded_count || 0} cascaded</span>
                    <span className={cn('font-medium shrink-0',
                      (evt.validation_score || 0) >= 0.8 ? 'text-emerald-500' : 'text-amber-500'
                    )}>
                      {((evt.validation_score || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Document viewer modal */}
      {showDocModal && selectedDoc && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDocModal(false)}
        >
          <div
            className="bg-background border border-border rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">{selectedDoc.document_id}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">v{selectedDoc.version}</span>
                </div>
                <h3 className="font-display text-lg mt-0.5">{selectedDoc.title}</h3>
              </div>
              <button onClick={() => setShowDocModal(false)} className="text-muted-foreground hover:text-foreground p-1">
                <Eye className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{selectedDoc.content}</pre>
            </div>
            <div className="px-4 py-2.5 border-t border-border/60 flex items-center justify-between">
              <div className="text-[10px] text-muted-foreground">
                Dependencies: {(selectedDoc.dependencies || []).join(', ') || 'none'} · Dependents: {(selectedDoc.dependents || []).join(', ') || 'none'}
              </div>
              <button
                onClick={() => { setShowDocModal(false); evolve(selectedDoc.document_id); }}
                disabled={evolving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium disabled:opacity-40"
              >
                {evolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Trigger Evolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}