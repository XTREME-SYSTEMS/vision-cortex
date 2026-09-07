import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const LEVEL_DOTS = {
  success: 'bg-emerald-500',
  info: 'bg-sky-500',
  warn: 'bg-amber-500',
  error: 'bg-rose-500',
};

const LEVEL_COLORS = {
  success: 'text-emerald-400',
  info: 'text-sky-400',
  warn: 'text-amber-400',
  error: 'text-rose-400',
};

function timeAgo(iso, now) {
  if (!iso) return '';
  const s = Math.floor((now - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

export default function ActivityTicker({ logs, now }) {
  const recent = (logs || []).slice(0, 20);

  return (
    <div className="shrink-0 h-20 border-t border-white/10 bg-slate-900/80 backdrop-blur overflow-hidden">
      <div className="h-full overflow-y-auto px-3 py-2 space-y-1 no-scrollbar">
        <AnimatePresence initial={false}>
          {recent.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 text-[11px]"
            >
              <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', LEVEL_DOTS[log.level] || 'bg-slate-500')} />
              <span className="font-medium text-slate-300 shrink-0 w-24 truncate">{log.agent_name || 'system'}</span>
              <span className={cn('shrink-0', LEVEL_COLORS[log.level] || 'text-slate-400')}>·</span>
              <span className="text-slate-400 truncate flex-1">{log.message}</span>
              {log.auto_action && <span className="text-[9px] font-mono text-indigo-400/60 shrink-0">{log.auto_action}</span>}
              <span className="text-slate-600 shrink-0">{timeAgo(log.created_date, now)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {recent.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-4">No activity yet. System is idle.</p>
        )}
      </div>
    </div>
  );
}