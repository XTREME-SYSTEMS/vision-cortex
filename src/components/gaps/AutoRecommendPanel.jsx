import React, { useState } from 'react';
import { Sparkles, Loader2, Lightbulb } from 'lucide-react';
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
      const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the autonomous improvement engine for Vision Cortex. Here are the current system gaps:

${gaps.map((g) => `#${g.number} [${g.severity}/${g.status}] ${g.title}: ${g.description}`).join('\n')}

Based on these gaps, generate 1-3 NEW gap ideas that the system should track but doesn't yet. Think about what's missing from the user's vision of a zero-interaction autonomous business-creation platform that serves ANY human. Consider: accessibility, onboarding friction, language support, mobile experience, error recovery, trust/transparency, data portability, offline capability.

For each, provide: title, description, category (deployment/monetization/automation/ux/integration/data/security/other), severity (critical/high/medium/low), and a one-line rationale.`,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                  severity: { type: 'string' },
                  rationale: { type: 'string' },
                },
              },
            },
          },
          required: ['suggestions'],
        },
      });
      setSuggestion(res);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const addSuggestion = async (s) => {
    const nextNumber = gaps.length > 0 ? Math.max(...gaps.map((g) => g.number || 0)) + 1 : 1;
    await base44.entities.Gap.create({ ...s, number: nextNumber });
    setSuggestion((prev) => ({ ...prev, suggestions: prev.suggestions.filter((x) => x.title !== s.title) }));
    onRefresh();
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
            Analyzes all current gaps and suggests new ones the system should track. These also surface as ideas across the app.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Generate Ideas
        </Button>
      </div>

      {error && <p className="text-xs text-rose-500 mt-3">{error}</p>}

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