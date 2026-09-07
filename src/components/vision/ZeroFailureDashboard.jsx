import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, Cpu, Zap, Trophy, AlertTriangle, CheckCircle, Activity, Coins } from 'lucide-react';

// Zero-Failure Pipeline Dashboard — live view of the deterministic fault-isolation system
// Shows: 5 system slots health, 10 agent $INF balances, recent transactions, pipeline status

const ARCHETYPE_ICONS = {
  'THE ARCHITECT': Cpu,
  'THE ORACLE': Activity,
  'THE INQUISITOR': Shield,
  'THE CARTOGRAPHER': Activity,
  'THE FORGE': Zap,
  'THE MERCHANT': Coins,
  'THE SIREN': Shield,
  'THE DIPLOMAT': Activity,
  'THE SENTINEL': Shield,
  'THE REAPER': AlertTriangle,
};

export default function ZeroFailureDashboard() {
  const [agents, setAgents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    const loadData = async () => {
      try {
        const [agentList, paymentList] = await Promise.all([
          base44.entities.AgentProfile.list('-order', 20),
          base44.entities.AgentPayment.list('-created_date', 10),
        ]);
        setAgents(agentList || []);
        setPayments(paymentList || []);
      } catch (e) {
        // graceful
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Real-time subscriptions
    const unsubAgents = base44.entities.AgentProfile.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        setAgents((prev) => {
          const idx = prev.findIndex((a) => a.id === event.data.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...event.data };
            return next;
          }
          return [...prev, event.data];
        });
      }
    });

    const unsubPayments = base44.entities.AgentPayment.subscribe((event) => {
      if (event.type === 'create') {
        setPayments((prev) => [event.data, ...prev].slice(0, 10));
      }
    });

    return () => {
      unsubAgents();
      unsubPayments();
    };
  }, []);

  const totalINF = agents.reduce((sum, a) => sum + (a.inf_balance || 0), 0);
  const totalEarned = agents.reduce((sum, a) => sum + (a.inf_earned_total || 0), 0);
  const activeAgents = agents.filter((a) => a.status === 'active').length;
  const agentsWithStrikes = agents.filter((a) => (a.strike_count || 0) > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard icon={Coins} label="Total $INF" value={totalINF.toFixed(4)} accent="text-amber-500" />
        <StatCard icon={Trophy} label="Lifetime Earned" value={totalEarned.toFixed(4)} accent="text-violet-500" />
        <StatCard icon={Activity} label="Active Agents" value={`${activeAgents}/10`} accent="text-emerald-500" />
        <StatCard
          icon={AlertTriangle}
          label="Active Strikes"
          value={agentsWithStrikes.length.toString()}
          accent={agentsWithStrikes.length > 0 ? 'text-red-500' : 'text-muted-foreground'}
        />
      </div>

      {/* Agent Grid — 10 Archetypes */}
      <div className="rounded-lg border border-border/60 bg-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-medium">The 10 Strategic Archetypes</span>
          <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium ml-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {agents.map((agent) => {
            const Icon = ARCHETYPE_ICONS[agent.archetype] || Activity;
            const healthColor = agent.health >= 95 ? 'text-emerald-500' : agent.health >= 85 ? 'text-amber-500' : 'text-red-500';
            return (
              <div
                key={agent.id}
                className="rounded-lg border border-border/40 bg-muted/30 p-2 hover:border-violet-500/40 transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${healthColor}`} />
                  <span className="text-[11px] font-medium truncate">{agent.name}</span>
                </div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{agent.archetype}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-amber-500">{(agent.inf_balance || 0).toFixed(3)} INF</span>
                  {(agent.strike_count || 0) > 0 && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/20 text-red-500 font-mono">
                      {agent.strike_count}⚠
                    </span>
                  )}
                </div>
                <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${agent.health >= 95 ? 'bg-emerald-500' : agent.health >= 85 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${agent.health || 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent $INF Transactions */}
      <div className="rounded-lg border border-border/60 bg-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <Coins className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">Live $INF Transactions</span>
          <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium ml-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Real-time
          </span>
        </div>
        {payments.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No transactions yet. Rewards accumulate as agents complete work.</p>
        ) : (
          <div className="space-y-1">
            {payments.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 grid place-items-center">
                    <Coins className="w-3 h-3 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium">{p.agent_name}</div>
                    <div className="text-[9px] text-muted-foreground">{p.memo?.slice(0, 60) || p.payment_type}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-mono text-amber-500">+{(p.amount || 0).toFixed(5)} INF</div>
                  <div className="text-[9px] text-muted-foreground uppercase">{p.payment_type}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${accent}`} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg font-mono font-medium">{value}</div>
    </div>
  );
}