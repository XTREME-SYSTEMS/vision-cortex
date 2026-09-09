'use client'

import { useState } from 'react'
import { Wrench, Sparkles, Code2, Database, Globe, Download, Copy, Check } from 'lucide-react'

export default function BuilderPage() {
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Generate a complete system specification for: ${prompt}. Include: entities (with fields and types), API routes, pages, and components. Return as JSON with keys: entities, api_routes, pages, components.`,
          model: 'anthropic/claude-sonnet-4.6',
        }),
      })
      const data = await res.json()
      const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result
      setResult(parsed)
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : 'Generation failed' })
    } finally {
      setLoading(false)
    }
  }

  const templates = [
    { name: 'SaaS App', icon: Database, desc: 'Auth + dashboard + CRUD + billing' },
    { name: 'Landing Page', icon: Globe, desc: 'Hero + features + pricing + CTA' },
    { name: 'Clone System', icon: Copy, desc: 'Clone any URL with deep architecture' },
    { name: 'API Service', icon: Code2, desc: 'REST API + auth + rate limiting' },
  ]

  return (
    <div className="flex flex-col h-full p-8 overflow-y-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">System Generator</h1>
        </div>
        <p className="text-muted-foreground">Describe what you want to build and the AI generates the complete system</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {templates.map(t => (
          <button key={t.name} onClick={() => setPrompt(`Build a ${t.name}: ${t.desc}`)}
            className="p-4 bg-secondary/30 border border-border rounded-xl hover:border-primary text-left">
            <t.icon className="w-5 h-5 text-primary mb-2" />
            <div className="font-medium text-sm">{t.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{t.desc}</div>
          </button>
        ))}
      </div>

      <div className="bg-secondary/30 border border-border rounded-xl p-4 mb-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the system you want to build... e.g., 'Build a CRM with contacts, deals, activities, and a dashboard with charts'"
          rows={4}
          className="w-full bg-transparent text-sm resize-none focus:outline-none"
        />
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={generate} disabled={!prompt.trim() || loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
          {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Generating...' : 'Generate System'}
        </button>
        {result && !result.error && (
          <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-foreground rounded-lg hover:bg-secondary/80">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
        )}
      </div>

      {result && (
        <div className="bg-secondary/30 border border-border rounded-xl p-6 overflow-auto">
          {result.error ? (
            <div className="text-red-500">Error: {result.error}</div>
          ) : (
            <div className="space-y-4">
              {result.entities && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2"><Database className="w-4 h-4 text-primary" /> Entities</h3>
                  <div className="space-y-2">
                    {result.entities.map((e: any, i: number) => (
                      <div key={i} className="bg-background/50 rounded-lg p-3">
                        <div className="font-medium text-sm">{e.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{(e.fields || []).map((f: any) => `${f.name}: ${f.type}`).join(', ')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {result.pages && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Pages</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.pages.map((p: any, i: number) => (
                      <span key={i} className="px-3 py-1 bg-background/50 rounded text-xs">{p.name || p}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.api_routes && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2"><Code2 className="w-4 h-4 text-primary" /> API Routes</h3>
                  <div className="space-y-1">
                    {result.api_routes.map((r: any, i: number) => (
                      <div key={i} className="text-xs font-mono text-muted-foreground">{r.method || 'GET'} {r.path || r}</div>
                    ))}
                  </div>
                </div>
              )}
              <details>
                <summary className="cursor-pointer text-sm text-muted-foreground">Full JSON</summary>
                <pre className="mt-2 p-3 bg-background/50 rounded text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  )
}