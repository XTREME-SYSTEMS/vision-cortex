import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { secrets } from 'base44:runtime';

// ============================================================================
// calculateInfinityReward — $INF Performance Compensation Engine
// ============================================================================
// Formula: INF_Reward = (O × 0.40) + (T × 0.25) + (Q × 0.20) + (C × 0.15)
//   O = Output (tasks completed, bytes processed) — normalized 0-1
//   T = Timeliness (latency variance vs benchmark) — normalized 0-1
//   Q = Quality (accuracy / validation score) — normalized 0-1
//   C = Consistency (stability baseline over time) — normalized 0-1
//
// Records the transaction in both:
//   1. Base44 AgentPayment entity (for app UI)
//   2. Supabase infinity_ledger table (cross-repository immutable ledger)
//
// Also updates the agent's CryptoWallet balance and AgentProfile inf_balance.
// ============================================================================

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
    const { agent_name, metric_output, metric_latency, metric_quality, metric_stability, reward_type, memo } = body;

    if (!agent_name) return Response.json({ error: 'agent_name required' }, { status: 400 });

    // Normalize metrics to 0-1 range
    const O = Math.min(Math.max(metric_output || 0, 0), 1);
    const T = Math.min(Math.max(metric_latency || 0, 0), 1);
    const Q = Math.min(Math.max(metric_quality || 0, 0), 1);
    const C = Math.min(Math.max(metric_stability || 0, 0), 1);

    // Calculate reward using the $INF formula
    const scaleFactor = 1.44; // Amplifies base reward to meaningful $INF amounts
    const baseReward = (O * 0.40) + (T * 0.25) + (Q * 0.20) + (C * 0.15);
    const infReward = Number((baseReward * scaleFactor).toFixed(8));

    const sr = base44.asServiceRole.entities;

    // 1. Find the agent profile
    const profiles = await sr.AgentProfile.filter({ name: agent_name }, '-created_date', 5);
    const profile = profiles[0];
    if (!profile) return Response.json({ error: `Agent '${agent_name}' not found` }, { status: 404 });

    // 2. Record in Base44 AgentPayment entity
    const payment = await sr.AgentPayment.create({
      agent_name,
      amount: infReward,
      payment_type: reward_type || 'salary',
      memo: memo || `Performance: O=${O.toFixed(2)} T=${T.toFixed(2)} Q=${Q.toFixed(2)} C=${C.toFixed(2)}`,
      wallet_address: profile.wallet_address || '',
      validated: true,
      validator_notes: 'Auto-calculated by $INF engine',
    });

    // 3. Update agent profile balance and total
    const newBalance = (profile.inf_balance || 0) + infReward;
    const newTotal = (profile.inf_earned_total || 0) + infReward;
    await sr.AgentProfile.update(profile.id, {
      inf_balance: newBalance,
      inf_earned_total: newTotal,
      tasks_completed: (profile.tasks_completed || 0) + 1,
    });

    // 4. Update CryptoWallet if exists
    if (profile.wallet_address) {
      const wallets = await sr.CryptoWallet.filter({ address: profile.wallet_address }, '-created_date', 5);
      if (wallets[0]) {
        await sr.CryptoWallet.update(wallets[0].id, {
          balance: (wallets[0].balance || 0) + infReward,
        });
      }
    }

    // 5. Record in Supabase infinity_ledger (cross-repository immutable ledger)
    let ledgerRecorded = false;
    try {
      const supabaseUrl = secrets.get('SUPABASE_URL');
      const supabaseKey = secrets.get('SUPABASE_SERVICE_ROLE_KEY');
      if (supabaseUrl && supabaseKey) {
        const ledgerRes = await fetch(`${supabaseUrl}/rest/v1/infinity_ledger`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            sender_wallet: '0xINF_TREASURY',
            receiver_wallet: profile.wallet_address || `0xINF_${agent_name}`,
            amount_inf: infReward,
            metric_output: O,
            metric_latency: T,
            metric_quality: Q,
            metric_stability: C,
            agent_name,
            reward_type: (reward_type || 'PERFORMANCE').toUpperCase(),
          }),
        });
        ledgerRecorded = ledgerRes.ok;
      }
    } catch (e) {
      // Graceful — Base44 payment still recorded
    }

    // 6. Check for award eligibility (above-average performance)
    let awardCreated = null;
    if (baseReward >= 0.85) {
      try {
        awardCreated = await sr.AgentAward.create({
          agent_name,
          award_type: baseReward >= 0.95 ? 'platinum' : 'gold',
          emoji: baseReward >= 0.95 ? '🏆' : '🥇',
          title: baseReward >= 0.95 ? 'Elite Performance' : 'Outstanding Performance',
          description: `Achieved ${baseReward.toFixed(2)} composite score — O=${O.toFixed(2)} T=${T.toFixed(2)} Q=${Q.toFixed(2)} C=${C.toFixed(2)}`,
          score: baseReward,
        });
      } catch {}
    }

    return Response.json({
      ok: true,
      agent_name,
      inf_reward: infReward,
      formula: {
        output: O,
        timeliness: T,
        quality: Q,
        consistency: C,
        base_score: baseReward,
        scale_factor: scaleFactor,
      },
      payment_id: payment.id,
      new_balance: newBalance,
      ledger_recorded: ledgerRecorded,
      award: awardCreated ? { emoji: awardCreated.emoji, title: awardCreated.title } : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}