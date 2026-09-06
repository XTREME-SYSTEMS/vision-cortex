import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Brain, Cloud, RefreshCw, ArrowRight, ArrowLeft, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BrainLinkPanel() {
  const [brainStatus, setBrainStatus] = useState(null);
  const [engineStatus, setEngineStatus] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [brain, engine, logs, cmds] = await Promise.all([
        base44.functions.invoke('testBrainConnection', {}).then((r) => r.data).catch(() => null),
        base44.functions.invoke('cloudBrowserHealth', {}).then((r) => r.data).catch(() => null),
        base44.entities.BrainSyncLog.list('-created_date', 10).catch(() => []),
        base44.entities.BrainCommand.list('-received_at', 10).catch(() => []),
      ]);
      setBrainStatus(brain);
      setEngineStatus(engine);
      setSyncLogs(logs);
      setCommands(cmds);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pushToBrain = async () => {
    setPushing(true);
    try {
      await base44.functions.invoke('syncToBrain', { mode: 'push', limit: 25, min_impact: 60 });
      load();
    } catch (e) { console.error(e); }
    setPushing(false);
  };

  const processCommands = async () => {
    setProcessing(true);
    try {
      await base44.functions.invoke('processBrainCommands', {});
      load();
    } catch (e) { console.error(e); }
    setProcessing(false);
  };

  const brainConnected = brainStatus?.status === 'connected';
  const brainKeyMismatch = brainStatus?.status === 'key_mismatch';
  const engineHealthy = engineStatus?.status === 'healthy';

  return (
    <div className="space-y-4">
      {/* Architecture header */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/30">
        <div className="flex items-center gap-2">
          <Cloud className={cn('w-5 h-5', engineHealthy ? 'text-emerald-500' : 'text-rose-500')} />
          <div>
            <div className="text-xs font-medium">V-2 · Eyes (this app)</div>
            <div className="text-[10px] text-muted-foreground">Cloud Browser + Intelligence</div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground">
          <ArrowRight className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-wider">bi-directional sync</span>
          <ArrowLeft className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2">
          <Brain className={cn('w-5 h-5', brainConnected ? 'text-emerald-500' : brainKeyMismatch ? 'text-rose-500' : 'text-amber-500')} />
          <div>
            <div className="text-xs font-medium">V-1 · Brain</div>
            <div className="text-[10px] text-muted-foreground">thevisioncortex.com</div>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="ml-2 p-1.5 rounded-md hover:bg-muted transition-colors">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Cloud Browser Engine */}
        <div className={cn('rounded-lg border p-3', engineHealthy ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5')}>
          <div className="flex items-center gap-2 mb-1.5">
            <Cloud className="w-4 h-4" />
            <span className="text-xs font-medium">Cloud Browser Engine</span>
            {engineHealthy
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
              : <XCircle className="w-3.5 h-3.5 text-rose-500 ml-auto" />}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {engineStatus?.engine_url || 'Not configured'}
          </div>
          <div className={cn('text-[10px] mt-1', engineHealthy ? 'text-emerald-600' : 'text-rose-600')}>
            {engineHealthy
              ? `Healthy · sessions ${engineStatus.session_test?.status === 'ok' ? 'OK' : 'failed'}`
              : engineStatus?.engines?.[0]?.status === 'down'
                ? 'Down — Railway app not found (404). Redeploy needed.'
                : engineStatus?.engines?.[0]?.status === 'unreachable'
                  ? 'Unreachable — network error'
                  : 'Not configured'}
          </div>
        </div>

        {/* Brain Connection */}
        <div className={cn('rounded-lg border p-3',
          brainConnected ? 'border-emerald-500/30 bg-emerald-500/5'
          : brainKeyMismatch ? 'border-rose-500/30 bg-rose-500/5'
          : 'border-amber-500/30 bg-amber-500/5')}>
          <div className="flex items-center gap-2 mb-1.5">
            <Brain className="w-4 h-4" />
            <span className="text-xs font-medium">Brain Connection</span>
            {brainConnected
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
              : <AlertCircle className="w-3.5 h-3.5 text-rose-500 ml-auto" />}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {brainStatus?.brain_url || 'Not configured'}
          </div>
          <div className={cn('text-[10px] mt-1',
            brainConnected ? 'text-emerald-600'
            : brainKeyMismatch ? 'text-rose-600'
            : 'text-amber-600')}>
            {brainConnected
              ? 'Connected · keys match'
              : brainKeyMismatch
                ? 'Reachable but API key rejected (401) — keys must match Brain'
                : brainStatus?.checks?.brain_reachable
                  ? 'Reachable but keys may not match'
                  : brainStatus?.checks?.brain_url_set
                    ? 'Not reachable — Brain offline'
                    : 'Not configured'}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={pushToBrain}
          disabled={pushing || !brainConnected}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {pushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          Push Intel to Brain
        </button>
        <button
          onClick={processCommands}
          disabled={processing || commands.filter((c) => c.status === 'pending').length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
        >
          {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowLeft className="w-3.5 h-3.5" />}
          Process Brain Commands ({commands.filter((c) => c.status === 'pending').length})
        </button>
      </div>

      {/* Sync logs */}
      {syncLogs.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Recent Sync Activity</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {syncLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-2 text-[11px] py-1 border-b border-border/30">
                {log.direction === 'eyes_to_brain'
                  ? <ArrowRight className="w-3 h-3 text-blue-500 shrink-0" />
                  : <ArrowLeft className="w-3 h-3 text-purple-500 shrink-0" />}
                <span className="text-muted-foreground w-28 truncate">{log.operation}</span>
                <span className={cn('w-2 h-2 rounded-full shrink-0', log.status === 'success' ? 'bg-emerald-500' : log.status === 'failed' ? 'bg-rose-500' : 'bg-amber-500')} />
                <span className="flex-1 truncate text-muted-foreground">{log.details}</span>
                {log.items_count > 0 && <span className="text-muted-foreground/60">{log.items_count} items</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending commands */}
      {commands.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Brain Commands</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {commands.map((cmd) => (
              <div key={cmd.id} className="flex items-center gap-2 text-[11px] py-1 border-b border-border/30">
                <span className="font-mono text-[10px] text-purple-500 w-32 truncate">{cmd.command_type}</span>
                <span className={cn('w-2 h-2 rounded-full shrink-0',
                  cmd.status === 'completed' ? 'bg-emerald-500' :
                  cmd.status === 'failed' ? 'bg-rose-500' :
                  cmd.status === 'processing' ? 'bg-blue-500' : 'bg-amber-500')} />
                <span className="flex-1 truncate text-muted-foreground">{cmd.result || cmd.payload?.url || cmd.payload?.domain || 'pending'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}