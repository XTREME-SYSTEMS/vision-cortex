import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// shadowRevenueCheck — verifies monetization status by checking Stripe for
// actual revenue from Shadow-launched systems. Lists recent payments, checks
// balance, and matches transactions to launched BuildQueue projects via
// metadata. Returns a revenue verification report for the Shadow dashboard.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });

    const stripeHeaders = {
      'Authorization': `Bearer ${secretKey}`,
      'Stripe-Version': '2025-10-29.clover',
    };

    // Fetch balance
    const balRes = await fetch('https://api.stripe.com/v1/balance', { headers: stripeHeaders });
    const balance = balRes.ok ? await balRes.json() : null;

    // Fetch recent payment intents (last 100)
    const piRes = await fetch('https://api.stripe.com/v1/payment_intents?limit=100', { headers: stripeHeaders });
    const piData = piRes.ok ? await piRes.json() : { data: [] };

    // Fetch recent charges for revenue detail
    const chRes = await fetch('https://api.stripe.com/v1/charges?limit=100', { headers: stripeHeaders });
    const chData = chRes.ok ? await chRes.json() : { data: [] };

    // Pull all launched BuildQueue projects to match against
    const launched = await base44.entities.BuildQueue.filter(
      { stage: 'launched' },
      '-created_date',
      50
    ).catch(() => []);

    // Match charges to projects via metadata or description
    const projectRevenue = {};
    for (const q of launched) {
      projectRevenue[q.id] = {
        title: q.title || q.business_name,
        business_name: q.business_name,
        revenue_usd: 0,
        transaction_count: 0,
        last_payment: null,
        status: 'no_revenue',
      };
    }

    let totalRevenue = 0;
    let totalTransactions = 0;
    const unmatchedCharges = [];

    for (const charge of (chData.data || [])) {
      if (charge.refunded) continue;
      const amount = (charge.amount || 0) / 100;
      totalRevenue += amount;
      totalTransactions++;

      // Try to match via metadata.base44_app_id or description
      const meta = charge.metadata || {};
      let matchedProject = null;

      // Match by build_queue_id in metadata
      if (meta.build_queue_id && projectRevenue[meta.build_queue_id]) {
        matchedProject = meta.build_queue_id;
      } else {
        // Fuzzy match by business name in description
        const desc = (charge.description || '').toLowerCase();
        matchedProject = Object.keys(projectRevenue).find((id) => {
          const pn = (projectRevenue[id].business_name || projectRevenue[id].title || '').toLowerCase();
          return pn && desc.includes(pn);
        });
      }

      if (matchedProject) {
        projectRevenue[matchedProject].revenue_usd += amount;
        projectRevenue[matchedProject].transaction_count++;
        projectRevenue[matchedProject].status = 'generating_revenue';
        const paidAt = charge.created * 1000;
        if (!projectRevenue[matchedProject].last_payment || paidAt > projectRevenue[matchedProject].last_payment) {
          projectRevenue[matchedProject].last_payment = paidAt;
        }
      } else if (amount > 0) {
        unmatchedCharges.push({ amount, description: charge.description, created: charge.created });
      }
    }

    // Mark projects with no revenue
    const projects = Object.values(projectRevenue);
    const generatingRevenue = projects.filter((p) => p.status === 'generating_revenue');
    const noRevenue = projects.filter((p) => p.status === 'no_revenue');

    await base44.entities.AgentLog.create({
      agent_name: 'Shadow',
      level: 'success',
      category: 'revenue',
      message: `Revenue check complete — $${totalRevenue.toFixed(2)} total, ${totalTransactions} transactions, ${generatingRevenue.length}/${projects.length} projects generating revenue.`,
    });

    return Response.json({
      balance: balance ? {
        available: balance.available?.map((b) => ({ amount: b.amount / 100, currency: b.currency })) || [],
        pending: balance.pending?.map((b) => ({ amount: b.amount / 100, currency: b.currency })) || [],
      } : null,
      total_revenue_usd: totalRevenue,
      total_transactions: totalTransactions,
      projects_generating_revenue: generatingRevenue.length,
      projects_no_revenue: noRevenue.length,
      projects: projects.sort((a, b) => b.revenue_usd - a.revenue_usd),
      unmatched_revenue_usd: unmatchedCharges.reduce((s, c) => s + c.amount, 0),
      unmatched_count: unmatchedCharges.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}