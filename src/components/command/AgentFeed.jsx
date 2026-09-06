import React from 'react';
import { Bot, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const levelConfig = {
  success: { icon: CheckCircle2, color: 'text-emerald-500' },
  error: { icon: AlertCircle, color: 'text-red-500' },
  warn: { icon: AlertTriangle, color: 'text-amber-500' },
  info: { icon: Info, color: 'text-sky-500' },
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AgentFeed({ logs }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Bot className="w-4 h-4" /> Agent Activity</h3>
      {logs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No recent activity.</p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto no-scrollbar">
          {logs.map((log) => {
            const cfg = levelConfig[log.level] || levelConfig.info;
            const Icon = cfg.icon;
            return (
              <div key={log.id} className="flex items-start gap-2 text-xs py-1.5 border-b border-border/20 last:border-0">
                <Icon className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', cfg.color)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[11px]">{log.agent_name}</span>
                    <span className="text-[9px] text-muted-foreground capitalize">{log.category?.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight line-clamp-2">{log.message}</p>
                </div>
                <span className="text-[9px] text-muted-foreground/60 shrink-0">{timeAgo(log.created_date)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}