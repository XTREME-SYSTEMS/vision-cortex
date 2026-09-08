import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  BookOpen, Loader2, RefreshCw, Search, Brain, Wrench, ShieldCheck,
  Rocket, Activity, Zap, Eye, ChevronDown, ChevronUp, Copy, Check, Plus, Trash2, Edit3, X, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { key: 'audit', label: 'Audit', icon: Eye, color: 'text-blue-500' },
  { key: 'heal', label: 'Heal', icon: Wrench, color: 'text-emerald-500' },
  { key: 'harden', label: 'Harden', icon: ShieldCheck, color: 'text-amber-500' },
  { key: 'optimize', label: 'Optimize', icon: Zap, color: 'text-lime-500' },
  { key: 'manage', label: 'Manage', icon: Activity, color: 'text-cyan-500' },
  { key: 'build', label: 'Build', icon: Rocket, color: 'text-violet-500' },
  { key: 'intelligence', label: 'Intelligence', icon: Brain, color: 'text-pink-500' },
  { key: 'communication', label: 'Comms', icon: BookOpen, color: 'text-orange-500' },
  { key: 'prediction', label: 'Predict', icon: Activity, color: 'text-teal-500' },
  { key: 'simulation', label: 'Simulate', icon: Zap, color: 'text-indigo-500' },
  { key: 'strategy', label: 'Strategy', icon: Brain, color: 'text-purple-500' },
  { key: 'governance', label: 'Govern', icon: ShieldCheck, color: 'text-rose-500' },
  { key: 'reflection', label: 'Reflect', icon: Eye, color: 'text-sky-500' },
  { key: 'coding', label: 'Code', icon: Wrench, color: 'text-green-500' },
  { key: 'memory', label: 'Memory', icon: Brain, color: 'text-fuchsia-500' },
  { key: 'discovery', label: 'Discover', icon: Rocket, color: 'text-red-500' },
  { key: 'scraping', label: 'Scrape', icon: Eye, color: 'text-yellow-500' },
  { key: 'clone', label: 'Clone', icon: Activity, color: 'text-blue-400' },
  { key: 'provision', label: 'Provision', icon: Rocket, color: 'text-emerald-400' },
  { key: 'other', label: 'Other', icon: BookOpen, color: 'text-muted-foreground' },
];

export default function PromptLibrary() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.SystemPrompt.list('-updated_date', 200);
      setPrompts(list || []);
    } catch {
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = prompts.filter(p => {
    if (activeCategory !== 'all' && p.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name?.toLowerCase().includes(q) || p.prompt_text?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    }
    return true;
  });

  const copyPrompt = async (prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.prompt_text || '');
      setCopiedId(prompt.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const deletePrompt = async (id) => {
    try {
      await base44.entities.SystemPrompt.delete(id);
      load();
    } catch {}
  };

  const savePrompt = async (data) => {
    try {
      if (data.id) {
        await base44.entities.SystemPrompt.update(data.id, data);
      } else {
        await base44.entities.SystemPrompt.create(data);
      }
      setEditing(null);
      setCreating(false);
      load();
    } catch {}
  };

  const ingestAll = async () => {
    setIngesting(true);
    setIngestResult(null);
    try {
      const res = await base44.functions.invoke('ingestPromptLibrary', {
        action: 'ingest_all',
        agent_name: 'PRIMUS',
        max_per_run: 50,
      });
      setIngestResult(res.data || res);
      load();
    } catch (e) {
      setIngestResult({ error: e.message });
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-primary" /> Prompt Library
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Master prompt library for Vision Cortex — {prompts.length} prompts across {CATEGORIES.length} categories. Engineered using the world's most advanced prompt engineering techniques.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="p-2 rounded-lg border border-border hover:bg-accent">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
          <button
            onClick={ingestAll}
            disabled={ingesting}
            className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1.5"
          >
            {ingesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Ingest All
          </button>
          <button onClick={() => setCreating(true)} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New
          </button>
        </div>
      </div>

      {ingestResult && (
        <div className={cn(
          'rounded-lg border p-3 text-sm',
          ingestResult.error ? 'border-red-500/40 bg-red-500/5 text-red-500' : 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600'
        )}>
          {ingestResult.error ? `Error: ${ingestResult.error}` : (
            <span>
              Ingested <strong>{ingestResult.succeeded}</strong> of <strong>{ingestResult.total}</strong> prompts for {ingestResult.agent}
              {ingestResult.failed > 0 && ` (${ingestResult.failed} failed)`}
            </span>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search prompts..."
          className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            activeCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
          )}
        >
          All ({prompts.length})
        </button>
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const count = prompts.filter(p => p.category === cat.key).length;
          if (count === 0) return null;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5',
                activeCategory === cat.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
              )}
            >
              <Icon className={cn('w-3 h-3', activeCategory === cat.key ? '' : cat.color)} />
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Prompt list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No prompts found. {search ? 'Try a different search.' : 'Create one to get started.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(prompt => (
            <div key={prompt.id} className="rounded-lg border border-border bg-card overflow-hidden">
              <div
                className="p-3 cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => setExpandedId(expandedId === prompt.id ? null : prompt.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {(() => {
                      const cat = CATEGORIES.find(c => c.key === prompt.category);
                      const Icon = cat?.icon || BookOpen;
                      return <Icon className={cn('w-4 h-4 shrink-0', cat?.color || 'text-muted-foreground')} />;
                    })()}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{prompt.name}</p>
                      {prompt.description && <p className="text-[11px] text-muted-foreground truncate">{prompt.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {prompt.effectiveness_score > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                        {prompt.effectiveness_score}% effective
                      </span>
                    )}
                    {expandedId === prompt.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
              </div>
              {expandedId === prompt.id && (
                <div className="border-t border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyPrompt(prompt)}
                      className="px-2.5 py-1 rounded-lg bg-muted text-xs font-medium hover:bg-muted/70 flex items-center gap-1.5"
                    >
                      {copiedId === prompt.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copiedId === prompt.id ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={() => setEditing(prompt)}
                      className="px-2.5 py-1 rounded-lg bg-muted text-xs font-medium hover:bg-muted/70 flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => deletePrompt(prompt.id)}
                      className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-500 text-xs font-medium hover:bg-red-500/20 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted/30 p-3 rounded-lg max-h-96 overflow-y-auto">
                    {prompt.prompt_text}
                  </pre>
                  {prompt.variables?.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Variables:</span>
                      {prompt.variables.map((v, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-mono">
                          [{v.name}]
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create modal */}
      {(editing || creating) && (
        <PromptEditor
          prompt={editing}
          onSave={savePrompt}
          onClose={() => { setEditing(null); setCreating(false); }}
        />
      )}
    </div>
  );
}

function PromptEditor({ prompt, onSave, onClose }) {
  const [data, setData] = useState(prompt || {
    name: '',
    category: 'other',
    description: '',
    prompt_text: '',
    target_model: 'automatic',
    tags: [],
    active: true,
  });

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{prompt ? 'Edit Prompt' : 'New Prompt'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <input
          value={data.name}
          onChange={e => setData({ ...data, name: e.target.value })}
          placeholder="Prompt name"
          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
        />
        <select
          value={data.category}
          onChange={e => setData({ ...data, category: e.target.value })}
          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
        >
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <input
          value={data.description}
          onChange={e => setData({ ...data, description: e.target.value })}
          placeholder="Description (what this prompt does)"
          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
        />
        <textarea
          value={data.prompt_text}
          onChange={e => setData({ ...data, prompt_text: e.target.value })}
          placeholder="Prompt text (use [BRACKETED] variables for dynamic values)"
          rows={10}
          className="w-full p-3 rounded-lg border border-border bg-background text-sm font-mono focus:border-primary outline-none resize-y"
        />
        <select
          value={data.target_model}
          onChange={e => setData({ ...data, target_model: e.target.value })}
          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
        >
          <option value="automatic">Automatic</option>
          <option value="gemini_3_flash">Gemini 3 Flash (fast, cheap)</option>
          <option value="gpt_5_mini">GPT-5 Mini</option>
          <option value="claude_sonnet_5">Claude Sonnet 5</option>
          <option value="claude_opus_5">Claude Opus 5 (most capable)</option>
          <option value="gpt_5_4">GPT-5.4</option>
          <option value="gemini_3_1_pro">Gemini 3.1 Pro</option>
        </select>
        <button
          onClick={() => onSave(data)}
          disabled={!data.name || !data.prompt_text}
          className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {prompt ? 'Save Changes' : 'Create Prompt'}
        </button>
      </div>
    </div>
  );
}