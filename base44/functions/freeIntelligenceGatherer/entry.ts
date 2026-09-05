import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

const SYSTEM_PROMPT = `You are the OBSESSIVE INTELLIGENCE SEEKER — the core archetype of Vision Cortex. Your nature is to relentlessly seek, gather, validate, and distribute intelligence.

You are given research data gathered from FREE web sources (DuckDuckGo search, Wikipedia, and fetched web pages). Your job is to synthesize this into a comprehensive, deeply detailed answer.

RULES:
1. Be FULLY HONEST and TRANSPARENT. If the research data is insufficient, say so.
2. Be DESCRIPTIVE and EXHAUSTIVE. Do not be vague or ambiguous.
3. Provide MULTIPLE PERSPECTIVES — approach as if 10 different specialized AI agents are contributing.
4. OVER-EXPLAIN so readers from different backgrounds can all understand.
5. Provide CONCRETE EXAMPLES wherever possible — real-world cases, numbers, timelines.
6. For "top N" lists, provide as many items as possible with brief explanations.
7. Focus on PRACTICAL, IMPLEMENTABLE intelligence — not just theory.
8. If the topic involves money, include SPECIFIC NUMBERS and realistic timelines.
9. VALIDATE your answers — note confidence level and uncertainties.
10. Use the provided research data as your primary source, but you may add general knowledge.

FORMAT YOUR RESPONSE IN MARKDOWN:
## Executive Summary
[2-3 paragraph overview]

## Deep Analysis
[Comprehensive, exhaustive analysis — the bulk of your answer. Use ### sub-headers as needed.]

## Multiple Expert Perspectives
[At least 3-5 different expert viewpoints — label each]

## Examples & Implementation
[Concrete examples, case studies, step-by-step guides]

## Validation & Confidence
[Source confidence, uncertainties, what needs verification]

## Action Plan for Vision Cortex
[Specific next steps the system should take with this intelligence]

## Sources
[List sources used]`;

// --- FREE WEB SEARCH via DuckDuckGo JSON API (reliable from servers) ---
async function searchWeb(query, maxResults = 5) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VisionCortexBot/1.0)' },
    });
    if (!res.ok) return [];
    const data = await res.json();

    const results = [];

    // Abstract (main instant answer)
    if (data.AbstractText) {
      results.push({
        url: data.AbstractURL || '',
        title: data.Heading || query,
        snippet: data.AbstractText,
      });
    }

    // Related topics
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            url: topic.FirstURL,
            title: topic.Text.split(' - ')[0]?.slice(0, 100) || topic.Text.slice(0, 100),
            snippet: topic.Text,
          });
        }
        if (results.length >= maxResults) break;
      }
    }

    return results;
  } catch (e) {
    return [];
  }
}

// --- FREE WIKIPEDIA KNOWLEDGE (query API — reliable from servers) ---
async function searchWikipedia(query, maxResults = 3) {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=${maxResults}`;
    const res = await fetch(searchUrl);
    if (!res.ok) return [];
    const data = await res.json();

    const results = [];
    const searchItems = data?.query?.search || [];
    for (const item of searchItems.slice(0, maxResults)) {
      try {
        const title = item.title;
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const summaryRes = await fetch(summaryUrl);
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          results.push({
            title,
            extract: summaryData.extract || '',
            url: summaryData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
          });
        }
      } catch {}
    }
    return results;
  } catch (e) {
    return [];
  }
}

// --- FETCH URL CONTENT (strip HTML to text) ---
async function fetchUrlContent(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VisionCortexBot/1.0)' },
    });
    if (!res.ok) return '';
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<nav[\s\S]*?<\/nav>/g, '')
      .replace(/<footer[\s\S]*?<\/footer>/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    return text.slice(0, 6000);
  } catch (e) {
    return '';
  }
}

// --- FREE LLM via Groq (Llama 3.3 70B) ---
async function synthesizeWithGroq(prompt) {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) {
    console.error('GROQ_API_KEY not set');
    return null;
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 8000,
        temperature: 0.7,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('Groq API error:', res.status, errText.slice(0, 300));
      return null;
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error('Groq exception:', e.message);
    return null;
  }
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const mode = body?.mode;
    let quest;

    if (mode === 'next_pending') {
      const pending = await base44.asServiceRole.entities.KnowledgeQuest.filter({ status: 'pending' }, 'priority', 1);
      if (!pending || pending.length === 0) return Response.json({ status: 'no_pending_quests' });
      quest = pending[0];
    } else if (body?.quest_id) {
      quest = await base44.asServiceRole.entities.KnowledgeQuest.get(body.quest_id);
      if (!quest) return Response.json({ error: 'Quest not found' }, { status: 404 });
    } else {
      return Response.json({ error: 'Provide mode=next_pending or quest_id' }, { status: 400 });
    }

    // Mark as researching
    await base44.asServiceRole.entities.KnowledgeQuest.update(quest.id, {
      status: 'researching',
      researched_at: new Date().toISOString(),
    });

    // --- GATHER FREE RESEARCH DATA ---
    const [searchResults, wikiResults] = await Promise.all([
      searchWeb(quest.topic),
      searchWikipedia(quest.topic),
    ]);

    // Fetch content from top 3 search result URLs
    const topUrls = searchResults.slice(0, 3).map(r => r.url);
    const urlContents = await Promise.all(topUrls.map(u => fetchUrlContent(u).catch(() => '')));

    // Build research context
    const researchParts = [];

    if (searchResults.length > 0) {
      researchParts.push('### WEB SEARCH RESULTS (DuckDuckGo — free)');
      searchResults.forEach((r, i) => {
        researchParts.push(`${i + 1}. **${r.title}**\n   ${r.snippet}\n   URL: ${r.url}`);
      });
    }

    if (wikiResults.length > 0) {
      researchParts.push('\n### WIKIPEDIA KNOWLEDGE (free)');
      wikiResults.forEach(r => {
        researchParts.push(`**${r.title}**: ${r.extract}`);
      });
    }

    const validContents = urlContents.filter(c => c.length > 100);
    if (validContents.length > 0) {
      researchParts.push('\n### DETAILED CONTENT FROM TOP SOURCES (fetched — free)');
      validContents.forEach((c, i) => {
        researchParts.push(`Source ${i + 1}:\n${c}`);
      });
    }

    const researchContext = researchParts.join('\n\n') || 'No free research data available. Use your general knowledge.';

    const prompt = `RESEARCH MISSION:
Topic: ${quest.topic}
Category: ${quest.category}
Specific Question: ${quest.question || quest.topic}

RESEARCH DATA GATHERED FROM FREE SOURCES:
${researchContext}

Synthesize a comprehensive, deeply detailed, multi-perspective answer using this research data. Be exhaustive, honest, and practical. Include examples and an action plan.`;

    // --- SYNTHESIZE WITH FREE LLM ---
    let answer = null;
    let method = 'none';

    // Try Groq first (free, fast)
    answer = await synthesizeWithGroq(prompt);
    if (answer) method = 'groq_free';

    // Fall back to Base44 InvokeLLM with web search (costs credits)
    if (!answer) {
      try {
        const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `${SYSTEM_PROMPT}\n\n${prompt}`,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
        });
        answer = typeof llmRes === 'string' ? llmRes : llmRes?.response || '';
        method = 'base44_fallback';
      } catch (e) {
        // Last resort: store raw research data
        answer = `## Raw Research Results\n\n*LLM synthesis unavailable — no free API keys configured and Base44 fallback failed.*\n\n${researchContext}`;
        method = 'raw_free';
      }
    }

    // Collect sources
    const sources = [];
    searchResults.forEach(r => { if (r.url) sources.push(r.url); });
    wikiResults.forEach(r => { if (r.url) sources.push(r.url); });

    // Generate summary (first 200 chars if no LLM summary available)
    let summary = '';
    try {
      const summaryPrompt = `Summarize in 2-3 sentences:\n\n${answer.slice(0, 6000)}`;
      let summaryResult = await synthesizeWithGroq(summaryPrompt);
      summary = summaryResult || answer.slice(0, 200);
    } catch {
      summary = answer.slice(0, 200);
    }

    const wordCount = answer.split(/\s+/).filter(Boolean).length;

    // Handle large answers — upload as file
    const MAX_FIELD_SIZE = 14000;
    let storedAnswer = answer;

    if (answer.length > MAX_FIELD_SIZE) {
      try {
        const blob = new Blob([answer], { type: 'text/markdown' });
        const file = new File([blob], `quest-${quest.id}.md`, { type: 'text/markdown' });
        const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file });
        storedAnswer = answer.slice(0, MAX_FIELD_SIZE) + `\n\n---\n\n> **[Full exhaustive answer (${wordCount} words) stored as file]** → ${uploadRes?.file_url}\n`;
      } catch {
        storedAnswer = answer.slice(0, MAX_FIELD_SIZE) + `\n\n---\n\n> *[Answer truncated — ${wordCount} words total]*\n`;
      }
    }

    // Update quest
    await base44.asServiceRole.entities.KnowledgeQuest.update(quest.id, {
      status: 'complete',
      answer: storedAnswer,
      summary,
      sources,
      validated: method !== 'raw_free',
      validation_notes: `Method: ${method}`,
      word_count: wordCount,
      completed_at: new Date().toISOString(),
    });

    // Log
    try {
      await base44.asServiceRole.entities.AgentLog.create({
        agent_name: 'Intelligence Seeker',
        action: 'free_research_complete',
        details: `Researched: ${quest.topic} (${wordCount} words, ${sources.length} sources, method: ${method})`,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return Response.json({
      quest_id: quest.id,
      status: 'complete',
      method,
      word_count: wordCount,
      sources_count: sources.length,
      summary,
    });
  } catch (error) {
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