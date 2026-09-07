import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Search, AlertCircle, CheckCircle2, Clock, Zap } from 'lucide-react';

const CATEGORY_COLORS = {
  audit: 'text-red-400 bg-red-500/10',
  fix: 'text-orange-400 bg-orange-500/10',
  harden: 'text-amber-400 bg-amber-500/10',
  build: 'text-blue-400 bg-blue-500/10',
  optimize: 'text-cyan-400 bg-cyan-500/10',
  intelligence: 'text-violet-400 bg-violet-500/10',
  outreach: 'text-pink-400 bg-pink-500/10',
  comms: 'text-green-400 bg-green-500/10',
  monitoring: 'text-indigo-400 bg-indigo-500/10',
  documentation: 'text-stone-400 bg-stone-500/10',
  research: 'text-teal-400 bg-teal-500/10',
  deployment: 'text-sky-400 bg-sky-500/10',
  strategy: 'text-fuchsia-400 bg-fuchsia-500/10',
  evolution: 'text-purple-400 bg-purple-500/10',
  simulation: 'text-lime-400 bg-lime-500/10',
  financial: 'text-emerald-400 bg-emerald-500/10',
  security: 'text-rose-400 bg-rose-500/10',
  governance: 'text-yellow-400 bg-yellow-500/10',
  other: 'text-muted-foreground bg-muted/20'
};

const STATUS_BADGE = {
  active: { label: 'Active', cls: 'text-emerald-500' },
  paused: { label: 'Paused', cls: 'text-amber-500' },
  unassigned: { label: 'Unassigned', cls: 'text-red-500' },
  deprecated: { label: 'Deprecated', cls: 'text-muted-foreground' }
};

const LAST_STATUS = {
  success: { label: 'OK', cls: 'text-emerald-500' },
  failed: { label: 'FAIL', cls: 'text-red-500' },
  running: { label: 'RUN', cls: 'text-blue-500' },
  never: { label: '—', cls: 'text-muted-foreground/40' }
};

export default function TaskRegistryTable({ tasks, agents, onAssign }) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const categories = useMemo(() => {
    const set = new Set(tasks.map(t => t.category));
    return ['all', ...Array.from(set).sort()];
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filterCat !== 'all' && t.category !== filterCat) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.name?.toLowerCase().includes(q) ||
               t.task_type?.toLowerCase().includes(q) ||
               t.assigned_agent?.toLowerCase().includes(q) ||
               t.source_function?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tasks, search, filterCat, filterStatus]);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks, agents, functions..."
            className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-border bg-background"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="h-8 px-2 text-xs rounded-md border border-border bg-background"
        >
          {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-8 px-2 text-xs rounded-md border border-border bg-background"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="unassigned">Unassigned</option>
          <option value="paused">Paused</option>
          <option value="deprecated">Deprecated</option>
        </select>
        <span className="text-[10px] text-muted-foreground ml-auto">{filtered.length} of {tasks.length}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border/40">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 border-b border-border/40">
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 font-medium">Task</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Assigned Agent</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Trigger</th>
              <th className="px-3 py-2 font-medium text-right">Pay</th>
              <th className="px-3 py-2 font-medium">Last Run</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  No tasks found. Run "Seed Registry" to populate all system tasks.
                </td>
              </tr>
            )}
            {filtered.map(task => {
              const catColor = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.other;
              const statusMeta = STATUS_BADGE[task.status] || STATUS_BADGE.unassigned;
              const lastMeta = LAST_STATUS[task.last_status] || LAST_STATUS.never;
              return (
                <tr key={task.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-3 py-2">
                    <div className="font-medium">{task.name}</div>
                    <div className="text-[9px] text-muted-foreground font-mono">{task.task_type}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-medium', catColor)}>
                      {task.category}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {task.assigned_agent ? (
                      <span className="font-medium text-foreground">{task.assigned_agent}</span>
                    ) : (
                      <span className="text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    <div className="truncate max-w-[120px]">{task.source_page || '—'}</div>
                    {task.source_function && (
                      <div className="text-[9px] font-mono text-muted-foreground/60 truncate max-w-[120px]">{task.source_function}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] text-muted-foreground">{task.trigger_type || 'manual'}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {task.payment_amount > 0 ? (
                      <span className="text-violet-500 font-mono text-[10px]">{task.payment_amount} INF</span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className={cn('text-[10px] font-mono font-medium', lastMeta.cls)}>
                      {lastMeta.label}
                    </div>
                    {task.run_count > 0 && (
                      <div className="text-[9px] text-muted-foreground">{task.run_count} runs</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn('text-[10px] font-medium', statusMeta.cls)}>
                      {statusMeta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}