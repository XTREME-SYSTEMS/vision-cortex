import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Lightbulb, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import AIAssistButton from '@/components/destiny/AIAssistButton';
import { cn } from '@/lib/utils';

// Personal human-personality questionnaire. Compounds answers, supports
// multi-select (conditions) and free-text (passions/skills/traumas with AI assist).
// On completion, synthesizes a persona profile and calls onComplete.
export default function PersonalQuest({ vision, onComplete }) {
  const [answers, setAnswers] = useState([]);
  const [question, setQuestion] = useState(null);
  const [custom, setCustom] = useState('');
  const [multi, setMulti] = useState([]);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState(null);

  const start = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('personalOnboarding', { action: 'start' });
      setQuestion(res.data?.question);
      setStarted(true);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  const submit = async (value) => {
    setRunning(true);
    setError(null);
    try {
      const ans = { question: question.question, answer: value };
      const next = [...answers, ans];
      setAnswers(next);
      setMulti([]);
      setCustom('');
      const res = await base44.functions.invoke('personalOnboarding', { answers: next, vision });
      if (res.data?.completed) {
        onComplete?.(res.data.persona, res.data.profile_id);
      } else {
        setQuestion(res.data.question);
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  const toggleMulti = (opt) => {
    if (opt === 'None of these') { setMulti(['None of these']); return; }
    setMulti((m) => m.includes(opt) ? m.filter((x) => x !== opt).filter((x) => x !== 'None of these') : [...m.filter((x) => x !== 'None of these'), opt]);
  };

  if (!started) {
    return (
      <div>
        <p className="text-muted-foreground leading-relaxed">
          A few questions about <span className="text-foreground font-medium">you</span> — how you decide, your risk, your relationships, your story. The simulator uses this to model your actual life, not a generic one. Answer honestly; it stays private to you.
        </p>
        <Button onClick={start} disabled={running} className="mt-8 rounded-full h-11 px-6">
          {running ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
          {running ? 'Starting…' : 'Begin the personal questionnaire'}
        </Button>
      </div>
    );
  }

  if (running || !question) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Question {answers.length + 1}</span>
      </div>
      <div className="h-1 bg-muted rounded-full mb-10 overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${Math.round((answers.length / 12) * 100)}%` }} />
      </div>
      <h2 className="font-display text-3xl tracking-tight leading-tight">{question.question}</h2>

      <div className="mt-8 space-y-3">
        {question.options?.map((opt) => {
          const isMulti = question.multi;
          const selected = isMulti ? multi.includes(opt) : false;
          return (
            <button
              key={opt}
              onClick={() => (isMulti ? toggleMulti(opt) : submit(opt))}
              disabled={running}
              className={cn(
                'w-full text-left p-4 rounded-2xl border transition-colors text-[15px] flex items-center gap-3',
                selected ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary hover:bg-muted/40'
              )}
            >
              {isMulti && (
                <span className={cn('h-4 w-4 rounded border flex items-center justify-center shrink-0', selected ? 'bg-primary border-primary' : 'border-border')}>
                  {selected && <Check className="w-3 h-3 text-primary-foreground" />}
                </span>
              )}
              {opt}
            </button>
          );
        })}

        {question.multi && (
          <Button onClick={() => submit(multi.join(', ') || 'None of these')} disabled={running || !multi.length} className="rounded-full mt-2">
            Confirm selection
          </Button>
        )}

        {question.free && (
          <div className="flex gap-2 pt-2">
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && custom.trim() && submit(custom)}
              placeholder={question.optional ? 'Skip or type a few words…' : 'Type a few words…'}
              className="rounded-full"
              autoFocus
            />
            <AIAssistButton text={custom} context={question.question} onResult={setCustom} />
            {question.optional ? (
              <Button variant="outline" className="rounded-full" onClick={() => submit(custom || '—')}>Skip</Button>
            ) : (
              <Button variant="outline" className="rounded-full" disabled={!custom.trim()} onClick={() => submit(custom)}>Send</Button>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive mt-4">{error}</p>}
    </div>
  );
}