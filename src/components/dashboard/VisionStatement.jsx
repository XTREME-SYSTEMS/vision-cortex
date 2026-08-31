import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Save, Loader2 } from 'lucide-react';

export default function VisionStatement() {
  const [vision, setVision] = useState('');
  const [visionId, setVisionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prepping, setPrepping] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    base44.entities.Doctrine.filter({ category: 'leadership' }, '-created_date', 20).then((rows) => {
      const v = rows.find((r) => /vision statement/i.test(r.topic || ''));
      if (v) { setVision(v.insight || ''); setVisionId(v.id); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      if (visionId) await base44.entities.Doctrine.update(visionId, { insight: vision });
      else {
        const r = await base44.entities.Doctrine.create({ topic: 'Owner Vision Statement', insight: vision, category: 'leadership', confidence: 1, weight: 5, validated: true, validation_count: 1 });
        setVisionId(r.id);
      }
      setMsg('Vision saved — tonight\'s ritual will use it.');
    } catch { setMsg('Save failed.'); }
    setSaving(false);
  };

  const prepNow = async () => {
    setPrepping(true); setMsg('');
    try {
      await base44.functions.invoke('nightlyPipelinePrep', {});
      setMsg('Done — 10 pipelines ready in the Morning Brief below.');
      window.dispatchEvent(new Event('nightly-prep-done'));
    } catch { setMsg('Prep failed.'); }
    setPrepping(false);
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4" />
        <h2 className="font-medium">Your Vision Statement</h2>
        <span className="text-xs text-muted-foreground ml-auto">Feeds the nightly ritual</span>
      </div>
      <Textarea value={vision} onChange={(e) => setVision(e.target.value)} disabled={loading}
        placeholder="Describe your vision, goals, and ideas. The Council will choose 10 strategies from this each night and have 10 pipelines ready for your morning meeting."
        rows={4} className="resize-none" />
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <Button onClick={save} disabled={saving || loading} size="sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save vision
        </Button>
        <Button onClick={prepNow} disabled={prepping || loading} variant="outline" size="sm">
          {prepping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Prep 10 pipelines now
        </Button>
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>
    </section>
  );
}