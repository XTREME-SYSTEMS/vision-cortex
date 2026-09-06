import React from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, AlertTriangle, XCircle, HelpCircle,
  Cloud, Database, Train, Zap, HardDrive, CreditCard, Globe, Calendar, Search, Bot
} from 'lucide-react';

const iconMap = {
  vercel: Cloud,
  supabase: Database,
  railway: Train,
  groq: Zap,
  cloud_browser: Globe,
  stripe: CreditCard,
  google_drive: HardDrive,
  google_search_console: Search,
  google_calendar: Calendar,
  xtreme_builder: Bot,
};

const statusConfig = {
  connected: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Connected' },
  degraded: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Degraded' },
  disconnected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Disconnected' },
  unknown: { icon: HelpCircle, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Unknown' },
};

export default function AccountCard({ account }) {
  const Icon = iconMap[account.account_type] || HelpCircle;
  const cfg = statusConfig[account.status] || statusConfig.unknown;
  const StatusIcon = cfg.icon;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-3.5 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center">
            <Icon className="w-4.5 h-4.5 text-foreground" />
          </div>
          <div>
            <div className="text-sm font-medium capitalize">{account.account_type.replace(/_/g, ' ')}</div>
            <div className="text-[11px] text-muted-foreground">{cfg.label}</div>
          </div>
        </div>
        <div className={cn('p-1 rounded-full', cfg.bg)}>
          <StatusIcon className={cn('w-4 h-4', cfg.color)} />
        </div>
      </div>
      {account.details && Object.keys(account.details).length > 0 && (
        <div className="text-[11px] text-muted-foreground space-y-0.5">
          {account.details.plan && <div>Plan: {account.details.plan}</div>}
          {account.details.projects != null && <div>Projects: {account.details.projects}</div>}
          {account.details.models != null && <div>Models: {account.details.models}</div>}
          {account.details.email && <div className="truncate">{account.details.email}</div>}
          {account.details.country && <div>Country: {account.details.country}</div>}
        </div>
      )}
      {account.last_error && (
        <div className="text-[11px] text-red-500 truncate" title={account.last_error}>
          {account.last_error}
        </div>
      )}
    </div>
  );
}