import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Server, Activity, Zap, AlertTriangle, CheckCircle, XCircle, RotateCw, Globe, Clock } from 'lucide-react';

export default function EngineCard({ engine, onAction, acting }) {
  const statusConfig = {
    healthy: { color: 'text-emerald-500', bg: 'bg-emerald-500/5', border: 'border-emerald-500/30', icon: CheckCircle, dot: 'bg-emerald-500' },
    degraded: { color: 'text-amber-500', bg: 'bg-amber-500/5', border: 'border-amber-500/30', icon: AlertTriangle, dot: 'bg-amber-500' },
    critical: { color: 'text-orange-500', bg: 'bg-orange-500/5', border: 'border-orange-500/30', icon: AlertTriangle, dot: 'bg-orange-500' },
    offline: { color: 'text-rose-500', bg: 'bg-rose-500/5', border: 'border-rose-500/30', icon: XCircle, dot: 'bg-rose-500' },
    restarting: { color: 'text-blue-500', bg: 'bg-blue-500/5', border: 'border-blue-500/30', icon: RotateCw, dot: 'bg-blue-500' },
  };
  const cfg = statusConfig[engine.status] || statusConfig.offline;
  const StatusIcon = cfg.icon;
  const isPrimary = engine.role === 'primary';

  return (
    <Card className={cn('p-4 border', cfg.border, cfg.bg)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot, engine.status === 'restarting' && 'animate-pulse')} />
          <div>
            <p className="text-sm font-medium leading-tight">{engine.name}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{engine.engine_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isPrimary && <Badge className="text-[9px] px-1.5 py-0 bg-foreground text-background">PRIMARY</Badge>}
          <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 capitalize', cfg.color)}>
            <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
            {engine.status}
          </Badge>
        </div>
      </div>

      {/* Health bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Health</span>
          <span className={cn('text-lg font-bold', cfg.color)}>{engine.health_score || 0}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', cfg.dot)}
            style={{ width: `${engine.health_score || 0}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <Activity className="w-3 h-3 text-muted-foreground mx-auto mb-0.5" />
          <p className="text-[10px] font-mono font-bold">{engine.total_requests || 0}</p>
          <p className="text-[8px] text-muted-foreground uppercase">Requests</p>
        </div>
        <div className="text-center">
          <Zap className="w-3 h-3 text-muted-foreground mx-auto mb-0.5" />
          <p className="text-[10px] font-mono font-bold">{engine.success_rate || 0}%</p>
          <p className="text-[8px] text-muted-foreground uppercase">Success</p>
        </div>
        <div className="text-center">
          <Clock className="w-3 h-3 text-muted-foreground mx-auto mb-0.5" />
          <p className="text-[10px] font-mono font-bold">{engine.avg_latency_ms ? `${engine.avg_latency_ms}ms` : '—'}</p>
          <p className="text-[8px] text-muted-foreground uppercase">Latency</p>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-3">
        <Globe className="w-3 h-3 shrink-0" />
        <span className="capitalize">{engine.provider}</span>
        <span>·</span>
        <span>{engine.region || '—'}</span>
        <span>·</span>
        <span>P{engine.priority}</span>
        {engine.capabilities_count !== undefined && (
          <>
            <span>·</span>
            <span>{engine.capabilities_count} caps</span>
          </>
        )}
      </div>

      {/* Failures + restarts */}
      {(engine.consecutive_failures > 0 || engine.restart_count > 0) && (
        <div className="flex items-center gap-3 text-[10px] mb-3">
          {engine.consecutive_failures > 0 && (
            <span className="text-rose-500 flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" />
              {engine.consecutive_failures} consecutive failures
            </span>
          )}
          {engine.restart_count > 0 && (
            <span className="text-blue-500 flex items-center gap-1">
              <RotateCw className="w-2.5 h-2.5" />
              {engine.restart_count} restarts
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {!isPrimary && engine.status === 'healthy' && (
          <button
            onClick={() => onAction('failover', { promote_engine_id: engine.engine_id })}
            disabled={acting}
            className="text-[10px] font-medium px-2 py-1 rounded border border-border/60 hover:bg-muted transition-colors"
          >
            Promote to Primary
          </button>
        )}
        <button
          onClick={() => onAction('scan_capabilities', { engine_id: engine.engine_id })}
          disabled={acting}
          className="text-[10px] font-medium px-2 py-1 rounded border border-border/60 hover:bg-muted transition-colors"
        >
          Scan Caps
        </button>
        <button
          onClick={() => onAction('remove', { engine_id: engine.engine_id })}
          disabled={acting}
          className="text-[10px] font-medium px-2 py-1 rounded border border-rose-500/30 text-rose-500 hover:bg-rose-500/5 transition-colors ml-auto"
        >
          Remove
        </button>
      </div>
    </Card>
  );
}