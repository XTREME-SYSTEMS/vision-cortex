import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, Clock, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  pending: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
  researching: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  complete: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  failed: { icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  validating: { icon: Loader2, color: 'text-amber-500', bg: 'bg-amber-500/10' },
};

export default function QuestCard({ quest, onClick, onResearch, researching }) {
  const cfg = statusConfig[quest.status] || statusConfig.pending;
  const StatusIcon = cfg.icon;

  return (
    <Card
      className={cn('p-3.5 cursor-pointer hover:shadow-md transition-shadow border-border/60', researching && 'opacity-60')}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={cn('w-8 h-8 rounded-lg grid place-items-center shrink-0', cfg.bg)}>
          <StatusIcon className={cn('w-4 h-4', cfg.color, quest.status === 'researching' && 'animate-spin')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Badge variant="outline" className="text-[9px] uppercase tracking-wide">{quest.category?.replace(/_/g, ' ')}</Badge>
            {quest.priority <= 2 && <Badge variant="destructive" className="text-[9px]">P{quest.priority}</Badge>}
            {quest.word_count > 0 && <span className="text-[10px] text-muted-foreground">{quest.word_count}w</span>}
          </div>
          <p className="text-sm font-medium line-clamp-2">{quest.topic}</p>
          {quest.summary && <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{quest.summary}</p>}
        </div>
        {quest.status === 'pending' && onResearch && (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 h-7 text-xs"
            onClick={(e) => { e.stopPropagation(); onResearch(quest); }}
            disabled={researching}
          >
            Research
          </Button>
        )}
      </div>
    </Card>
  );
}