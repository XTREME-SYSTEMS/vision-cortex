import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Loader2, RefreshCw, ExternalLink, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function QuestDetail({ quest, onClose, onResearch, researching }) {
  if (!quest) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <FileText className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">Select a quest to view its research</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Badge variant="outline" className="text-[9px] uppercase tracking-wide">{quest.category?.replace(/_/g, ' ')}</Badge>
            <Badge variant="outline" className="text-[9px] capitalize">{quest.status}</Badge>
            {quest.word_count > 0 && <span className="text-[10px] text-muted-foreground">{quest.word_count} words</span>}
          </div>
          <h2 className="font-display text-base tracking-tight line-clamp-2">{quest.topic}</h2>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {quest.status === 'pending' && (
            <Button size="sm" variant="outline" onClick={() => onResearch(quest)} disabled={researching} className="h-8">
              {researching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Research
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8"><X className="w-4 h-4" /></Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {quest.status === 'pending' && !quest.answer && (
          <p className="text-muted-foreground text-sm text-center py-8">This quest has not been researched yet. Click "Research" to begin gathering intelligence.</p>
        )}
        {quest.status === 'researching' && !quest.answer && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Researching using web search and AI…
          </div>
        )}
        {quest.status === 'failed' && (
          <p className="text-rose-500 text-sm py-4">Research failed: {quest.validation_notes || 'Unknown error'}</p>
        )}
        {quest.answer && (
          <div className="text-sm leading-relaxed space-y-1">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-lg font-display font-semibold mt-5 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-display font-semibold mt-5 mb-2 text-foreground">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mt-4 mb-1.5 text-foreground">{children}</h3>,
                p: ({ children }) => <p className="mb-3 text-muted-foreground">{children}</p>,
                li: ({ children }) => <li className="ml-4 list-disc text-muted-foreground">{children}</li>,
                ul: ({ children }) => <ul className="mb-3 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="mb-3 space-y-0.5 list-decimal ml-4">{children}</ol>,
                strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
                code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-border pl-3 italic text-muted-foreground my-2">{children}</blockquote>,
              }}
            >
              {quest.answer}
            </ReactMarkdown>
          </div>
        )}
        {quest.sources?.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border/60">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">Sources ({quest.sources.length})</p>
            <div className="space-y-1">
              {quest.sources.map((s, i) => (
                <a key={i} href={s} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-sky-500 hover:underline truncate">
                  <ExternalLink className="w-3 h-3 shrink-0" /> <span className="truncate">{s}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}