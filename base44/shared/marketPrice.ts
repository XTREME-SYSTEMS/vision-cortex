// Real market price via Yahoo Finance (free, no key) with LLM fallback.
// Returns { price, source, estimated }.
import { str } from './cloudBrowser.ts';

export async function marketPrice(base44, asset) {
  const clean = str(asset, 40).trim().toUpperCase();
  if (!clean) return { price: 0, source: 'none', estimated: true };

  // 1. Yahoo Finance — stocks, ETFs, and crypto pairs (e.g. BTC-USD). No key.
  //    Try the bare symbol first, then the -USD pair (crypto convention).
  for (const sym of [clean, `${clean}-USD`]) {
    try {
      const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1m`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Vision Cortex)' }
      });
      if (r.ok) {
        const j = await r.json();
        const price = j?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price && price > 0) return { price: Number(price), source: 'yahoo', estimated: false };
      }
    } catch { /* try next variant */ }
  }

  // 2. LLM fallback — web-searched estimate, flagged as estimated.
  try {
    const r = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `What is the current live market price of "${asset}" in USD? Search the web for the real current price. Return only the numeric price. If the asset is not a tradable priced instrument, return 0.`,
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: { price: { type: 'number' } },
        required: ['price']
      }
    });
    return { price: Number(r?.price) || 0, source: 'llm', estimated: true };
  } catch { /* no price available */ }

  return { price: 0, source: 'none', estimated: true };
}