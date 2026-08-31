import React, { useState } from 'react';
import { Sparkles, Loader2, Lightbulb, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function AutoRecommendPanel({ gaps, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setSuggestion(null);
    try {
      const res = await base44.functions.invoke('gapRecommender', { mode: 'suggest' });
      setSuggestion(res.data || res);
    } catch (e) {
      setError(e.message || 'Failed to generate suggestions');
    }
    setLoading(false);
  };

  const addSuggestion = async (s) => {
    const nextNumber = gaps.length > 0 ? Math.max(...gaps.map((g) => g.number || 0)) + 1 : 1;
    try {
      const created = await base44.entities.Gap.create({
        title: s.title,
        description: s.description,
        category: s.category || 'other',
        severity: s.severity || 'medium',
        number: nextNumber,
      });
      // Auto-recommend the new gap immediately
      await base44.functions.invoke('gapRecommender', { mode: 'recommend', gap_id: created.id });
      setSuggestion((prev) => ({
        ...prev,
        suggestions: (prev?.suggestions || []).filter((x) => x.title !== s.title),
      }));
      onRefresh();
    } catch (e) {
      setError(`Failed to add suggestion: ${e.message}`);
    }
  };

  return (
    <Card className="p-5 border-dashed">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-foreground/5 grid place-items-center shrink-0">
          <Lightbulb className="w-4.5 h-4.5 text-foreground" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">Auto-Recommender</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Analyzes all current gaps and suggests new ones the system should track. Added suggestions get an instant AI recommendation.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Generate Ideas
        </Button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 text-xs text-rose-500">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {suggestion?.suggestions?.length > 0 && (
        <div className="mt-4 space-y-2">
          {suggestion.suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
              <div className="flex-1">
                <div className="text-sm font-medium">{s.title}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1 italic">{s.rationale}</p>
                <div className="flex gap-1.5 mt-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{s.category}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{s.severity}</span>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => addSuggestion(s)}>Add</Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}