import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// ============================================================================
// ragRetrieval — Retrieval-Augmented Generation layer for Vision Cortex.
//
// Retrieves relevant context from the system's knowledge base (CoreDocuments,
// IntelFeed, KnowledgeQuests, SystemPrompts) by category + keyword relevance,
// then returns a context string ready to inject into any LLM prompt.
//
// This is the "memory fabric" retrieval that makes the AGI self-builder and
// Prime reason over accumulated knowledge instead of from scratch.
//
// Actions:
//   retrieve — given a query + optional category, return ranked context
//   embed    — store a knowledge chunk for future retrieval (writes to
//              CoreDocument with document_type='knowledge_chunk')
// ============================================================================

// Simple keyword-overlap relevance scorer (TF-style, no external vector DB).
function scoreDoc(query: string, text: string): number {
  if (!text || !query) return 0;
  const qTerms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
  const lower = text.toLowerCase();
  let score = 0;
  for (const t of qTerms) {
    const matches = lower.split(t).length - 1;
    score += matches;
  }
  return score;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }
    const sr = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'retrieve';

    // ── EMBED: store a knowledge chunk ──
    if (action === 'embed') {
      const { title, content, category, source } = body;
      if (!content) return Response.json({ error: 'content required' }, { status: 400 });
      const doc = await sr.CoreDocument.create({
        document_type: 'knowledge_chunk',
        title: title || 'Untitled knowledge chunk',
        content,
        version: '1.0.0',
        status: 'active',
        // Store category + source in metadata-like fields if the schema allows
      }).catch((e) => { throw new Error('Embed failed: ' + e.message); });
      return Response.json({ ok: true, id: doc.id, message: 'Knowledge chunk embedded' });
    }

    // ── RETRIEVE: ranked context from the knowledge base ──
    const query = (body?.query || '').trim();
    const category = (body?.category || '').trim().toLowerCase();
    const topK = Math.min(parseInt(body?.top_k) || 5, 20);

    if (!query) return Response.json({ error: 'query required' }, { status: 400 });

    const candidates: { id: string; title: string; text: string; score: number; source: string; category: string }[] = [];

    // 1. CoreDocuments (blueprints, architecture, knowledge chunks)
    try {
      const docs = await sr.CoreDocument.list('-updated_date', 50);
      for (const d of docs) {
        const text = (d.title || '') + ' ' + (d.content || '');
        let score = scoreDoc(query, text);
        if (category && (d.document_type || '').toLowerCase().includes(category)) score += 5;
        if (score > 0) candidates.push({ id: d.id, title: d.title || '', text: d.content || '', score, source: 'CoreDocument', category: d.document_type || '' });
      }
    } catch {}

    // 2. IntelFeed (gathered intelligence)
    try {
      const intel = await sr.IntelFeed.list('-created_date', 50);
      for (const i of intel) {
        const text = (i.title || '') + ' ' + (i.summary || '') + ' ' + (i.content || '');
        let score = scoreDoc(query, text);
        if (category && (i.category || '').toLowerCase() === category) score += 5;
        if (score > 0) candidates.push({ id: i.id, title: i.title || '', text: (i.summary || '') + ' ' + (i.content || ''), score, source: 'IntelFeed', category: i.category || '' });
      }
    } catch {}

    // 3. KnowledgeQuests (research threads)
    try {
      const quests = await sr.KnowledgeQuest.list('-created_date', 30);
      for (const q of quests) {
        const text = (q.question || '') + ' ' + (q.finding || '') + ' ' + (q.synthesis || '');
        let score = scoreDoc(query, text);
        if (score > 0) candidates.push({ id: q.id, title: q.question || '', text: (q.finding || '') + ' ' + (q.synthesis || ''), score, source: 'KnowledgeQuest', category: q.category || '' });
      }
    } catch {}

    // 4. SystemPrompts (master prompt library — category-tagged knowledge)
    try {
      const prompts = await sr.SystemPrompt.filter({ active: true }, '-effectiveness_score', 30);
      for (const p of prompts) {
        const text = (p.name || '') + ' ' + (p.description || '') + ' ' + (p.prompt_text || '');
        let score = scoreDoc(query, text) * 0.5; // prompts are lower-priority context
        if (category && (p.category || '').toLowerCase() === category) score += 3;
        if (score > 0) candidates.push({ id: p.id, title: p.name || '', text: (p.description || '') + '\n' + (p.prompt_text || '').slice(0, 500), score, source: 'SystemPrompt', category: p.category || '' });
      }
    } catch {}

    // Rank + take top K
    candidates.sort((a, b) => b.score - a.score);
    const top = candidates.slice(0, topK);

    // Build the context string for injection
    const contextBlock = top.length
      ? top.map((c, i) =>
          `[${i + 1}] (${c.source}/${c.category}) ${c.title}\n${c.text.slice(0, 800)}`
        ).join('\n\n---\n\n')
      : '';

    return Response.json({
      ok: true,
      query,
      category,
      retrieved: top.length,
      context: contextBlock,
      sources: top.map((c) => ({ id: c.id, source: c.source, title: c.title, score: c.score })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}