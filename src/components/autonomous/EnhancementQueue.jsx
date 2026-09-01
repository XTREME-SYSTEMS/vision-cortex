import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, ChevronUp, Code, CheckCircle, XCircle, Clock } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-blue-100 text-blue-700', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700', icon: Loader2 },
  validating: { label: 'Validating', color: 'bg-amber-100 text-amber-700', icon: Loader2 },
  implemented: { label: 'Implemented', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  audited: { label: 'Audited', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: XCircle },
  blocked: { label: 'Blocked', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export function EnhancementQueue({ onStatsUpdate }) {
  const [enhancements, setEnhancements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    try {
      const list = await base44.entities.SystemEnhancement.list('-created_date', 30);
      setEnhancements(list);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.SystemEnhancement.subscribe(() => {
      load();
      if (onStatsUpdate) onStatsUpdate();
    });
    return unsub;
  }, []);

  const applyImplementation = async (enhancement) => {
    // In a real deployment, this would write the code to files
    // For now, mark as implemented
    await base44.entities.SystemEnhancement.update(enhancement.id, {
      status: 'implemented',
      last_action_at: new Date().toISOString()
    });
    load();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit max-h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Enhancement Queue ({enhancements.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
        {enhancements.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No enhancements logged.</p>
        )}
        {enhancements.map((e) => {
          const config = STATUS_CONFIG[e.status] || STATUS_CONFIG.pending;
          const Icon = config.icon;
          const isExpanded = expanded === e.id;
          const hasCode = e.implementation_code && e.implementation_code.length > 50;

          return (
            <div key={e.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium flex-1">{e.title}</p>
                <Badge className={`text-xs ${config.color} shrink-0`}>
                  <Icon className={`w-3 h-3 ${e.status === 'in_progress' || e.status === 'validating' ? 'animate-spin' : ''}`} />
                  {config.label}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">{e.category}</Badge>
                <span>Priority: {e.priority}</span>
                {e.audit_result?.score && (
                  <span>Score: {e.audit_result.score}</span>
                )}
              </div>

              {hasCode && (
                <button
                  onClick={() => setExpanded(isExpanded ? null : e.id)}
                  className="flex items-center gap-1 text-xs text-primary"
                >
                  <Code className="w-3 h-3" />
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  View Implementation
                </button>
              )}

              {isExpanded && hasCode && (
                <div className="space-y-2">
                  <pre className="text-xs bg-muted p-2 rounded-lg overflow-x-auto max-h-48 no-scrollbar font-mono">
                    {e.implementation_code.slice(0, 1000)}
                    {e.implementation_code.length > 1000 ? '\n...' : ''}
                  </pre>
                  {e.audit_result?.failures?.length > 0 && (
                    <div className="text-xs text-red-600">
                      <p className="font-medium">Issues:</p>
                      <ul className="list-disc list-inside">
                        {e.audit_result.failures.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                  )}
                  {e.status === 'pending' && (
                    <Button size="sm" variant="outline" onClick={() => applyImplementation(e)}>
                      Mark Implemented
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}