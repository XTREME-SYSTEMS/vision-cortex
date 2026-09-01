import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const STRIPE_VERSION = '2025-10-29.clover';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const key = secrets.get('STRIPE_SECRET_KEY');
    if (!key) return Response.json({ error: 'STRIPE_SECRET_KEY not set' }, { status: 500 });

    // Get all shadow-strategized BuildQueue entries
    const queue = await base44.entities.BuildQueue.filter({ source: 'shadow_build_strategy' }, '-priority', 100);
    const ideas = await base44.entities.Idea.list('-score', 100);
    const ideaMap: Record<string, any> = {};
    for (const idea of ideas) ideaMap[idea.id] = idea;

    // List all Stripe checkout sessions to compute actual revenue
    const sessionsRes = await fetch('https://api.stripe.com/v1/checkout/sessions?limit=100', {
      headers: { 'Authorization': `Bearer ${key}`, 'Stripe-Version': STRIPE_VERSION },
    });
    const sessions = await sessionsRes.json();
    const revenueByQueue: Record<string, number> = {};
    if (sessions.data) {
      for (const session of sessions.data) {
        if (session.payment_status === 'paid') {
          const qid = session.metadata?.build_queue_id;
          if (qid) {
            revenueByQueue[qid] = (revenueByQueue[qid] || 0) + (session.amount_total || 0);
          }
        }
      }
    }

    const projects = queue.map((item: any) => {
      const idea = item.idea_id ? ideaMap[item.idea_id] : null;
      const predictedMonthly = idea?.est_monthly_profit_usd || item.predicted_revenue_monthly || 0;
      const predictedAnnual = idea?.est_annual_revenue_usd || 0;
      const actualCents = revenueByQueue[item.id] || 0;
      const actualUsd = actualCents / 100;
      return {
        id: item.id,
        name: item.business_name || item.title,
        stage: item.stage,
        stripe_product_id: item.stripe_product_id,
        stripe_payment_link: item.stripe_payment_link,
        predicted_monthly: predictedMonthly,
        predicted_annual: predictedAnnual,
        actual_revenue: actualUsd,
        has_payment_link: !!item.stripe_payment_link,
      };
    });

    const totalPredicted = projects.reduce((s: number, p: any) => s + (p.predicted_monthly || 0), 0);
    const totalActual = projects.reduce((s: number, p: any) => s + (p.actual_revenue || 0), 0);
    const launchedCount = projects.filter((p: any) => p.stage === 'launched').length;
    const monetizedCount = projects.filter((p: any) => p.has_payment_link).length;
    const revenueGeneratingCount = projects.filter((p: any) => p.actual_revenue > 0).length;
    const successRate = monetizedCount > 0 ? Math.round((revenueGeneratingCount / monetizedCount) * 100) : 0;

    return Response.json({
      projects,
      summary: {
        total_projects: projects.length,
        launched: launchedCount,
        monetized: monetizedCount,
        revenue_generating: revenueGeneratingCount,
        success_rate: successRate,
        total_predicted_monthly: totalPredicted,
        total_actual: totalActual,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}