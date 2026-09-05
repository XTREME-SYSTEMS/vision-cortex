import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Zap, Brain, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import QuestCard from '@/components/intelligence/QuestCard';
import QuestDetail from '@/components/intelligence/QuestDetail';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'wealth', label: 'Wealth' },
  { value: 'ai_engineering', label: 'AI Engineering' },
  { value: 'epoxy_concrete', label: 'Epoxy/Concrete' },
  { value: 'business_strategy', label: 'Business' },
  { value: 'data_intelligence', label: 'Data Intelligence' },
  { value: 'autonomous_systems', label: 'Autonomous Systems' },
  { value: 'prompt_engineering', label: 'Prompt Engineering' },
  { value: 'niche_identification', label: 'Niches' },
  { value: 'future_ai', label: 'Future AI' },
  { value: 'capabilities', label: 'Capabilities' },
  { value: 'free_resources', label: 'Free Resources' },
  { value: 'learning_strategy', label: 'Learning' },
  { value: 'crypto', label: 'Crypto' },
];

export default function IntelligenceSeeker() {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [researching, setResearching] = useState(false);
  const [gatheringAll, setGatheringAll] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [freeMode, setFreeMode] = useState(true);
  const [newTopic, setNewTopic] = useState('');
  const [newCategory, setNewCategory] = useState('other');
  const [newQuestion, setNewQuestion] = useState('');

  const load = async () => {
    try {
      const rows = await base44.entities.KnowledgeQuest.list('-priority', 200);
      setQuests(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const research = async (quest) => {
    setResearching(true);
    try {
      await base44.functions.invoke(freeMode ? 'freeIntelligenceGatherer' : 'intelligenceGatherer', { quest_id: quest.id });
      await load();
    } catch (e) {
      alert('Research failed: ' + e.message);
    } finally {
      setResearching(false);
    }
  };

  const gatherAll = async () => {
    const pending = quests.filter(q => q.status === 'pending');
    if (pending.length === 0) return;
    setGatheringAll(true);
    for (const q of pending) {
      try {
        await base44.functions.invoke(freeMode ? 'freeIntelligenceGatherer' : 'intelligenceGatherer', { quest_id: q.id });
        await load();
      } catch (e) { /* continue to next */ }
    }
    setGatheringAll(false);
  };

  const addQuest = async () => {
    if (!newTopic.trim()) return;
    try {
      await base44.entities.KnowledgeQuest.create({
        topic: newTopic.trim(),
        category: newCategory,
        question: newQuestion.trim(),
        depth: 'deep',
        priority: 3,
      });
      setNewTopic('');
      setNewQuestion('');
      setShowAdd(false);
      await load();
    } catch (e) {
      alert('Failed to add quest: ' + e.message);
    }
  };

  const filtered = filter === 'all' ? quests : quests.filter(q => q.category === filter);
  const stats = {
    total: quests.length,
    complete: quests.filter(q => q.status === 'complete').length,
    pending: quests.filter(q => q.status === 'pending').length,
    researching: quests.filter(q => q.status === 'researching').length,
    totalWords: quests.reduce((sum, q) => sum + (q.word_count || 0), 0),
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-foreground text-background grid place-items-center">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-xl tracking-tight">Intelligence Seeker</h1>
            <p className="text-xs text-muted-foreground">Obsessive intelligence gathering archetype — researches, validates, and distributes knowledge</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setFreeMode(!freeMode)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                freeMode
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-muted text-muted-foreground border-border/60'
              )}
              title={freeMode ? 'Free mode: uses DuckDuckGo + Wikipedia + Groq/Gemini (free APIs, zero credits)' : 'Premium mode: uses Base44 InvokeLLM with web search (costs credits)'}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', freeMode ? 'bg-emerald-500' : 'bg-muted-foreground')} />
              {freeMode ? 'Free Mode' : 'Premium'}
            </button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="h-8">
              <Plus className="w-3.5 h-3.5" /> Add Quest
            </Button>
            <Button size="sm" onClick={gatherAll} disabled={gatheringAll || stats.pending === 0} className="h-8">
              {gatheringAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Gather All ({stats.pending})
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Total', value: stats.total, icon: Brain, color: 'text-foreground' },
            { label: 'Complete', value: stats.complete, icon: CheckCircle2, color: 'text-emerald-500' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-500' },
            { label: 'Researching', value: stats.researching, icon: Loader2, color: 'text-blue-500' },
            { label: 'Words', value: stats.totalWords.toLocaleString(), icon: TrendingUp, color: 'text-foreground' },
          ].map((s) => (
            <Card key={s.label} className="p-2.5 border-border/60">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                <s.icon className={cn('w-3 h-3', s.color, s.label === 'Researching' && stats.researching > 0 && 'animate-spin')} />
                <p className="text-[9px] uppercase tracking-widest">{s.label}</p>
              </div>
              <p className="font-display text-lg">{s.value}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Add quest form */}
      {showAdd && (
        <div className="px-5 py-3 border-b border-border/60 bg-muted/30 shrink-0">
          <div className="flex flex-col gap-2">
            <input
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Topic to research…"
              className="w-full bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border/60 focus:ring-1 focus:ring-ring"
            />
            <div className="flex gap-2">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border/60"
              >
                {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Specific question (optional)…"
                className="flex-1 bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border/60"
              />
              <Button size="sm" onClick={addQuest} disabled={!newTopic.trim()}>Add</Button>
            </div>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="px-5 py-2 border-b border-border/60 shrink-0 flex gap-1.5 overflow-x-auto no-scrollbar">
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors',
              filter === c.value ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Main content — quest list + detail */}
      <div className="flex-1 flex min-h-0">
        <div className="w-1/2 border-r border-border/60 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading quests…
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No quests in this category.</p>
          ) : (
            filtered.map(q => (
              <QuestCard
                key={q.id}
                quest={q}
                onClick={() => setSelected(q)}
                onResearch={research}
                researching={researching}
              />
            ))
          )}
        </div>
        <div className="flex-1 min-w-0">
          <QuestDetail quest={selected} onClose={() => setSelected(null)} onResearch={research} researching={researching} />
        </div>
      </div>
    </div>
  );
}