import React, { useEffect, useMemo, useState } from 'react';
import { FileCode, FileText, Search, Loader2, Upload, ShieldCheck, AlertTriangle } from 'lucide-react';
import { loadZipFromUrl, loadZipFromFile } from '@/lib/zipBrowser';
import MarkdownContent from '@/components/MarkdownContent';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const DEFAULT_URL = 'https://media.base44.com/files/public/6a9342ffbeff8b7c5a7bff8a/b620f3c55_lead-growth-forge5.zip';

const AUDIT = `## AutoBuilder OS / Xtreme AI — Forensic Audit

**Scale:** 97 entities · 147 functions · 27 workflows · 119 pages · 4 agents

### 🔴 Critical
- **69 of 97 entities have no RLS** → any logged-in client can read/write every other client's invoices, deals, contacts, accounts.
- Sensitive open tables: \`Account\`, \`Contact\`, \`CustomerProfile\`, \`Deal\`, \`Invoice\`, \`Expense\`, \`Quote\`, \`Campaign\`, \`ProvisioningRecord\`.

### 🟠 High
- **\`chief_architect\` agent = god-mode** (~100 functions, ~70 entities, incl. spend + provisioning + self-modification) with no visible admin gate.
- **27 autonomous workflows** incl. \`Auto-Deploy New Domain\`, \`Auto-Provision Market\`, \`SERP Competitor Cloner\` — verify approval gates before spend/deploy/clone.

### ✅ Solid
- Zero hardcoded secrets · no file/shell RCE · payment webhook JWT-verified · self-modifying functions admin-gated · tenant RLS that exists is well-designed.

> Browse the code below to plan fixes. Full remediation: add tenant/ownership RLS to the 69 open entities, gate \`chief_architect\` to admin, verify workflow approval gates.`;

function isText(name) {
  return /\.(ts|tsx|js|jsx|json|jsonc|md|mdx|css|html|txt|env|yml|yaml|sh)$/i.test(name);
}

function fmtSize(n) {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(2) + ' MB';
}

export default function Codebase() {
  const [zip, setZip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(null);
  const [content, setContent] = useState('');
  const [fileLoading, setFileLoading] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  async function load(src) {
    setLoading(true); setError(''); setZip(null); setActive(null); setContent('');
    try {
      const z = typeof src === 'string' ? await loadZipFromUrl(src) : await loadZipFromFile(src);
      setZip(z);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(DEFAULT_URL); }, []);

  const files = zip?.files || [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? files.filter((f) => f.name.toLowerCase().includes(q)) : files;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [files, query]);

  async function openFile(f) {
    setActive(f);
    setContent('');
    setFileLoading(true);
    try {
      setContent(await zip.getContent(f));
    } catch (e) {
      setContent('Error reading file: ' + (e.message || e));
    } finally {
      setFileLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Codebase Forensics</h1>
          <p className="text-sm text-muted-foreground">
            {zip ? `${zip.fileCount} files · ${fmtSize(zip.bytes)} packed` : 'Extract & browse any zip in-app — no upload leaves the browser.'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAudit((s) => !s)}>
            <ShieldCheck className="w-4 h-4" /> Audit
          </Button>
          <label className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-transparent text-sm hover:bg-accent cursor-pointer">
            <Upload className="w-4 h-4" /> Upload zip
            <input
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f); }}
            />
          </label>
        </div>
      </div>

      {showAudit && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <MarkdownContent content={AUDIT} />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid md:grid-cols-[300px_1fr] gap-4">
        <aside className="md:sticky md:top-20 md:self-start md:max-h-[calc(100vh-7rem)] flex flex-col rounded-2xl border border-border/60 bg-card/30 overflow-hidden">
          <div className="p-3 border-b border-border/60">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter files…"
                className="pl-8 h-9"
              />
            </div>
          </div>
          <div className="overflow-y-auto p-2 flex-1 min-h-0">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-0.5">
                {filtered.slice(0, 400).map((f) => {
                  const on = active?.name === f.name;
                  const Icon = /\.(md|mdx|txt)$/i.test(f.name) ? FileText : FileCode;
                  return (
                    <button
                      key={f.name}
                      onClick={() => openFile(f)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[12.5px] leading-tight ${
                        on ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                      title={f.name}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </button>
                  );
                })}
                {filtered.length > 400 && (
                  <p className="px-2.5 py-2 text-[11px] text-muted-foreground">+ {filtered.length - 400} more — refine filter</p>
                )}
              </div>
            )}
          </div>
        </aside>

        <article className="min-w-0 rounded-2xl border border-border/60 bg-card/30 overflow-hidden">
          {!active ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Select a file to inspect it. The default load is the AutoBuilder OS / Xtreme AI codebase.
            </div>
          ) : fileLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : /\.(md|mdx)$/i.test(active.name) ? (
            <div className="p-6 md:p-8 max-w-3xl"><MarkdownContent content={content} /></div>
          ) : isText(active.name) ? (
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 text-[11px] text-muted-foreground">
              <span className="truncate">{active.name}</span>
              <span>{fmtSize(active.size)}</span>
            </div>
          ) : null}
          {active && !fileLoading && isText(active.name) && !/\.mdx?$/i.test(active.name) && (
            <pre className="p-4 overflow-x-auto text-[12.5px] leading-6 font-mono max-h-[calc(100vh-14rem)] overflow-y-auto">{content}</pre>
          )}
          {active && !isText(active.name) && (
            <div className="p-10 text-center text-sm text-muted-foreground">Binary file — not previewable.</div>
          )}
        </article>
      </div>
    </div>
  );
}