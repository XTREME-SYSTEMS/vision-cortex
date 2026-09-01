import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bot, MessageCircle, TrendingUp, Brain, Send } from 'lucide-react';

export function FactorySocialAI({ project, onUpdated }) {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState('');
  const [response, setResponse] = useState(null);

  const state = project.social_ai_state || {};
  const metrics = state.engagement_metrics || {};

  const handleGenerateTemplates = async () => {
    setLoading('templates');
    setError(null);
    try {
      await base44.functions.invoke('factorySocialAI', {
        project_id: project.id,
        action: 'generate_response_templates'
      });
      if (onUpdated) onUpdated();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleLearn = async () => {
    setLoading('learn');
    setError(null);
    try {
      await base44.functions.invoke('factorySocialAI', {
        project_id: project.id,
        action: 'learn'
      });
      if (onUpdated) onUpdated();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleRespond = async () => {
    if (!comment.trim()) return;
    setLoading('respond');
    setError(null);
    try {
      const res = await base44.functions.invoke('factorySocialAI', {
        project_id: project.id,
        action: 'auto_respond',
        comment: comment
      });
      setResponse(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Social AI — Auto-Post, Respond & Learn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Posts', value: metrics.total_posts || 0, icon: Send },
            { label: 'Replies', value: metrics.total_replies || 0, icon: MessageCircle },
            { label: 'Eng. Rate', value: `${(metrics.avg_engagement_rate || 0).toFixed(1)}%`, icon: TrendingUp },
            { label: 'Patterns', value: state.learned_patterns?.length || 0, icon: Brain }
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="border rounded-lg p-2 text-center">
                <Icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            );
          })}
        </div>

        {/* Best/worst hooks */}
        {metrics.best_performing_hook && (
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <Badge className="bg-green-100 text-green-700 text-xs">BEST</Badge>
              <p className="text-sm">{metrics.best_performing_hook}</p>
            </div>
            {metrics.worst_performing_hook && (
              <div className="flex items-start gap-2">
                <Badge className="bg-red-100 text-red-700 text-xs">WORST</Badge>
                <p className="text-sm">{metrics.worst_performing_hook}</p>
              </div>
            )}
          </div>
        )}

        {/* Learned patterns */}
        {state.learned_patterns?.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1"><Brain className="w-3 h-3" /> Learned Patterns</Label>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
              {state.learned_patterns.slice(-5).map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleGenerateTemplates}
            disabled={loading === 'templates'}
            variant="outline"
            size="sm"
          >
            {loading === 'templates' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            Gen Templates
          </Button>
          <Button
            onClick={handleLearn}
            disabled={loading === 'learn'}
            variant="outline"
            size="sm"
          >
            {loading === 'learn' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Learn & Improve
          </Button>
        </div>

        {/* Auto-respond test */}
        <div className="space-y-2 border-t pt-3">
          <Label className="text-sm font-medium">Test Auto-Respond</Label>
          <div className="flex gap-2">
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Enter a comment to test the AI response..."
              disabled={loading === 'respond'}
              onKeyDown={(e) => e.key === 'Enter' && handleRespond()}
            />
            <Button onClick={handleRespond} disabled={loading === 'respond' || !comment.trim()} size="icon">
              {loading === 'respond' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          {response && (
            <div className="border rounded-lg p-3 bg-muted/50">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs">{response.type}</Badge>
                {response.should_flag && <Badge variant="destructive" className="text-xs">FLAG</Badge>}
              </div>
              <p className="text-sm">{response.response}</p>
            </div>
          )}
        </div>

        {/* Response templates */}
        {state.response_templates?.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Response Templates ({state.response_templates.length})</Label>
            <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar">
              {state.response_templates.map((t, i) => (
                <div key={i} className="text-xs border rounded p-2">
                  <Badge variant="outline" className="text-xs mb-1">{t.type}</Badge>
                  <p className="text-muted-foreground">{t.template}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}