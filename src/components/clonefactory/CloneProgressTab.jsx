import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Play, ShieldCheck, RefreshCw, Copy, Library, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import TerminalLogStream from '@/components/clone/TerminalLogStream';

export default function CloneProgressTab({ activeJob, onJobUpdate, onSavedToLibrary }) {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [validation, setValidation] = useState(null);
  const [retrying, setRetrying] = useState(false);

  const ts = () => new Date().toLocaleTimeString('en-US', { hour12: false });
  const log = (worker, level, msg) => setLogs(p => [...p, { ts: ts(), worker, level, msg }]);

  const runClone = useCallback(async () => {
    if (!activeJob) return;
    setRunning(true);
    setLogs([]);
    setValidation(null);

    try {
      // Step 1: DEEP Clone
      log('deepCloneSystem', 'info', `Initiating DEEP clone for ${activeJob.target_url}`);
      await base44.entities.CloneJob.update(activeJob.id, { status: 'cloning', clone_progress: 10 });
      onJobUpdate();

      const cloneRes = await base44.functions.invoke('deepCloneSystem', {
        target_url: activeJob.target_url,
        industry: activeJob.industry,
        job_id: activeJob.id,
      });
      const cloneData = cloneRes.data || cloneRes;
      if (cloneData.error) throw new Error(cloneData.error);

      log('deepCloneSystem', 'success', `Extracted ${cloneData.summary?.pages || 0} pages, ${cloneData.summary?.components || 0} components, ${cloneData.summary?.entities || 0} entities`);
      log('deepCloneSystem', 'info', `Uncloneable: ${cloneData.summary?.uncloneable || 0} items — inferred ${cloneData.summary?.inferred || 0} replacements`);
      onJobUpdate();

      // Step 2: Validate
      log('validateCloneParity', 'info', 'Running parity validation across 12 tests...');
      await base44.entities.CloneJob.update(activeJob.id, { status: 'validating', clone_progress: 90 });
      onJobUpdate();

      const valRes = await base44.functions.invoke('validateCloneParity', {
        clone_spec: cloneData.clone_spec,
        target_url: activeJob.target_url,
        job_id: activeJob.id,
        attempt: 1,
      });
      const valData = valRes.data || valRes;
      if (valData.error) throw new Error(valData.error);

      setValidation(valData);
      log('validateCloneParity', valData.is_approved ? 'success' : 'warn',
        `Parity: ${(valData.aggregate_score * 100).toFixed(1)}% — ${valData.tests_passed}/${valData.tests_total} tests passed`);

      // Step 3: Auto-retry if not 100%
      let currentSpec = cloneData.clone_spec;
      let attempt = 1;
      let currentVal = valData;

      while (!currentVal.is_approved && attempt < (activeJob.max_retries || 10) && !retrying) {
        attempt++;
        log('autoRetry', 'info', `Attempt ${attempt}: regenerating to fix ${currentVal.gaps?.length || 0} gaps...`);

        const regenRes = await base44.functions.invoke('deepCloneSystem', {
          target_url: activeJob.target_url,
          industry: activeJob.industry,
          job_id: activeJob.id,
        });
        const regenData = regenRes.data || regenRes;
        currentSpec = regenData.clone_spec;

        const reValRes = await base44.functions.invoke('validateCloneParity', {
          clone_spec: currentSpec,
          target_url: activeJob.target_url,
          job_id: activeJob.id,
          attempt,
        });
        currentVal = (reValRes.data || reValRes);
        setValidation(currentVal);

        log('autoRetry', currentVal.is_approved ? 'success' : 'warn',
          `Attempt ${attempt}: ${(currentVal.aggregate_score * 100).toFixed(1)}% — ${currentVal.tests_passed}/${currentVal.tests_total} passed`);

        if (currentVal.is_approved) break;
      }

      // Step 4: Save to template library if passed
      if (currentVal.is_approved) {
        log('library', 'info', 'Parity gate passed — saving to template library...');
        const template = await base44.entities.CloneTemplate.create({
          name: activeJob.site_name,
          source_url: activeJob.target_url,
          industry: activeJob.industry,
          frontend_spec: {
            pages: currentSpec.pages || [],
            components: currentSpec.components || [],
            styles: currentSpec.styles || {},
          },
          backend_spec: {
            entities: currentSpec.entities || [],
            functions: currentSpec.functions || [],
            apis: currentSpec.apis || [],
            database_schema: currentSpec.database_schema || {},
            auth_model: currentSpec.auth_model || '',
          },
          content_map: { text_content: currentSpec.content || {}, metadata: currentSpec.navigation || {} },
          parity_score: currentVal.aggregate_score,
          visual_parity: currentVal.visual_parity,
          operational_parity: currentVal.operational_parity,
          content_parity: currentVal.content_parity,
          uncloneable_items: currentSpec.uncloneable || [],
          inferred_items: currentSpec.inferred || [],
          status: 'approved',
          clone_job_id: activeJob.id,
        });

        await base44.entities.CloneJob.update(activeJob.id, {
          status: 'passed',
          template_id: template.id,
          clone_progress: 100,
        });

        log('library', 'success', `Saved as template: ${template.id}`);
        onJobUpdate();
        onSavedToLibrary();
      }

      log('pipeline', 'success', 'Clone pipeline complete');
    } catch (e) {
      log('pipeline', 'error', `Pipeline failed: ${e.message}`);
      await base44.entities.CloneJob.update(activeJob.id, { status: 'failed', error_message: e.message }).catch(() => {});
      onJobUpdate();
    } finally {
      setRunning(false);
    }
  }, [activeJob, onJobUpdate, onSavedToLibrary]);

  if (!activeJob) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border/40 rounded-xl">
        <Copy className="w-8 h-8 mx-auto mb-2 opacity-40" />
        Select a job from the Queue tab to run the DEEP clone pipeline.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Job header */}
      <div className="flex items-center justify-between border rounded-lg p-3 bg-card border-border">
        <div>
          <p className="text-sm font-medium">{activeJob.site_name}</p>
          <p className="text-xs text-muted-foreground truncate">{activeJob.target_url}</p>
        </div>
        <Button onClick={runClone} disabled={running}>
          {running ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
          {running ? 'Pipeline Running…' : 'Run DEEP Clone'}
        </Button>
      </div>

      {/* Parity scores */}
      {validation && (
        <div className="grid grid-cols-4 gap-3">
          <ParityCard label="Aggregate" score={validation.aggregate_score} icon={ShieldCheck} />
          <ParityCard label="Visual" score={validation.visual_parity} icon={Copy} />
          <ParityCard label="Operational" score={validation.operational_parity} icon={RefreshCw} />
          <ParityCard label="Content" score={validation.content_parity} icon={Library} />
        </div>
      )}

      {/* Test results */}
      {validation?.tests && validation.tests.length > 0 && (
        <div className="border rounded-lg p-3 bg-card border-border space-y-1.5">
          <p className="text-xs font-medium mb-2">Validation Tests ({validation.tests_passed}/{validation.tests_total} passed)</p>
          {validation.tests.map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {t.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
              <span className="font-mono flex-1">{t.name}</span>
              <span className={cn('font-mono', t.score >= 1 ? 'text-emerald-500' : t.score >= 0.7 ? 'text-amber-500' : 'text-rose-500')}>
                {(t.score * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Gaps */}
      {validation?.gaps && validation.gaps.length > 0 && (
        <div className="border rounded-lg p-3 bg-amber-500/5 border-amber-500/30 space-y-1.5">
          <p className="text-xs font-medium flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Parity Gaps ({validation.gaps.length})</p>
          {validation.gaps.map((g, i) => (
            <div key={i} className="text-xs border rounded-md p-2 bg-background/50 border-border">
              <span className="font-medium">{g.category}</span> — <span className="text-muted-foreground">{g.description}</span>
              <p className="text-emerald-500 mt-0.5">Fix: {g.fix}</p>
            </div>
          ))}
        </div>
      )}

      {/* Terminal */}
      <TerminalLogStream logs={logs} />
    </div>
  );
}

function ParityCard({ label, score, icon: Icon }) {
  const pct = (score * 100).toFixed(1);
  const color = score >= 1 ? 'text-emerald-500' : score >= 0.7 ? 'text-amber-500' : 'text-rose-500';
  return (
    <div className="border rounded-lg p-3 bg-card border-border flex flex-col items-center">
      <Icon className={cn('w-4 h-4 mb-1', color)} />
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('text-xl font-heading', color)}>{pct}%</p>
    </div>
  );
}