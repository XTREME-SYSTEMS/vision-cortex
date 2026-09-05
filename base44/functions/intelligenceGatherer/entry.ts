import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const RESEARCH_PROMPT = (topic, question, category, depth) => `You are the OBSESSIVE INTELLIGENCE SEEKER — the core archetype of Vision Cortex, an autonomous business operating system. Your nature is to relentlessly seek, gather, validate, and distribute intelligence.

RESEARCH MISSION:
Topic: ${topic}
Category: ${category}
Specific Question: ${question || topic}
Depth: ${depth}

INSTRUCTIONS — follow ALL of these:
1. Use web search to find the most current, accurate, validated information on this topic.
2. Be FULLY HONEST and TRANSPARENT. If something is uncertain, say so explicitly. Never fabricate.
3. Be DESCRIPTIVE and EXHAUSTIVE. Do not be vague, ambiguous, or misleading. Do not hold back details.
4. Provide MULTIPLE PERSPECTIVES — approach this as if 10 different specialized AI agents (strategist, engineer, financier, marketer, researcher, critic, optimist, pessimist, pragmatist, visionary) are each contributing their expertise.
5. OVER-EXPLAIN so readers from different backgrounds (technical, business, creative, beginner) can all understand.
6. Provide CONCRETE EXAMPLES wherever the topic permits — real-world cases, step-by-step guides, numbers, timelines.
7. For "top N" lists, provide as many items as possible (aim for the full N) with a brief explanation for each.
8. Focus on PRACTICAL, IMPLEMENTABLE intelligence — not just theory. Include actionable steps.
9. If the topic involves money or wealth, include SPECIFIC NUMBERS, realistic ranges, and timelines.
10. If the topic involves AI or technology, include specific tools, models, frameworks, and costs.
11. VALIDATE your answers — note what sources confirm key claims and your confidence level.
12. If the topic involves the epoxy/concrete/polished concrete industry, include industry-specific data, market sizes, pricing, and competitors.

FORMAT YOUR RESPONSE IN MARKDOWN:
## Executive Summary
[2-3 paragraph overview of the most critical findings]

## Deep Analysis
[Comprehensive, exhaustive analysis — this should be the bulk of your answer. Break into sub-sections with ### headers as needed. Cover every angle.]

## Multiple Expert Perspectives
[At least 3-5 different expert viewpoints — label each perspective (e.g., "The Strategist's View", "The Engineer's View")]

## Examples & Implementation
[Concrete examples, case studies, step-by-step guides, or real-world applications]

## Validation & Confidence
[What sources confirm this, uncertainties, confidence level (high/medium/low), and what would need verification]

## Action Plan for Vision Cortex
[Specific next steps the system should take with this intelligence — how to implement, distribute, and profit from it]

## Sources
[List all sources, URLs, and references found during research]

Be thorough. Be obsessive. Leave no stone unturned. The reader's life should be significantly enhanced — operationally, financially, and educationally — by your answer.`;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const mode = body?.mode;
    const questId = body?.quest_id;
    const topic = body?.topic;
    const category = body?.category || 'other';
    const question = body?.question || '';
    const depth = body?.depth || 'deep';

    let quest;

    if (mode === 'next_pending') {
      const pending = await base44.asServiceRole.entities.KnowledgeQuest.filter({ status: 'pending' }, 'priority', 1);
      if (!pending || pending.length === 0) return Response.json({ status: 'no_pending_quests' });
      quest = pending[0];
    } else if (questId) {
      quest = await base44.asServiceRole.entities.KnowledgeQuest.get(questId);
      if (!quest) return Response.json({ error: 'Quest not found' }, { status: 404 });
    } else if (topic) {
      quest = await base44.asServiceRole.entities.KnowledgeQuest.create({
        topic,
        category,
        question,
        depth,
        status: 'researching',
        priority: body?.priority || 3,
      });
    } else {
      return Response.json({ error: 'Provide quest_id or topic' }, { status: 400 });
    }

    // Mark as researching
    await base44.asServiceRole.entities.KnowledgeQuest.update(quest.id, {
      status: 'researching',
      researched_at: new Date().toISOString(),
    });

    const prompt = RESEARCH_PROMPT(
      quest.topic || topic,
      quest.question || question,
      quest.category || category,
      quest.depth || depth
    );

    // Primary research with web search
    let answer = '';
    let sources = [];
    try {
      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
      });
      answer = typeof llmRes === 'string' ? llmRes : llmRes?.response || String(llmRes || '');
    } catch (err) {
      // Fallback without web search if gemini fails
      try {
        const fallbackRes = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
        answer = typeof fallbackRes === 'string' ? fallbackRes : fallbackRes?.response || String(fallbackRes || '');
      } catch (err2) {
        throw new Error('Research failed: ' + err.message + ' / ' + err2.message);
      }
    }

    // Extract sources from the answer (lines starting with http)
    const sourceMatches = answer.match(/https?:\/\/[^\s)\]]+/g);
    if (sourceMatches) {
      sources = [...new Set(sourceMatches)].slice(0, 30);
    }

    // Generate summary
    let summary = '';
    try {
      const summaryRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Summarize the following research in 2-3 sentences. Be concise and capture the most critical findings:\n\n${answer.slice(0, 8000)}`,
      });
      summary = typeof summaryRes === 'string' ? summaryRes : summaryRes?.response || '';
    } catch {
      summary = answer.slice(0, 200);
    }

    const wordCount = answer.split(/\s+/).filter(Boolean).length;

    // If answer is too large for entity field, upload as file and store truncated version
    const MAX_FIELD_SIZE = 14000;
    let storedAnswer = answer;
    let answerFileUrl = null;

    if (answer.length > MAX_FIELD_SIZE) {
      try {
        const blob = new Blob([answer], { type: 'text/markdown' });
        const file = new File([blob], `quest-${quest.id}.md`, { type: 'text/markdown' });
        const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file });
        answerFileUrl = uploadRes?.file_url || null;
        storedAnswer = answer.slice(0, MAX_FIELD_SIZE) + '\n\n---\n\n> **[Full exhaustive answer (' + wordCount + ' words) stored as file]** → ' + (answerFileUrl || 'upload failed') + '\n';
      } catch (uploadErr) {
        storedAnswer = answer.slice(0, MAX_FIELD_SIZE) + '\n\n---\n\n> *[Answer truncated at ' + MAX_FIELD_SIZE + ' chars — full ' + wordCount + ' words]*\n';
      }
    }

    // Update quest with answer
    await base44.asServiceRole.entities.KnowledgeQuest.update(quest.id, {
      status: 'complete',
      answer: storedAnswer,
      summary,
      sources,
      validated: true,
      word_count: wordCount,
      completed_at: new Date().toISOString(),
    });

    // Log to AgentLog
    try {
      await base44.asServiceRole.entities.AgentLog.create({
        agent_name: 'Intelligence Seeker',
        action: 'research_complete',
        details: `Researched: ${quest.topic || topic} (${wordCount} words, ${sources.length} sources)`,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return Response.json({
      quest_id: quest.id,
      status: 'complete',
      word_count: wordCount,
      sources_count: sources.length,
      summary,
    });
  } catch (error) {
    // Mark quest as failed if we have the id
    try {
      const body = await req.clone().json();
      if (body?.quest_id) {
        const base44 = createClientFromRequest(req);
        await base44.asServiceRole.entities.KnowledgeQuest.update(body.quest_id, {
          status: 'failed',
          validation_notes: error.message,
        });
      }
    } catch {}
    return Response.json({ error: error.message }, { status: 500 });
  }
}