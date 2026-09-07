import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  active: { ring: '#10b981', glow: 'rgba(16,185,129,0.4)' },
  idle: { ring: '#64748b', glow: 'rgba(100,116,139,0.15)' },
  paused: { ring: '#3b82f6', glow: 'rgba(59,130,246,0.3)' },
  error: { ring: '#ef4444', glow: 'rgba(239,68,68,0.4)' },
};

export default function AgentNode({ agent, active, task, isSelected, onClick }) {
  const status = agent.status || 'idle';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

  return (
    <motion.div
      className="absolute z-10 cursor-pointer"
      style={{ left: `${agent._x}%`, top: `${agent._y}%` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'backOut' }}
      onClick={onClick}
    >
      <motion.div
        animate={active ? { y: [0, -5, 0] } : { y: 0 }}
        transition={{ duration: 2.5, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
        className="relative"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        {active && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${cfg.ring}`, boxShadow: `0 0 20px ${cfg.glow}` }}
            animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
        )}

        <div
          className={cn(
            'relative w-12 h-12 rounded-full grid place-items-center border-2 transition-all',
            isSelected && 'ring-2 ring-offset-2 ring-offset-slate-950'
          )}
          style={{
            borderColor: cfg.ring,
            background: active ? `${cfg.ring}20` : '#1e293b',
            boxShadow: active ? `0 0 15px ${cfg.glow}` : 'none',
          }}
        >
          {agent.avatar_url ? (
            <img src={agent.avatar_url} className="w-full h-full rounded-full object-cover" alt={agent.name} />
          ) : (
            <span className="text-[11px] font-bold text-white">
              {(agent.codename || agent.name || '?').slice(0, 2).toUpperCase()}
            </span>
          )}
          <div
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950"
            style={{ background: cfg.ring }}
          />
        </div>

        {agent.health != null && agent.health > 0 && (
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${agent.health}%`,
                background: agent.health >= 70 ? '#10b981' : agent.health >= 40 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
        )}

        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none text-center">
          <span className="text-[10px] font-medium text-slate-300">{agent.codename || agent.name}</span>
          {task && <p className="text-[8px] text-slate-500 max-w-[100px] truncate">{task}</p>}
        </div>
      </motion.div>
    </motion.div>
  );
}