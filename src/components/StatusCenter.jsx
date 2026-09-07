import React, { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Activity, ChevronDown, AlertTriangle, TrendingUp, Rocket, Wrench, CheckCircle, Zap, Loader2, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function StatusCenter() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ opportunities: [], enhancements: [], projects: [], notifications: [], accounts: [] });
  const [resolving, setResolving] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const navigate = useNavigate();

  const load = async () => {
    try {
      const [opps, enh, projects, notifs, accounts] = await Promise.all([
        base44.entities.Opportunity.filter({ status: { $ne: 'closed' } }, '-score', 5).catch(() => []),
        base44.entities.SystemEnhancement.filter({ status: 'in_progress' }, '-updated_date', 5).catch(() => []),
        base44.entities.FactoryProject.filter({ stage: { $ne: 'deployed' } }, '-created_date', 5).catch(() => []),
        base44.entities.Notification.filter({ read: false }, '-created_date', 10).catch(() => []),
        base44.entities.ConnectedAccount.list('-created_date', 20).catch(() => []),
      ]);
      setData({
        opportunities: opps || [],
        enhancements: enh || [],
        projects: projects || [],
        notifications: notifs || [],
        accounts: accounts || [],
      });
    } catch {}
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.Notification.subscribe(() => load());
    return unsub;
  }, []);

  const auditNotifs = data.notifications.filter(n => n.kind === 'gate');
  const criticalNotifs = auditNotifs.filter(n => n.severity === 'critical');
  const topOpps = data.opportunities.filter(o => (o.score || 0) >= 50);
  const avgHealth = data.accounts.length > 0
    ? Math.round(data.accounts.reduce((s, a) => s + (a.health_score || 0), 0) / data.accounts.length)
    : 100;

  const hasAttention = auditNotifs.length > 0;
  const statusLabel = hasAttention
    ? `${auditNotifs.length} item${auditNotifs.length > 1 ? 's' : ''} need your call`
    : topOpps.length > 0
      ? `${topOpps.length} deal${topOpps.length > 1 ? 's' : ''} in motion`
      : 'All systems managed';
  const statusColor = hasAttention ? 'text-amber-500' : 'text-emerald-500';
  const statusDot = hasAttention ? 'bg-amber-500' : 'bg-emerald-500';

  const resolveNotification = async (id) => {
    setResolving(id);
    try {
      await base44.entities.Notification.update(id, { read: true });
      load();
    } finally {
      setResolving(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-4 py-2 border-b border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors w-full text-left">
          <span className={cn('w-2 h-2 rounded-full shrink-0', statusDot, hasAttention && 'animate-pulse')} />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Vision Cortex</span>
          <span className={cn('text-xs font-semibold', statusColor)}>{statusLabel}</span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            · {data.enhancements.length} building · {data.projects.length} apps · {topOpps.length} deals
          </span>
          <ChevronDown className={cn('w-3 h-3 text-muted-foreground ml-auto transition-transform shrink-0', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[440px] p-0" align="start">
        <div className="max-h-[520px] overflow-y-auto no-scrollbar">
          {/* Deals & Opportunities */}
          {topOpps.length > 0 && (
            <Section icon={TrendingUp} label="Deals & Opportunities" color="text-emerald-500">
              <div className="space-y-2">
                {topOpps.map(o => (
                  <div key={o.id} className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-2.5 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold text-emerald-500">{Math.round(o.score || 0)}% success</span>
                      {o.budget && <span className="text-[10px] text-muted-foreground">· {o.budget}</span>}
                      <span className="text-[10px] text-muted-foreground ml-auto capitalize">{o.status}</span>
                    </div>
                    <p className="text-[11px] font-medium leading-snug">{o.title}</p>
                    {o.research?.estimated_value && <p className="text-[10px] text-muted-foreground mt-0.5">Est. value: {o.research.estimated_value}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Visions Being Built */}
          {data.enhancements.length > 0 && (
            <Section icon={Wrench} label="Visions Being Built" color="text-sky-500">
              <div className="space-y-1">
                {data.enhancements.map(e => (
                  <div key={e.id} className="flex items-center gap-2 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                    <span className="flex-1 truncate">{e.title}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{e.status?.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Apps Being Made */}
          {data.projects.length > 0 && (
            <Section icon={Rocket} label="Apps Being Made" color="text-violet-500">
              <div className="space-y-1">
                {data.projects.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                    <span className="flex-1 truncate">{p.business_name || p.industry}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{p.stage?.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Items That Need Your Call — persistent audit & self-reflection results */}
          {auditNotifs.length > 0 && (
            <Section icon={AlertTriangle} label="Items That Need Your Call" color="text-amber-500">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => selected.size === auditNotifs.length ? setSelected(new Set()) : setSelected(new Set(auditNotifs.map(n => n.id)))}
                  className="text-[10px] text-muted-foreground hover:text-foreground font-medium"
                >
                  {selected.size === auditNotifs.length && auditNotifs.length > 0 ? 'Deselect all' : 'Select all'}
                </button>
                {selected.size > 0 && (
                  <button
                    onClick={async () => {
                      for (const id of selected) {
                        try { await base44.entities.Notification.update(id, { read: true }); } catch {}
                      }
                      setSelected(new Set());
                      load();
                    }}
                    className="text-[10px] font-semibold text-amber-500 hover:text-amber-400"
                  >
                    Resolve selected ({selected.size})
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {auditNotifs.map(n => {
                  const agent = n.body?.match(/Agent:\s*(.+)/)?.[1]?.trim() || 'Prime';
                  const problem = n.body?.split('\n')[0]?.replace('Problem: ', '') || 'Detected by autonomous audit';
                  const isSelected = selected.has(n.id);
                  return (
                    <div key={n.id} className={`bg-amber-500/5 border rounded-lg px-2.5 py-2 ${isSelected ? 'border-amber-500' : 'border-amber-500/20'}`}>
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => setSelected(prev => {
                            const next = new Set(prev);
                            if (next.has(n.id)) next.delete(n.id);
                            else next.add(n.id);
                            return next;
                          })}
                          className="mt-0.5 shrink-0"
                        >
                          <span className={`block w-3.5 h-3.5 rounded border flex items-center justify-center ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-muted-foreground/40'}`}>
                            {isSelected && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                          </span>
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-amber-500 mb-1">{n.title}</p>
                          <p className="text-[10px] text-muted-foreground mb-0.5">{problem}</p>
                          <p className="text-[10px]"><span className="text-muted-foreground font-medium">Agent:</span> {agent}</p>
                        </div>
                        <button
                          onClick={() => navigate(`/?agent=${encodeURIComponent(agent)}`)}
                          className="shrink-0 text-[10px] font-semibold bg-foreground text-background rounded-md px-2 py-1 hover:opacity-90 transition-opacity flex items-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" /> Chat
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* System Health — managed */}
          <div className="p-3">
            <div className="flex items-center gap-1.5 mb-2 text-foreground">
              <Activity className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">System Health</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-[11px] text-muted-foreground">
                {data.accounts.length} systems managed · {avgHealth}% health · auto-healing active
              </span>
            </div>
          </div>

          {/* Empty positive state */}
          {topOpps.length === 0 && data.enhancements.length === 0 && data.projects.length === 0 && auditNotifs.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-[11px] text-muted-foreground italic">Everything is handled. Your system is 10 steps ahead.</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Section({ icon: Icon, label, color, children }) {
  return (
    <div className="p-3 border-b border-border/40 last:border-0">
      <div className={cn('flex items-center gap-1.5 mb-2', color)}>
        <Icon className="w-3 h-3" />
        <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      {children}
    </div>
  );
}