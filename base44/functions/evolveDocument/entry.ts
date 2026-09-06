import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { secrets } from 'base44:runtime';

// Document Evolution Cascade Engine
// When a CoreDocument changes, this function finds all dependent documents
// and regenerates them via Groq (zero Base44 credits) to maintain system consistency.
// The Codex Keeper agent is responsible for invoking this.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';

async function groqEvolve(sourceDoc, dependentDoc) {
  const key = secrets.get('GROQ_API_KEY');
  if (!key) throw new Error('GROQ_API_KEY not set');

  const prompt = `You are the Codex Keeper — guardian of the Vision Cortex document ecosystem.

The source document "${sourceDoc.title}" has been updated. You must update the dependent document "${dependentDoc.title}" to reflect these changes and maintain consistency across the entire system.

SOURCE DOCUMENT (new version — ${sourceDoc.document_id} v${sourceDoc.version}):
${sourceDoc.content}

DEPENDENT DOCUMENT (current — ${dependentDoc.document_id} v${dependentDoc.version}):
${dependentDoc.content}

INSTRUCTIONS:
1. Update the dependent document to be fully consistent with the new source
2. Preserve the dependent document's structure, purpose, and formatting
3. Only change sections that are actually affected by the source changes
4. If the source change does not affect this document, return the content unchanged
5. Output ONLY the complete updated document content in markdown — no explanations, no preamble`;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: 'You are the Codex Keeper — guardian of the Vision Cortex document ecosystem. You ensure all system documents remain consistent when any document changes. You output only updated document content in markdown, never explanations.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 4000
    })
  });

  if (!res.ok) { const err = await res.text(); throw new Error(`Groq error: ${err}`); }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function groqValidate(documents) {
  const key = secrets.get('GROQ_API_KEY');
  if (!key) throw new Error('GROQ_API_KEY not set');

  const docSummaries = documents.map(d => `- ${d.document_id} v${d.version}: ${d.title}`).join('\n');
  const prompt = `You are the Codex Keeper. Validate the consistency of this document ecosystem. Output a JSON object with a validation_score (0-1) and any inconsistencies found.

Documents:
${docSummaries}

Return JSON: {"validation_score": 0.0-1.0, "inconsistencies": ["issue1", "issue2"], "recommendations": ["rec1"]}`;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: 'You are a document consistency validator. Output only JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1000
    })
  });

  if (!res.ok) { const err = await res.text(); throw new Error(`Groq error: ${err}`); }
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

function bumpVersion(version) {
  const parts = (version || '1.0.0').split('.').map(Number);
  return `${parts[0] || 1}.${(parts[1] || 0) + 1}.${parts[2] || 0}`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: cron token OR admin
    const cronToken = req.headers.get('x-cron-token') || '';
    const expectedKey = secrets.get('VISION_CORTEX_WEBHOOK_KEY');
    let authorized = false;
    if (cronToken && expectedKey && cronToken === expectedKey) {
      authorized = true;
    } else {
      try {
        const user = await base44.auth.me();
        if (user && user.role === 'admin') authorized = true;
      } catch {}
    }
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'evolve';

    // VALIDATE MODE — validate entire document ecosystem
    if (mode === 'validate') {
      const allDocs = await base44.entities.CoreDocument.list('-created_date', 200);
      if (!allDocs || allDocs.length === 0) {
        return Response.json({ error: 'No core documents found. Run bootstrap first.' }, { status: 400 });
      }
      const validation = await groqValidate(allDocs);

      // Update validation scores
      for (const doc of allDocs) {
        await base44.entities.CoreDocument.update(doc.id, {
          validation_score: validation.validation_score || 0
        });
      }

      return Response.json({
        ok: true,
        mode: 'validate',
        documents_validated: allDocs.length,
        validation_score: validation.validation_score,
        inconsistencies: validation.inconsistencies || [],
        recommendations: validation.recommendations || [],
        zero_credit: true
      });
    }

    // EVOLVE MODE (default) — cascade evolution from a source document
    const { source_document_id, trigger, change_description } = body;
    if (!source_document_id) {
      return Response.json({ error: 'source_document_id required (or set mode=validate)' }, { status: 400 });
    }

    // Get all documents
    const allDocs = await base44.entities.CoreDocument.list('-created_date', 200);
    const sourceDoc = allDocs.find(d => d.document_id === source_document_id);
    if (!sourceDoc) {
      return Response.json({ error: `Document ${source_document_id} not found` }, { status: 404 });
    }

    // Create evolution event
    const eventId = `EVT-${Date.now()}`;
    const event = await base44.entities.DocumentEvolution.create({
      event_id: eventId,
      source_document_id,
      source_document_title: sourceDoc.title,
      change_type: 'cascade',
      change_description: change_description || `Evolution cascade from ${source_document_id}`,
      status: 'processing',
      trigger: trigger || 'manual',
      agent_name: 'codex_keeper',
      started_at: new Date().toISOString()
    });

    // BFS cascade through dependents
    const visited = new Set([source_document_id]);
    const queue = [source_document_id];
    const cascaded = [];

    while (queue.length > 0) {
      const currentId = queue.shift();
      const currentDoc = allDocs.find(d => d.document_id === currentId);
      if (!currentDoc) continue;

      const dependents = currentDoc.dependents || [];
      for (const depId of dependents) {
        if (visited.has(depId)) continue;
        visited.add(depId);
        queue.push(depId);

        const depDoc = allDocs.find(d => d.document_id === depId);
        if (!depDoc) continue;

        try {
          // Evolve via Groq
          const newContent = await groqEvolve(currentDoc, depDoc);
          const oldVersion = depDoc.version || '1.0.0';
          const newVersion = bumpVersion(oldVersion);

          await base44.entities.CoreDocument.update(depDoc.id, {
            content: newContent,
            version: newVersion,
            last_evolved_at: new Date().toISOString(),
            last_evolved_by: 'codex_keeper',
            evolution_count: (depDoc.evolution_count || 0) + 1,
            status: 'active'
          });

          cascaded.push({
            document_id: depId,
            title: depDoc.title,
            old_version: oldVersion,
            new_version: newVersion,
            status: 'evolved'
          });
        } catch (e) {
          cascaded.push({
            document_id: depId,
            title: depDoc.title,
            status: 'failed',
            error: e.message
          });
        }
      }
    }

    // Update evolution event
    const successCount = cascaded.filter(c => c.status === 'evolved').length;
    const validationScore = cascaded.length > 0 ? successCount / cascaded.length : 1.0;

    await base44.entities.DocumentEvolution.update(event.id, {
      status: cascaded.length > 0 ? 'completed' : 'completed',
      cascaded_documents: cascaded,
      cascaded_count: cascaded.length,
      validation_score: validationScore,
      completed_at: new Date().toISOString()
    });

    return Response.json({
      ok: true,
      event_id: eventId,
      source_document: source_document_id,
      cascaded,
      cascaded_count: cascaded.length,
      validation_score: validationScore,
      zero_credit: true,
      groq_model: GROQ_MODEL
    });
  } catch (error) {
    return Response.json({ error: error.message, zero_credit: true, timestamp: new Date().toISOString() }, { status: 500 });
  }
}