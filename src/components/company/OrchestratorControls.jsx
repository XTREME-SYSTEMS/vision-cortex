import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Rocket, Zap, Calendar, MessageSquare, Loader2, Play, RefreshCw, ListChecks } from 'lucide-react';

export default function OrchestratorControls({ onAction, loading }) {
  const [result, setResult] = useState(null);

  const handle = async (action) => {
    const res = await onAction(action);
    setResult(res);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => handle('bootstrap')}
          disabled={loading}
          className="bg-violet-600 hover:bg-violet-700"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5 mr-1.5" />}
          Bootstrap Company
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handle('trigger')}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
          Trigger Swarm
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handle('schedule_calendar')}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5 mr-1.5" />}
          Schedule in Calendar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handle('sync_tasks')}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ListChecks className="w-3.5 h-3.5 mr-1.5" />}
          Sync to Google Tasks
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handle('hourly_summary')}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5 mr-1.5" />}
          Send Summary
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handle('status')}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
          Refresh
        </Button>
      </div>
      {result && (
        <div className="rounded-md border border-border/30 bg-muted/20 p-2.5 text-xs">
          <pre className="whitespace-pre-wrap text-muted-foreground">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}