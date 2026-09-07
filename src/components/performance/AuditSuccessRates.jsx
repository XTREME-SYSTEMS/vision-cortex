import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AuditSuccessRates() {
  const [logs, setLogs] = useState(null);
  const [agents, setAgents] = useState(null);

  useEffect(() => {
    const load = async () => {
      const [l, a] = await Promise.all([
        base44.entities.AgentLog.list('-created_date', 200).catch(() => []),
        base44.entities.AgentProfile.list('order', 50).catch(() => []),
      ]);
      setLogs(l || []);
      setAgents(a || []);
    };
    load();
    const unsub = base44.entities.AgentLog.subscribe(() => load());
    return unsub;
  }, []);

  const auditStats = useMemo(() => {
    if (!logs || !agents) return [];
    const auditLogs = logs.filter(l =>
      l.auto_action?.includes('audit') ||
      l.message?.toLowerCase().includes('audit') ||
      l.agent_name?.includes('Inquisitor') ||
      l.agent_name?.includes('Sentinel')
    );

    return agents.map(agent => {
      const agentAuditLogs = auditLogs.filter(l => l.agent_name === agent.name);
      const success = agentAuditLogs.filter(l => l.level === 'success').length;
      const errors = agentAuditLogs.filter(l => l.level === 'error').length;
      const total = agentAuditLogs.length || 1;
      return {
        name: agent.name,
        archetype: agent.archetype || '',
        successRate: Math.round((success / total) * 100),
        total: agentAuditLogs.length,
        errors,
      };
    }).filter(a => a.total > 0);
  }, [logs, agents]);

  if (auditStats.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-red-400" />
        <h3 className="text-sm font-medium">Audit Success Rates</h3>
        <span className="text-xs text-muted-foreground ml-auto">{auditStats.length} agents with audit activity</span>
      </div>
      <div className="rounded-xl border border-border/40 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Agent</th>
              <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Archetype</th>
              <th className="text-center px-3 py-2 font-medium">Audit Runs</th>
              <th className="text-center px-3 py-2 font-medium">Success Rate</th>
              <th className="text-center px-3 py-2 font-medium">Errors</th>
            </tr>
          </thead>
          <tbody>
            {auditStats.map(a => (
              <tr key={a.name} className="border-t border-border/30 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{a.name}</td>
                <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{a.archetype}</td>
                <td className="px-3 py-2 text-center">{a.total}</td>
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-12 h-1 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className={cn('h-full transition-all', a.successRate >= 80 ? 'bg-emerald-500' : a.successRate >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                        style={{ width: `${a.successRate}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono">{a.successRate}%</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  {a.errors > 0 ? <span className="text-red-400">{a.errors}</span> : <span className="text-muted-foreground">0</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}