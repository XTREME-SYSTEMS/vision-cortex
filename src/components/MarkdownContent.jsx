import React from 'react';
import ReactMarkdown from 'react-markdown';

// Styled markdown renderer — gives the playbooks real visual hierarchy
// (headings, tables, lists, code) without relying on @tailwindcss/typography.
const components = {
  h1: ({ node, ...p }) => <h1 className="font-display text-3xl md:text-4xl tracking-tight mt-10 mb-5 first:mt-0 leading-tight" {...p} />,
  h2: ({ node, ...p }) => <h2 className="font-display text-2xl md:text-[28px] tracking-tight mt-12 mb-4 pb-2 border-b border-border/60 leading-snug" {...p} />,
  h3: ({ node, ...p }) => <h3 className="font-display text-xl md:text-2xl tracking-tight mt-9 mb-2.5 leading-snug" {...p} />,
  h4: ({ node, ...p }) => <h4 className="font-heading font-semibold text-lg mt-6 mb-2" {...p} />,
  p: ({ node, ...p }) => <p className="text-[15px] leading-7 my-4 text-foreground/90" {...p} />,
  ul: ({ node, ...p }) => <ul className="list-disc pl-6 my-4 space-y-1.5 text-[15px] leading-7 marker:text-muted-foreground" {...p} />,
  ol: ({ node, ...p }) => <ol className="list-decimal pl-6 my-4 space-y-1.5 text-[15px] leading-7 marker:text-muted-foreground" {...p} />,
  li: ({ node, ...p }) => <li className="pl-1" {...p} />,
  a: ({ node, ...p }) => <a className="text-foreground underline underline-offset-4 decoration-foreground/40 hover:decoration-foreground transition-colors" target="_blank" rel="noreferrer" {...p} />,
  strong: ({ node, ...p }) => <strong className="font-semibold text-foreground" {...p} />,
  em: ({ node, ...p }) => <em className="italic" {...p} />,
  hr: ({ node, ...p }) => <hr className="my-8 border-border/60" {...p} />,
  blockquote: ({ node, ...p }) => <blockquote className="border-l-2 border-foreground/30 pl-4 my-5 italic text-muted-foreground" {...p} />,
  pre: ({ node, ...p }) => <pre className="my-5 p-4 rounded-xl bg-muted border border-border/60 overflow-x-auto text-[13px] leading-6 font-mono" {...p} />,
  code: ({ className, children, ...p }) =>
    className && className.startsWith('language-') ? (
      <code className="font-mono text-foreground" {...p}>{children}</code>
    ) : (
      <code className="px-1.5 py-0.5 rounded bg-muted text-[0.85em] font-mono text-foreground border border-border/40" {...p}>{children}</code>
    ),
  table: ({ node, ...p }) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full text-sm border-collapse" {...p} />
    </div>
  ),
  thead: ({ node, ...p }) => <thead className="bg-muted/50" {...p} />,
  th: ({ node, ...p }) => <th className="text-left font-semibold px-4 py-2.5 border-b border-border/60 align-top whitespace-nowrap" {...p} />,
  td: ({ node, ...p }) => <td className="px-4 py-2.5 border-b border-border/40 align-top text-foreground/90" {...p} />,
};

export default function MarkdownContent({ content, className = '' }) {
  return (
    <div className={`text-foreground ${className}`}>
      <ReactMarkdown components={components}>{content || ''}</ReactMarkdown>
    </div>
  );
}