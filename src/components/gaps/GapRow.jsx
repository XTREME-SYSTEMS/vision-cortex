import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Play, ShieldCheck, Trash2, Edit3, ChevronDown, ChevronRight, Code2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';

const statusColor = {
  open: 'bg-muted text-muted-foreground',
  recommended: 'bg-blue-500/10 text-blue-600',
  applied: 'bg-amber-500/10 text-amber-600',
  validated: 'bg-emerald-500/10 text-emerald-600',
  rejected: 'bg-rose-500/10 text-rose-600',
};

const severityColor = {
  critical: 'border-l-rose-500',
  high: 'border-l-orange-500',
  medium: 'border-l-amber-500',
  low: 'border-l-sky-500',
};

export default function GapRow({ gap, onDelete, onUpdate, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(gap.title);
  const [editDesc, setEditDesc] = useState(gap.description);
  const [actionError, setActionError] = useState(null);

  const recommend = async () => {
    setLoading('recommend');
    setActionError(null);
    try {
      await base44.functions.invoke('gapRecommender', { mode: 'recommend', gap_id: gap.id });
      const fresh = await base44.entities.Gap.get(gap.id);
      onUpdate(fresh);
    } catch (e) { setActionError(e.message || 'Recommendation failed'); }
    setLoading(null);
  };

  const apply = async () => {
    setLoading('apply');
    setActionError(null);
    try {
      await base44.functions.invoke('gapRecommender', { mode: 'apply', gap_id: gap.id });
      const fresh = await base44.entities.Gap.get(gap.id);
      onUpdate(fresh);
    } catch (e) { setActionError(e.message || 'Apply failed — recommendation may be incomplete'); }
    setLoading(null);
  };

  const validate = async () => {
    setLoading('validate');
    setActionError(null);
    try {
      await base44.functions.invoke('gapRecommender', { mode: 'validate', gap_id: gap.id });
      const fresh = await base44.entities.Gap.get(gap.id);
      onUpdate(fresh);
    } catch (e) { setActionError(e.message || 'Validation failed'); }
    setLoading(null);
  };

  const saveEdit = async () => {
    await base44.entities.Gap.update(gap.id, { title: editTitle, description: editDesc });
    const fresh = await base44.entities.Gap.get(gap.id);
    onUpdate(fresh);
    setEditMode(false);
  };

  return (
    <div className={`border-l-4 ${severityColor[gap.severity]} border-y border-r border-border/60 bg-card`}>
      <div className="flex items-stretch">
        <div className="w-12 shrink-0 grid place-items-center text-xs font-mono text-muted-foreground border-r border-border/40">
          {gap.number}
        </div>
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start gap-3">
            <button onClick={() => setExpanded(!expanded)} className="mt-0.5 text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <div className="flex-1 min-w-0">
              {editMode ? (
                <div className="space-y-2">
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-8 text-sm" />
                  <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} className="text-xs" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="font-medium text-sm">{gap.title}</div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{gap.description}</p>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="outline" className={`text-[10px] ${statusColor[gap.status]}`}>{gap.status}</Badge>
              {gap.estimated_effort && <Badge variant="outline" className="text-[10px]">{gap.estimated_effort}</Badge>}
            </div>
          </div>

          {expanded && (
            <div className="mt-3 pl-7 space-y-3">
              {gap.recommendation ? (
                <div className="bg-muted/40 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wider text-blue-600 mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Recommendation</div>
                  <p className="text-sm">{gap.recommendation}</p>
                  {gap.implementation_steps?.length > 0 && (
                    <ol className="mt-2 space-y-1 text-xs text-muted-foreground list-decimal list-inside">
                      {gap.implementation_steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  )}
                  {gap.affected_files?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {gap.affected_files.map((f, i) => <Badge key={i} variant="outline" className="text-[10px] font-mono">{f}</Badge>)}
                    </div>
                  )}
                  {gap.implementation_code && (
                    <details className="mt-2">
                      <summary className="text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer flex items-center gap-1"><Code2 className="w-3 h-3" /> Generated Code</summary>
                      <pre className="mt-1.5 text-[11px] font-mono bg-background/80 border border-border/40 rounded p-2.5 overflow-x-auto max-h-64 whitespace-pre-wrap">{gap.implementation_code}</pre>
                    </details>
                  )}
                  {gap.validation_result && (
                    <div className={`mt-2 text-xs flex items-center gap-1.5 ${gap.validation_result.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Validation: {gap.validation_result.passed ? 'PASSED' : 'FAILED'} (score: {gap.validation_result.score})
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic pl-3">No recommendation yet. Click "AI Assist" to generate one.</p>
              )}

              {actionError && (
                <div className="flex items-start gap-2 text-xs text-rose-500 bg-rose-500/10 rounded-lg p-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" onClick={recommend} disabled={loading === 'recommend'}>
                  {loading === 'recommend' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {gap.recommendation ? 'Regenerate' : 'AI Assist'}
                </Button>
                {gap.recommendation && (
                  <Button size="sm" variant="outline" onClick={apply} disabled={loading === 'apply'}>
                    {loading === 'apply' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    Apply to System
                  </Button>
                )}
                {gap.status === 'applied' && (
                  <Button size="sm" variant="outline" onClick={validate} disabled={loading === 'validate'}>
                    {loading === 'validate' ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                    Validate
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setEditMode(true)}><Edit3 className="w-3 h-3" /> Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(gap.id)}><Trash2 className="w-3 h-3" /> Delete</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}