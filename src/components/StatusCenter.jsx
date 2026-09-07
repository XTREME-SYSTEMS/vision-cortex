import React, { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Activity, ChevronDown, AlertTriangle, TrendingUp, Rocket, Wrench, CheckCircle, Loader2, MessageCircle, Bot, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function StatusCenter() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('audit');
  const [data, setData] = useState({ opportunities: [], enhancements: [], projects: [], notifications: [], accounts: [], agentTasks: [] });
  const [resolving, setResolving] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const navigate = useNavigate();

  const load = async () => {
    try {
      const [opps, enh, projects, notifs, accounts, agentTasks] = await Promise.all([
        base44.entities.Opportunity.filter({ status: { $ne: 'closed' } }, '-score', 5).catch(() => []),
        base44.entities.SystemEnhancement.filter({ status: 'in_progress' }, '-updated_date', 5).catch(() => []),
        base44.entities.FactoryProject.filter({ stage: { $ne: 'deployed' } }, '-created_date', 5).catch(() => []),
        base44.entities.Notification.filter({ read: false }, '-created_date', 30).catch(() => []),
        base44.entities.ConnectedAccount.list('-created_date', 20).catch(() => []),
        base44.entities.AgentSchedule.filter({ status: { $in: ['in_progress', 'scheduled', 'completed'] } }, '-created_date', 30).catch(() => []),
      ]);
      setData({
        opportunities: opps || [],
        enhancements: enh || [],
        projects: projects || [],
        notifications: notifs || [],
        accounts: accounts || [],
        agentTasks: agentTasks || [],
      });
    } catch {}
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.Notification.subscribe(() => load());
    return unsub;
  }, []);

  const auditNotifs = data.notifications.filter(n => n.kind === 'gate');
  const topOpps = data.opportunities.filter(o => (o.score || 0) >= 50);
  const avgHealth = data.accounts.length > 0
    ? Math.round(data.accounts.reduce((s, a) => s + (a.health_score || 0), 0) / data.accounts.length)
    : 100;

  const inProgressTasks = data.agentTasks.filter(t => t.status === 'in_progress');
  const scheduledTasks = data.agentTasks.filter(t => t.status === 'scheduled');
  const completedTasks = data.agentTasks.filter(t => t.status === 'completed');

  const hasAttention = auditNotifs.length > 0;
  const statusLabel = hasAttention
    ? `${auditNotifs.length} item${auditNotifs.length > 1 ? 's' : ''} need your call`
    : inProgressTasks.length > 0
      ? `${inProgressTasks.length} agent${inProgressTasks.length > 1 ? 's' : ''} working`
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

  const tabs = [
    { id: 'audit', label: 'Needs My Call', icon: AlertTriangle, count: auditNotifs.length, color: 'text-amber-500' },
    { id: 'agents', label: 'Agent Activity', icon: Bot, count: inProgressTasks.length + scheduledTasks.length, color: 'text-blue-500' },
    { id: 'deals', label: 'Deals & Builds', icon: TrendingUp, count: topOpps.length + data.enhancements.length + data.projects.length, color: 'text-emerald-500' },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-4 py-2 border-b border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors w-full text-left">
          <span className={cn('w-2 h-2 rounded-full shrink-0', statusDot, hasAttention && 'animate-pulse')} />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Vision Cortex</span>
          <span className={cn('text-xs font-semibold', statusColor)}>{statusLabel}</span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            · {inProgressTasks.length} active · {scheduledTasks.length} queued · {auditNotifs.length} audit
          </span>
          <ChevronDown className={cn('w-3 h-3 text-muted-foreground ml-auto transition-transform shrink-0', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[440px] p-0" align="start">
        {/* Tab toggle */}
        <div className="flex border-b border-border/60">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = view === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-medium uppercase tracking-wider transition-colors border-b-2',
                  isActive ? cn(tab.color, 'border-current bg-current/5') : 'text-muted-foreground hover:text-foreground border-transparent'
                )}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn('ml-0.5 px-1.5 rounded-full text-[9px] font-bold', isActive ? cn('bg-current/15', tab.color) : 'bg-muted text-muted-foreground')}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="max-h-[480px] overflow-y-auto no-scrollbar">
          {/* ── AUDIT TAB ── */}
          {view === 'audit' && (
            <>
              {auditNotifs.length > 0 ? (
                <div className="p-3">
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
                </div>
              ) : (
                <div className="p-6 text-center">
                  <ShieldCheck className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                  <p className="text-[11px] text-muted-foreground">All audit items resolved. System is at 100%.</p>
                </div>
              )}
            </>
          )}

          {/* ── AGENTS TAB ── */}
          {view === 'agents' && (
            <div className="p-3 space-y-3">
              {inProgressTasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-blue-500">
                    <Activity className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold">Working Now</span>
                  </div>
                  <div className="space-y-1.5">
                    {inProgressTasks.map(t => (
                      <div key={t.id} className="bg-blue-500/5 border border-blue-500/20 rounded-lg px-2.5 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                          <span className="text-[11px] font-medium truncate flex-1">{t.task_title}</span>
                          <button
                            onClick={() => navigate(`/?agent=${encodeURIComponent(t.agent_name)}`)}
                            className="shrink-0 text-[10px] font-semibold bg-foreground text-background rounded-md px-2 py-0.5 hover:opacity-90 flex items-center gap-1"
                          >
                            <MessageCircle className="w-2.5 h-2.5" /> Chat
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="font-medium text-blue-500">{t.agent_name}</span>
                          <span className="capitalize">{t.task_category}</span>
                          {t.progress > 0 && <span className="ml-auto font-mono">{t.progress}%</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {scheduledTasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-muted-foreground">
                    <CheckCircle className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold">Queued ({scheduledTasks.length})</span>
                  </div>
                  <div className="space-y-1">
                    {scheduledTasks.slice(0, 8).map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                        <span className="flex-1 truncate">{t.task_title}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{t.agent_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {completedTasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-emerald-500">
                    <CheckCircle className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold">Recently Completed</span>
                  </div>
                  <div className="space-y-1">
                    {completedTasks.slice(0, 5).map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="flex-1 truncate">{t.task_title}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{t.agent_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inProgressTasks.length === 0 && scheduledTasks.length === 0 && completedTasks.length === 0 && (
                <div className="p-6 text-center">
                  <Bot className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-[11px] text-muted-foreground">No agent activity yet. Tasks will appear here as they're scheduled and executed.</p>
                </div>
              )}
            </div>
          )}

          {/* ── DEALS TAB ── */}
          {view === 'deals' && (
            <>
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

              {topOpps.length === 0 && data.enhancements.length === 0 && data.projects.length === 0 && (
                <div className="p-6 text-center">
                  <p className="text-[11px] text-muted-foreground">No active deals or builds right now.</p>
                </div>
              )}
            </>
          )}

          {/* System Health — always at bottom */}
          <div className="p-3 border-t border-border/40">
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