import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { browseSession, str, arr } from '../../shared/cloudBrowser.ts';
import { marketPrice } from '../../shared/marketPrice.ts';

const STARTING_CAPITAL = 10_000_000;
const REWARD_STREAK = 10;
const MAX_POSITION_PCT = 0.25;
const MAX_DRAWDOWN_PCT = 0.30; // pause new positions if the fund is 30% below peak

async function notify(base44, kind, severity, title, body) {
  try {
    await base44.asServiceRole.entities.Notification.create({
      kind, severity, title, body: str(body, 1000), read: false
    });
  } catch { /* best effort */ }
}

export default async function(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'auth required' }, { status: 401 });

  const P = base44.asServiceRole.entities.Portfolio;
  const T = base44.asServiceRole.entities.Trade;

  // load or initialize the paper fund
  let portfolios = await P.list('-created_date', 1);
  let portfolio = portfolios[0];
  if (!portfolio) {
    portfolio = await P.create({
      name: 'Council Paper Fund',
      cash_balance: STARTING_CAPITAL,
      positions_value: 0,
      total_value: STARTING_CAPITAL,
      starting_value: STARTING_CAPITAL,
      peak_value: STARTING_CAPITAL,
      day: 0,
      consecutive_wins: 0,
      status: 'active'
    });
  }

  // 1. resolve any open trade against current real price
  const openTrades = await T.filter({ status: 'open' }, '-created_date', 10);
  let resolved = null;
  for (const t of openTrades) {
    const exitRes = await marketPrice(base44, t.asset);
    const exit = exitRes.price;
    if (!exit) continue; // price unavailable — leave open for next cycle
    const dir = t.direction === 'short' ? -1 : 1;
    const pct = t.entry_price ? ((exit - t.entry_price) / t.entry_price) * 100 * dir : 0;
    const pnl = (t.position_size_usd || 0) * (pct / 100);
    const won = pnl > 0;
    const newCash = (portfolio.cash_balance || 0) + (t.position_size_usd || 0) + pnl;
    const newStreak = won ? (portfolio.consecutive_wins || 0) + 1 : 0;
    await T.update(t.id, {
      exit_price: exit,
      price_source: exitRes.source,
      price_estimated: exitRes.estimated,
      pnl_usd: pnl,
      pnl_pct: pct,
      status: won ? 'resolved_won' : (Math.abs(pnl) < 0.01 ? 'resolved_breakeven' : 'resolved_lost'),
      portfolio_value_after: newCash
    });
    const newPeak = Math.max(portfolio.peak_value || 0, newCash);
    portfolio = await P.update(portfolio.id, {
      cash_balance: newCash,
      total_value: newCash,
      peak_value: newPeak,
      consecutive_wins: newStreak,
      status: newStreak >= REWARD_STREAK ? 'reward_earned' : 'active'
    });
    resolved = { day: t.day, asset: t.asset, pnl_usd: pnl, pnl_pct: pct, won, streak: newStreak };

    // owner alerts
    if (!won && pct <= -5) {
      await notify(base44, 'loss', 'warn', `Loss on ${t.asset}`,
        `Resolved D${t.day} ${t.direction} ${t.asset}: ${pct.toFixed(2)}% (${pnl >= 0 ? '+' : ''}$${Math.round(pnl).toLocaleString()}). Entry $${t.entry_price} → exit $${exit}.`);
    }
    if (newStreak === REWARD_STREAK) {
      await notify(base44, 'streak', 'critical', '10-win streak unlocked',
        `The Council hit a ${REWARD_STREAK}-win streak. Proof gate satisfied — review the desk and consider scaling.`);
    }
  }

  // 2. guard: don't stack positions — if one is still open (price was unavailable), wait
  const stillOpen = await T.filter({ status: 'open' }, '-created_date', 5);
  if (stillOpen.length > 0) {
    return Response.json({
      portfolio: { total_value: portfolio.total_value, day: portfolio.day, consecutive_wins: portfolio.consecutive_wins, status: portfolio.status },
      resolved,
      skipped: 'open position still unresolved'
    });
  }

  // 3. drawdown pause — protect the paper fund from a losing spiral
  const totalValue = portfolio.total_value || 0;
  const peakNow = portfolio.peak_value || portfolio.starting_value || STARTING_CAPITAL;
  if (totalValue < peakNow * (1 - MAX_DRAWDOWN_PCT)) {
    await notify(base44, 'drawdown', 'critical', 'Drawdown pause',
      `Portfolio $${Math.round(totalValue).toLocaleString()} is ${(MAX_DRAWDOWN_PCT * 100).toFixed(0)}% below peak $${Math.round(peakNow).toLocaleString()}. New positions paused until the fund recovers.`);
    return Response.json({
      portfolio: { total_value: totalValue, day: portfolio.day, consecutive_wins: portfolio.consecutive_wins, status: portfolio.status },
      resolved,
      paused: 'drawdown limit reached'
    });
  }

  // 4. Council deliberation — identify the single highest-conviction opportunity
  const council = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are the Xtreme Vision Council — an anti-hierarchical multi-agent council deliberating on generational wealth and high-accuracy financial opportunities. Current paper portfolio: $${(portfolio.total_value || 0).toLocaleString()} on day ${portfolio.day || 0} (started at $${STARTING_CAPITAL.toLocaleString()}). Streak: ${portfolio.consecutive_wins || 0}/${REWARD_STREAK}. Mission: identify the SINGLE highest-conviction, large-money opportunity most likely to move sharply in a known direction within 24h. Be realistic and evidence-based — do not fabricate. Return the asset (use a clear ticker or token name), direction (long/short), a tight evidence-based thesis, your confidence 0-100, the target return % you expect, the position size in USD (max 25% of portfolio), and a directive for Shadow: exactly which public sources or URLs to read to validate this and push accuracy toward 90%.`,
    model: 'gemini_3_1_pro',
    add_context_from_internet: true,
    response_json_schema: {
      type: 'object',
      properties: {
        asset: { type: 'string' },
        direction: { type: 'string' },
        thesis: { type: 'string' },
        confidence: { type: 'number' },
        target_return_pct: { type: 'number' },
        position_size_usd: { type: 'number' },
        shadow_directive: { type: 'string' },
        shadow_sources: { type: 'array', items: { type: "string" } }
      },
      required: ['asset', 'direction', 'thesis', 'confidence', 'position_size_usd', 'shadow_directive']
    }
  });

  // 5. Shadow gathers intel from the Council's directed sources
  let intelText = '';
  const sourcesUsed = [];
  for (const src of arr(council.shadow_sources, 3, 400)) {
    try {
      const txt = await browseSession(src, 12000);
      if (txt && txt.length > 50) {
        intelText += `\n--- ${src} ---\n${txt}\n`;
        sourcesUsed.push(src);
      }
    } catch { /* source unavailable, continue */ }
  }

  // 6. second pass — refine with intel, identify accuracy drivers
  const refine = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are the Council reviewing Shadow's gathered intelligence to finalize today's trade.\n\nAsset: ${str(council.asset, 80)} | Direction: ${str(council.direction, 10)}\nOriginal thesis: ${str(council.thesis, 1500)}\n\nShadow intel:\n${intelText || 'No additional intel gathered from directed sources.'}\n\nIdentify the 3-5 key elements that drive the accuracy of this prediction toward 90%. Give a final confidence 0-100 and a one-line verdict.`,
    model: 'gemini_3_1_pro',
    response_json_schema: {
      type: 'object',
      properties: {
        accuracy_drivers: { type: 'array', items: { type: 'string' } },
        final_confidence: { type: 'number' },
        verdict: { type: 'string' }
      },
      required: ['accuracy_drivers', 'final_confidence', 'verdict']
    }
  });

  // 7. open the paper trade — entry from real market data
  const entryRes = await marketPrice(base44, council.asset);
  const entry = entryRes.price;
  if (!entry) {
    await notify(base44, 'error', 'warn', 'Price unavailable',
      `Could not fetch a price for ${str(council.asset, 40)}. Cycle skipped — no position opened.`);
    return Response.json({
      portfolio: { total_value: portfolio.total_value, day: portfolio.day, consecutive_wins: portfolio.consecutive_wins, status: portfolio.status },
      resolved,
      skipped: 'entry price unavailable'
    });
  }

  const day = (portfolio.day || 0) + 1;
  const size = Math.min(Number(council.position_size_usd) || 0, (portfolio.cash_balance || 0) * MAX_POSITION_PCT);

  const trade = await T.create({
    day,
    asset: str(council.asset, 80),
    direction: str(council.direction, 10) || 'long',
    thesis: str(council.thesis, 2000),
    confidence: Number(refine?.final_confidence || council.confidence) || 0,
    accuracy_drivers: arr(refine?.accuracy_drivers, 6, 300),
    shadow_intel_sources: sourcesUsed,
    council_directive: str(council.shadow_directive, 1000),
    position_size_usd: size,
    entry_price: entry,
    price_source: entryRes.source,
    price_estimated: entryRes.estimated,
    target_return_pct: Number(council.target_return_pct) || 0,
    status: 'open',
    portfolio_value_before: portfolio.total_value
  });

  await P.update(portfolio.id, { day });

  return Response.json({
    portfolio: {
      total_value: portfolio.total_value,
      day,
      consecutive_wins: portfolio.consecutive_wins,
      status: portfolio.status
    },
    resolved,
    trade: {
      id: trade.id,
      asset: trade.asset,
      direction: trade.direction,
      confidence: trade.confidence,
      accuracy_drivers: trade.accuracy_drivers,
      entry_price: trade.entry_price,
      price_source: trade.price_source,
      price_estimated: trade.price_estimated,
      position_size_usd: trade.position_size_usd,
      shadow_intel_sources: trade.shadow_intel_sources
    }
  });
}