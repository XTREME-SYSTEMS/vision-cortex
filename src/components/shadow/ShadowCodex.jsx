import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  EyeOff, Database, Cpu, FileText, Workflow, Code2, BookOpen,
  ChevronDown, ChevronRight, Terminal, Shield, Zap, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  shadowIdentity, entityAccess, allFunctions, promptLibrary,
  autonomousWorkflows, extensionGuide
} from './codexData';

const TABS = [
  { id: 'identity', label: 'Identity', icon: EyeOff },
  { id: 'access', label: 'Entity Access', icon: Database },
  { id: 'functions', label: 'Functions', icon: Cpu },
  { id: 'prompts', label: 'Prompt Library', icon: FileText },
  { id: 'workflows', label: 'Automation', icon: Workflow },
  { id: 'extend', label: 'How to Program', icon: Code2 },
];

function IdentityTab() {
  return (
    <div className="space-y-3">
      <Card className="p-4 border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-center gap-2 mb-2">
          <EyeOff className="w-4 h-4 text-emerald-600" />
          <p className="text-sm font-semibold">Shadow — System Prompt (verbatim)</p>
        </div>
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
          {shadowIdentity.systemPrompt}
        </pre>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: 'Model', value: shadowIdentity.model },
          { label: 'Memory', value: shadowIdentity.memory },
          { label: 'Access', value: 'Unrestricted' },
          { label: 'Visibility', value: 'Owner only' },
        ].map((s) => (
          <Card key={s.label} className="p-2.5 text-center">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="text-xs font-medium mt-0.5">{s.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AccessTab() {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Every entity Shadow can read, create, update, and delete — unrestricted.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {entityAccess.map((e) => (
          <Card key={e.name} className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium font-mono">{e.name}</p>
              <div className="flex gap-1">
                {e.ops.map((op) => (
                  <Badge key={op} variant="outline" className={cn(
                    'text-[9px] capitalize',
                    op === 'read' && 'text-blue-600 border-blue-500/30',
                    op === 'create' && 'text-emerald-600 border-emerald-500/30',
                    op === 'update' && 'text-amber-600 border-amber-500/30',
                    op === 'delete' && 'text-rose-600 border-rose-500/30',
                  )}>{op[0].toUpperCase()}</Badge>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FunctionsTab() {
  const [filter, setFilter] = useState('all');
  const cats = ['all', ...new Set(allFunctions.map((f) => f.cat))];
  const filtered = filter === 'all' ? allFunctions : allFunctions.filter((f) => f.cat === filter);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        {cats.map((c) => (
          <Button
            key={c}
            size="sm"
            variant={filter === c ? 'default' : 'outline'}
            onClick={() => setFilter(c)}
            className="rounded-full h-7 px-3 text-xs capitalize"
          >
            {c} ({c === 'all' ? allFunctions.length : allFunctions.filter((f) => f.cat === c).length})
          </Button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map((f, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-start gap-2">
              <Terminal className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-mono font-medium">{f.name}</p>
                  <Badge variant="secondary" className="text-[9px]">{f.cat}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PromptsTab() {
  const [expanded, setExpanded] = useState(null);
  const cats = [...new Set(promptLibrary.map((p) => p.cat))];

  return (
    <div className="space-y-4">
      {cats.map((cat) => (
        <div key={cat}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">{cat}</p>
          <div className="space-y-1.5">
            {promptLibrary.filter((p) => p.cat === cat).map((p, i) => {
              const key = `${cat}-${i}`;
              const isOpen = expanded === key;
              return (
                <Card key={key} className="p-2.5">
                  <button
                    onClick={() => setExpanded(isOpen ? null : key)}
                    className="w-full flex items-center gap-2 text-left"
                  >
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                    <code className="text-xs font-medium text-emerald-600">{p.name}</code>
                  </button>
                  {isOpen && (
                    <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed mt-2 pl-5 border-l-2 border-border">
                      {p.prompt}
                    </pre>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkflowsTab() {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Autonomous workflows that run without human intervention — scheduled or triggered by entity changes.</p>
      {autonomousWorkflows.map((w, i) => (
        <Card key={i} className="p-3">
          <div className="flex items-center gap-2">
            <Workflow className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{w.name}</p>
              <p className="text-xs text-muted-foreground">{w.desc}</p>
            </div>
            <Badge variant="outline" className="text-[9px] shrink-0">{w.trigger}</Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ExtendTab() {
  return (
    <div className="space-y-3">
      <Card className="p-4 border-blue-500/20 bg-blue-500/5">
        <p className="text-sm font-semibold flex items-center gap-1.5 mb-1">
          <Code2 className="w-4 h-4 text-blue-600" /> How to Program Shadow Without Limits
        </p>
        <p className="text-xs text-muted-foreground">
          Shadow is extended by adding backend functions, granting access, and wiring workflows. Every step below makes Shadow more capable — there is no hard limit on what you can add.
        </p>
      </Card>
      <div className="space-y-2">
        {extensionGuide.map((g) => (
          <Card key={g.step} className="p-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {g.step}
              </div>
              <div>
                <p className="text-sm font-medium">{g.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{g.desc}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card className="p-3 border-amber-500/20 bg-amber-500/5">
        <p className="text-xs flex items-start gap-2">
          <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span><strong>Governance is mandatory:</strong> Shadow operates under ethics review, opsec review, and the prime directive. No illegal methods, no harm to users, no deception. The system blocks actions that violate these.</span>
        </p>
      </Card>
    </div>
  );
}

export default function ShadowCodex() {
  const [tab, setTab] = useState('identity');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" /> Shadow Codex — Full Transparency
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Everything Shadow is, can do, and how to extend it — pulled directly from the codebase.
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              tab === t.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'identity' && <IdentityTab />}
      {tab === 'access' && <AccessTab />}
      {tab === 'functions' && <FunctionsTab />}
      {tab === 'prompts' && <PromptsTab />}
      {tab === 'workflows' && <WorkflowsTab />}
      {tab === 'extend' && <ExtendTab />}
    </div>
  );
}