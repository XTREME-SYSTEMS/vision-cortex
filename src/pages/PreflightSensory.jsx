import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Activity, Shield, Zap, Trophy, AlertTriangle, CheckCircle, Clock, Lock, Unlock } from 'lucide-react';

export default function PreflightSensory() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const result = await base44.functions.invoke('preflightSensory', {});
      setData(result);
    } catch (e) {
      console.error('Failed to load preflight data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading pre-flight sensory data...</div>;
  }

  const agents = data?.agents || [];
  const timeclock = data?.timeclock || [];
  const tasks = data?.tasks || [];
  const roadmap = data?.roadmap || [];
  const ledger = data?.ledger || [];
  const validations = data?.validations || [];
  const integrityScore = data?.integrity_score || 0.68;

  return (
    <div className="p-4 md:p-6 bg-slate-950 text-slate-100 font-mono rounded-xl border border-slate-800 shadow-2xl max-w-6xl mx-auto my-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-emerald-400">⚡ XTREME SYSTEMS CORTEX INTERFACE</h1>
          <p className="text-xs text-slate-400 mt-1">Autonomous 24/7 Deep Architecture Validation Suite</p>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase tracking-widest text-slate-500">Global Metric Integrity</span>
          <div className={cn('text-2xl font-black mt-1', integrityScore > 0.90 ? 'text-emerald-400' : 'text-amber-400')}>
            {(integrityScore * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Activity} label="Total Tasks" value={data?.total_tasks || 0} color="text-blue-400" />
        <StatCard icon={CheckCircle} label="Completed" value={data?.completed_tasks || 0} color="text-emerald-400" />
        <StatCard icon={Shield} label="Verified" value={data?.verified_tasks || 0} color="text-violet-400" />
        <StatCard icon={Zap} label="INF Disbursed" value={(data?.total_inf_disbursed || 0).toFixed(2)} color="text-amber-400" />
      </div>

      {/* Agent Roster + Timeclock */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Agent Roster */}
        <div className="md:col-span-2 bg-slate-900 p-4 rounded-lg border border-slate-800">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">🛡️ Agent Archetype Deployment State</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {agents.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-4">No agent profiles in Supabase yet.</p>
            ) : (
              agents.map((agent) => (
                <div key={agent.id || agent.slot_id} className="p-3 bg-slate-950 rounded border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold text-slate-200">Slot {agent.slot_id} : {agent.agent_name}</div>
                    <div className="text-[10px] text-slate-500 font-semibold tracking-wider mt-1">{agent.archetype}</div>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      'inline-block px-2 py-0.5 text-[9px] font-black rounded',
                      agent.current_status === 'IDLE' ? 'bg-slate-800 text-slate-400'
                      : agent.current_status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 animate-pulse'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                    )}>
                      {agent.current_status || 'IDLE'}
                    </span>
                    <div className="text-[10px] text-red-400 font-bold mt-1">Strikes: {agent.strike_count || 0}/3</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Timeclock */}
        <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">💰 Live Ledger Payout Registry</h2>
          <div className="space-y-3">
            {timeclock.length === 0 ? (
              <div className="text-xs text-slate-600 text-center py-8">Awaiting initial queue tracking transactions...</div>
            ) : (
              timeclock.map((log) => (
                <div key={log.clock_id} className="p-2.5 bg-slate-950 rounded border border-slate-800 text-[11px] leading-relaxed">
                  <div className="flex justify-between font-bold text-slate-400">
                    <span>Slot {log.slot_id} → Signed Off</span>
                    <span className="text-emerald-400">O: {log.execution_depth_bytes || 'N/A'}</span>
                  </div>
                  <div className="text-slate-500 font-semibold mt-1 truncate">Action: {log.action_signature}</div>
                  <div className="text-[9px] text-slate-600 mt-1 flex justify-between">
                    <span>Latency: {log.processing_latency_ms}ms</span>
                    <span>Q: {log.accuracy_rating} | C: {log.stability_coefficient}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Ledger */}
      {ledger.length > 0 && (
        <div className="mt-6 bg-slate-900 p-4 rounded-lg border border-slate-800">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">⚡ Recent $INF Transactions</h2>
          <div className="space-y-1.5">
            {ledger.slice(0, 5).map((entry) => (
              <div key={entry.transaction_id} className="flex items-center gap-3 text-[11px] p-2 bg-slate-950 rounded border border-slate-800">
                <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="text-slate-400 font-bold">{entry.sender_wallet} → {entry.receiver_wallet}</span>
                <span className="text-emerald-400 font-bold ml-auto">{parseFloat(entry.amount_inf || 0).toFixed(4)} INF</span>
                <span className="text-slate-600 text-[9px]">O:{entry.metric_output} T:{entry.metric_latency} Q:{entry.metric_quality} C:{entry.metric_stability}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roadmap */}
      {roadmap.length > 0 && (
        <div className="mt-6 bg-slate-900 p-4 rounded-lg border border-slate-800">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">🏁 20-Year Metasystem Roadmap</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {roadmap.map((phase) => (
              <div key={phase.phase_id} className={cn('p-3 rounded border', phase.is_unlocked ? 'bg-emerald-950 border-emerald-800' : 'bg-slate-950 border-slate-800')}>
                <div className="flex items-center gap-1.5 mb-1">
                  {phase.is_unlocked ? <Unlock className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-slate-600" />}
                  <div className="text-[10px] font-bold text-slate-300">{phase.phase_name}</div>
                </div>
                <div className="text-[9px] text-slate-500 leading-snug">{phase.strategic_objective}</div>
                <div className={cn('text-[9px] font-bold mt-2', phase.is_unlocked ? 'text-emerald-400' : 'text-slate-600')}>
                  {phase.is_unlocked ? '✓ UNLOCKED' : '🔒 LOCKED'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 p-3 bg-slate-900 rounded-lg border border-slate-800 text-center flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block animate-ping"></span>
          <span className="text-slate-400">Watchdog Loop Active: Monitoring DeepRun structures 24/7</span>
        </div>
        <div className="text-slate-500 font-bold">Ecosystem State: {data?.ecosystem_state || 'NOMINAL'}</div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn('w-3 h-3', color)} />
        <span className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <span className={cn('text-lg font-bold', color)}>{value}</span>
    </div>
  );
}