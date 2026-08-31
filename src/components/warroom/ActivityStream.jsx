import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Loader2, Activity, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const levelIcon = {
  info: Info,
  success: CheckCircle2,
  warn: AlertTriangle,
  error: AlertCircle,
};

const levelColor = {
  info: 'text-sky-500',
  success: 'text-emerald-500',
  warn: 'text-amber-500',
  error: 'text-rose-500',
};

export default function ActivityStream() {
  const [logs, setLogs] = useState(null);
  const [live, setLive] = useState(false);
  const endRef = useRef(null);

  const load = async () => {
    const entries = await base44.entities.AgentLog.list('-created_date', 50).catch(() => []);
    setLogs(entries);
  };

  useEffect(() => {
    load();
    // Realtime subscription for live updates
    const unsubscribe = base44.entities.AgentLog.subscribe((event) => {
      if (event.type === 'create') {
        setLogs((prev) => {
          const next = [event.data, ...(prev || [])].slice(0, 50);
          return next;
        });
        setLive(true);
        setTimeout(() => setLive(false), 2000);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const fmtTime = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className={cn('w-4 h-4', live ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground')} />
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Live Activity Stream {live && <span className="text-emerald-500">· live</span>}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">{logs?.length || 0} events</span>
      </div>

      <div className="no-scrollbar max-h-[400px] overflow-y-auto space-y-1.5 pr-1">
        {logs === null && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        {logs?.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No agent activity yet.</p>}
        {logs?.map((log) => {
          const Icon = levelIcon[log.level] || Info;
          return (
            <div key={log.id} className="flex items-start gap-2.5 text-xs py-1.5 border-b border-border/30 last:border-0">
              <Icon className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', levelColor[log.level])} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{log.agent_name}</span>
                  {log.category && <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{log.category}</span>}
                  <span className="text-[10px] text-muted-foreground ml-auto">{fmtTime(log.created_date)}</span>
                </div>
                <p className="text-muted-foreground leading-relaxed mt-0.5">{log.message}</p>
                {log.detail && <p className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-2">{log.detail}</p>}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </Card>
  );
}