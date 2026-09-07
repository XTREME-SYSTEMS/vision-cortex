import React from 'react';
import { motion } from 'framer-motion';
import { X, Clock, Coins, CheckCircle2, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const STATUS_COLORS = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  idle: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  paused: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function timeAgo(iso) {
  if (!iso) return 'never';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function AgentDetailPanel({ agent, task, logs, now, onClose }) {
  const status = agent.status || 'idle';

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="absolute top-3 right-3 w-72 bg-slate-900/95 backdrop-blur border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden"
    >
      <div className="flex items-start justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full grid place-items-center border-2" style={{ borderColor: agent._color, background: `${agent._color}20` }}>
            {agent.avatar_url ? (
              <img src={agent.avatar_url} className="w-full h-full rounded-full object-cover" alt={agent.name} />
            ) : (
              <span className="text-xs font-bold text-white">{(agent.codename || agent.name || '?').slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{agent.name}</p>
            <p className="text-[10px] text-slate-400">{agent.codename} · {agent.role || 'Agent'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLORS[status] || STATUS_COLORS.idle}`}>{status}</Badge>
          {task && (
            <Badge variant="outline" className="text-[10px] text-sky-400 border-sky-500/30 bg-sky-500/10">
              <Zap className="w-2.5 h-2.5 mr-1" /> {task}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/5 rounded-lg p-2">
            <CheckCircle2 className="w-3 h-3 text-amber-400 mb-1" />
            <p className="text-sm font-bold text-white">{agent.tasks_completed || 0}</p>
            <p className="text-[8px] text-slate-500">tasks</p>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <Coins className="w-3 h-3 text-violet-400 mb-1" />
            <p className="text-sm font-bold text-white">{(agent.inf_balance || 0).toFixed(2)}</p>
            <p className="text-[8px] text-slate-500">INF</p>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <Clock className="w-3 h-3 text-sky-400 mb-1" />
            <p className="text-[10px] font-medium text-white">{timeAgo(agent.last_run)}</p>
            <p className="text-[8px] text-slate-500">last run</p>
          </div>
        </div>

        {logs.length > 0 && (
          <div>
            <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1.5">Recent Activity</p>
            <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar">
              {logs.slice(0, 6).map((log) => (
                <div key={log.id} className="flex items-start gap-1.5 text-[10px]">
                  <span className={`h-1 w-1 rounded-full mt-1 shrink-0 ${log.level === 'error' ? 'bg-rose-500' : log.level === 'warn' ? 'bg-amber-500' : log.level === 'success' ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                  <span className="text-slate-400 leading-tight">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {agent.capabilities && agent.capabilities.length > 0 && (
          <div>
            <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1.5">Capabilities</p>
            <div className="flex flex-wrap gap-1">
              {agent.capabilities.slice(0, 6).map((cap, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">{cap}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}