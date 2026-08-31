import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

export default function Onboarding() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('seed'); // seed | question | done
  const [seed, setSeed] = useState('');
  const [profileId, setProfileId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [goal, setGoal] = useState(null);

  // Resume if the user already has a completed profile.
  useEffect(() => {
    base44.entities.UserProfile.filter({}).then((p) => {
      if (p && p.length && p[0].completed) {
        setGoal(p[0].goal);
        setPhase('done');
      }
    }).catch(() => {});
  }, []);

  const start = async () => {
    if (!seed.trim()) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('onboardingQuest', { action: 'start', seed_sentence: seed });
      setProfileId(res.data.profile_id);
      setQuestion(res.data.question);
      setPhase('question');
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const answer = async (value) => {
    setLoading(true);
    try {
      const ans = { question: question.question, answer: value };
      const newAnswers = [...answers, ans];
      setAnswers(newAnswers);
      const res = await base44.functions.invoke('onboardingQuest', { answer: ans });
      if (res.data.completed) {
        setGoal(res.data.goal);
        setPhase('done');
      } else {
        setQuestion(res.data.question);
        setCustom('');
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const back = () => {
    if (answers.length === 0) {
      setPhase('seed');
      setQuestion(null);
      return;
    }
    const prev = [...answers];
    prev.pop();
    setAnswers(prev);
    // Re-derive last question client-side is imperfect; just let user continue forward.
  };

  if (phase === 'done') {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="h-14 w-14 rounded-2xl bg-foreground text-background grid place-items-center mx-auto mb-6">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="font-display text-4xl tracking-tight">Your destiny is locked.</h1>
        <p className="mt-4 text-muted-foreground">
          {goal?.summary || `Goal: ${goal?.kind} → ${goal?.value} by ${goal?.by_horizon}`}
        </p>
        <Button className="mt-8 rounded-full" onClick={() => navigate('/')}>
          Enter Vision Cortex <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    );
  }

  if (phase === 'seed') {
    return (
      <div className="max-w-2xl mx-auto py-16">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">The Onboarding Quest · Step 1</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">
          Describe the life you want.
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          One sentence. Be honest and specific — the system will spend the next few questions turning it into a locked goal, then steer every recommendation toward it.
        </p>
        <div className="mt-8 flex gap-3">
          <Input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && start()}
            placeholder="e.g. I want to be a millionaire in a year running a fully automated digital business."
            className="rounded-full h-12 text-base"
            autoFocus
          />
          <Button onClick={start} disabled={loading || !seed.trim()} className="rounded-full h-12 px-6">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Begin'}
          </Button>
        </div>
      </div>
    );
  }

  // question phase
  const progress = Math.round((answers.length / 6) * 100);
  return (
    <div className="max-w-2xl mx-auto py-16">
      <div className="flex items-center justify-between mb-8">
        <button onClick={back} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Question {answers.length + 1}
        </span>
      </div>
      <div className="h-1 bg-muted rounded-full mb-10 overflow-hidden">
        <div className="h-full bg-foreground transition-all" style={{ width: `${progress}%` }} />
      </div>

      {loading || !question ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div>
          <h2 className="font-display text-3xl tracking-tight leading-tight">{question.question}</h2>
          <div className="mt-8 space-y-3">
            {question.options?.map((opt) => (
              <button
                key={opt}
                onClick={() => answer(opt)}
                disabled={loading}
                className="w-full text-left p-4 rounded-2xl border border-border/60 hover:border-foreground hover:bg-muted/40 transition-colors text-[15px]"
              >
                {opt}
              </button>
            ))}
            <div className="flex gap-2 pt-2">
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Something else…"
                className="rounded-full"
              />
              <Button variant="outline" className="rounded-full" disabled={loading || !custom.trim()} onClick={() => answer(custom)}>
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}