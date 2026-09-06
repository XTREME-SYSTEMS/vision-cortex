import React, { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Activity, ChevronDown, AlertTriangle, Mail, Heart, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function StatusCenter() {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [acc, notifs, sys] = await Promise.all([
        base44.entities.ConnectedAccount.list('-created_date', 20).catch(() => []),
        base44.entities.Notification.filter({ read: false }, '-created_date', 20).catch(() => []),
        base44.entities.SystemDNA_System.list('category', 10).catch(() => []),
      ]);
      setAccounts(acc || []);
      setNotifications(notifs || []);
      setSystems(sys || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.Notification.subscribe(() => load());
    return unsub;
  }, []);

  const connectedCount = accounts.filter(a => a.status === 'connected').length;
  const degradedCount = accounts.filter(a => a.status === 'degraded').length;
  const disconnectedCount = accounts.filter(a => a.status === 'disconnected').length;
  const avgHealth = accounts.length > 0
    ? Math.round(accounts.reduce((sum, a) => sum + (a.health_score || 0), 0) / accounts.length)
    : 0;

  const criticalNotifs = notifications.filter(n => n.severity === 'critical');
  const warnNotifs = notifications.filter(n => n.severity === 'warn');
  const unreadCount = notifications.length;

  const overallStatus = criticalNotifs.length > 0 || disconnectedCount > 0 ? 'critical'
    : degradedCount > 0 || warnNotifs.length > 0 ? 'degraded'
    : 'healthy';

  const statusConfig = {
    healthy: { dot: 'bg-emerald-500', label: 'All systems operational', color: 'text-emerald-500' },
    degraded: { dot: 'bg-amber-500', label: 'Degraded performance', color: 'text-amber-500' },
    critical: { dot: 'bg-rose-500', label: 'Attention required', color: 'text-rose-500' },
  };
  const status = statusConfig[overallStatus];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-4 py-2 border-b border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors w-full text-left">
          <span className={cn('w-2 h-2 rounded-full shrink-0', status.dot, overallStatus !== 'healthy' && 'animate-pulse')} />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</span>
          <span className={cn('text-xs font-semibold', status.color)}>{status.label}</span>
          {unreadCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground text-background font-semibold">{unreadCount}</span>
          )}
          <span className="text-[10px] text-muted-foreground hidden sm:inline ml-1">Health {avgHealth}%</span>
          <ChevronDown className={cn('w-3 h-3 text-muted-foreground ml-auto transition-transform shrink-0', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <div className="max-h-[480px] overflow-y-auto no-scrollbar">
          {/* System Status */}
          <div className="p-3 border-b border-border/40">
            <div className="flex items-center gap-1.5 mb-2 text-foreground">
              <Activity className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">System Status</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/40 rounded-lg px-2 py-1.5 text-center">
                <p className={cn('text-sm font-bold tabular-nums', avgHealth >= 70 ? 'text-emerald-500' : avgHealth >= 50 ? 'text-amber-500' : 'text-rose-500')}>{avgHealth}%</p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Health</p>
              </div>
              <div className="bg-muted/40 rounded-lg px-2 py-1.5 text-center">
                <p className="text-sm font-bold tabular-nums text-emerald-500">{connectedCount}</p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Connected</p>
              </div>
              <div className="bg-muted/40 rounded-lg px-2 py-1.5 text-center">
                <p className={cn('text-sm font-bold tabular-nums', (degradedCount + disconnectedCount) > 0 ? 'text-amber-500' : 'text-emerald-500')}>{degradedCount + disconnectedCount}</p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Issues</p>
              </div>
            </div>
          </div>

          {/* Connected Accounts */}
          {accounts.length > 0 && (
            <div className="p-3 border-b border-border/40">
              <div className="flex items-center gap-1.5 mb-2 text-foreground">
                <Heart className="w-3 h-3" />
                <span className="text-[10px] uppercase tracking-wider font-semibold">Connected Accounts</span>
              </div>
              <div className="space-y-1">
                {accounts.slice(0, 6).map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-[11px]">
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                      a.status === 'connected' ? 'bg-emerald-500' :
                      a.status === 'degraded' ? 'bg-amber-500' :
                      a.status === 'disconnected' ? 'bg-rose-500' : 'bg-muted-foreground')} />
                    <span className="flex-1 truncate">{a.name}</span>
                    <span className="text-muted-foreground tabular-nums">{a.health_score || 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attention Required */}
          {criticalNotifs.length > 0 && (
            <div className="p-3 border-b border-border/40">
              <div className="flex items-center gap-1.5 mb-2 text-rose-500">
                <AlertTriangle className="w-3 h-3" />
                <span className="text-[10px] uppercase tracking-wider font-semibold">Attention Required</span>
              </div>
              <div className="space-y-1.5">
                {criticalNotifs.slice(0, 5).map(n => (
                  <div key={n.id} className="text-[11px] bg-rose-500/5 border border-rose-500/20 rounded-lg px-2 py-1.5">
                    <p className="font-semibold text-rose-500">{n.title}</p>
                    {n.body && <p className="text-muted-foreground">{n.body}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inbox / Messages */}
          <div className="p-3">
            <div className="flex items-center gap-1.5 mb-2 text-foreground">
              <Mail className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">{unreadCount > 0 ? `Inbox (${unreadCount})` : 'Inbox'}</span>
            </div>
            {notifications.length === 0 ? (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground italic">
                <CheckCircle className="w-3 h-3 text-emerald-500" /> No new messages
              </div>
            ) : (
              <div className="space-y-1.5">
                {notifications.slice(0, 8).map(n => (
                  <div key={n.id} className="flex items-start gap-2 text-[11px]">
                    <span className={cn('w-1.5 h-1.5 rounded-full mt-1 shrink-0',
                      n.severity === 'critical' ? 'bg-rose-500' :
                      n.severity === 'warn' ? 'bg-amber-500' : 'bg-sky-500')} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{n.title}</p>
                      {n.body && <p className="text-muted-foreground truncate">{n.body}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}