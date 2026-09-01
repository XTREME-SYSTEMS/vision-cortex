import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const STRIPE_VERSION = '2025-10-29.clover';

async function stripeFetch(path: string, method: string, body: Record<string, string> | null, key: string) {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${key}`,
    'Stripe-Version': STRIPE_VERSION,
  };
  const opts: RequestInit = { method, headers };
  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    headers['Idempotency-Key'] = crypto.randomUUID();
    opts.body = new URLSearchParams(body).toString();
  }
  const res = await fetch(`https://api.stripe.com/v1${path}`, opts);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Stripe ${path} failed`);
  return json;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const key = secrets.get('STRIPE_SECRET_KEY');
    if (!key) return Response.json({ error: 'STRIPE_SECRET_KEY not set' }, { status: 500 });

    const appId = Deno.env.get('BASE44_APP_ID') || '';
    const priceCents = 2900; // $29.00 default per project

    // Get all shadow-strategized BuildQueue entries
    const queue = await base44.entities.BuildQueue.filter({ source: 'shadow_build_strategy' }, '-priority', 100);
    const results = [];

    for (const item of queue) {
      if (item.stripe_product_id && item.stripe_payment_link) {
        results.push({ id: item.id, name: item.business_name || item.title, skipped: true, payment_link: item.stripe_payment_link });
        continue;
      }

      const productName = item.business_name || item.title || 'Vision Cortex Project';

      // Create product
      const product = await stripeFetch('/products', 'POST', {
        'name': productName,
        'description': `AI-built project from Vision Cortex Shadow pipeline`,
        'metadata[base44_app_id]': appId,
        'metadata[build_queue_id]': item.id,
      }, key);

      // Create price
      const price = await stripeFetch('/prices', 'POST', {
        'product': product.id,
        'unit_amount': String(priceCents),
        'currency': 'usd',
        'metadata[base44_app_id]': appId,
        'metadata[build_queue_id]': item.id,
      }, key);

      // Create payment link
      const link = await stripeFetch('/payment_links', 'POST', {
        'line_items[0][price]': price.id,
        'line_items[0][quantity]': '1',
        'metadata[base44_app_id]': appId,
        'metadata[build_queue_id]': item.id,
      }, key);

      // Update BuildQueue
      await base44.entities.BuildQueue.update(item.id, {
        stripe_product_id: product.id,
        stripe_payment_link: link.url,
      });

      results.push({
        id: item.id,
        name: productName,
        product_id: product.id,
        payment_link: link.url,
        price: priceCents,
      });
    }

    const created = results.filter((r: any) => r.payment_link && !r.skipped).length;

    await base44.entities.AgentLog.create({
      agent_name: 'Shadow',
      level: 'success',
      category: 'monetization',
      message: `Created ${created} Stripe products with payment links`,
      detail: `${results.length} total projects processed`,
    });

    return Response.json({ created, total: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}