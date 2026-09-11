import { createClientFromRequest, secrets } from '../../runtime/index';

// ============================================================================
// telnyxComms — Direct Telnyx API integration for Vision Cortex
// ============================================================================
// Handles: number search/purchase, SMS, MMS, WhatsApp, voice calls,
// messaging profiles, and billing group auto-resolution.
// Telnyx API v2: https://api.telnyx.com/v2
// ============================================================================

const TELNYX_BASE = 'https://api.telnyx.com/v2';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'status';

    const apiKey = secrets.get('TELNYX_API_KEY');
    if (!apiKey) {
      return Response.json({
        error: 'TELNYX_API_KEY not set. Add it in Settings → Secrets.',
        configured: false,
      }, { status: 400 });
    }

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const telnyx = async (method, path, payload = null) => {
      const opts = { method, headers };
      if (payload) opts.body = JSON.stringify(payload);
      const r = await fetch(`${TELNYX_BASE}${path}`, opts);
      const data = await r.json().catch(() => ({ raw: null }));
      return { ok: r.ok, status: r.status, data };
    };

    // Auto-resolve a billing group (create one if none exist)
    const getBillingGroup = async () => {
      const res = await telnyx('GET', '/billing_groups');
      const groups = res.data?.data || [];
      if (groups.length > 0) return groups[0].id;
      // Create a default billing group
      const create = await telnyx('POST', '/billing_groups', {
        name: 'Vision Cortex Default',
        billing_email: user.email || 'billing@visioncortex.app',
      });
      return create.data?.data?.id || null;
    };

    // Auto-resolve a messaging profile (create one if none exist)
    const getMessagingProfile = async () => {
      const res = await telnyx('GET', '/messaging_profiles');
      const profiles = res.data?.data || [];
      if (profiles.length > 0) return profiles[0].id;
      const create = await telnyx('POST', '/messaging_profiles', {
        name: 'Vision Cortex Default',
        enabled: true,
      });
      return create.data?.data?.id || null;
    };

    switch (action) {
      case 'status': {
        const test = await telnyx('GET', '/phone_numbers?per_page=1');
        return Response.json({
          configured: true,
          connected: test.ok,
          baseUrl: TELNYX_BASE,
          error: test.ok ? null : (test.data?.errors?.[0]?.detail || 'Connection failed'),
        });
      }

      // ── Phone Numbers ──────────────────────────────────────────
      case 'list_numbers': {
        const res = await telnyx('GET', '/phone_numbers?per_page=50');
        return Response.json({ action, ok: res.ok, numbers: res.data?.data || [], error: res.ok ? null : res.data?.errors?.[0]?.detail });
      }

      case 'search_numbers': {
        const { country_code = 'US', area_code, contains, limit = 10 } = body;
        let path = `/available_phone_numbers?filter[country_code]=${country_code}&filter[features][]=sms&filter[features][]=mms&filter[features][]=voice&per_page=${limit}`;
        if (area_code) path += `&filter[national]=1&filter[area_code]=${area_code}`;
        if (contains) path += `&filter[contains]=${contains}`;
        const res = await telnyx('GET', path);
        return Response.json({ action, ok: res.ok, numbers: res.data?.data || [], error: res.ok ? null : res.data?.errors?.[0]?.detail });
      }

      case 'buy_number': {
        const { phone_number, billing_group_id } = body;
        if (!phone_number) return Response.json({ error: 'phone_number required' }, { status: 400 });
        const bgId = billing_group_id || await getBillingGroup();
        if (!bgId) return Response.json({ error: 'No billing group available' }, { status: 400 });
        const res = await telnyx('POST', '/phone_numbers', {
          phone_numbers: [{ phone_number }],
          billing_group_id: bgId,
        });
        return Response.json({ action, ok: res.ok, number: res.data?.data || null, error: res.ok ? null : res.data?.errors?.[0]?.detail });
      }

      case 'update_number': {
        const { number_id, name, messaging_profile_id } = body;
        if (!number_id) return Response.json({ error: 'number_id required' }, { status: 400 });
        const update = {};
        if (name !== undefined) update.name = name;
        if (messaging_profile_id !== undefined) update.messaging_profile_id = messaging_profile_id;
        const res = await telnyx('PATCH', `/phone_numbers/${number_id}`, update);
        return Response.json({ action, ok: res.ok, number: res.data?.data || null, error: res.ok ? null : res.data?.errors?.[0]?.detail });
      }

      case 'release_number': {
        const { number_id } = body;
        if (!number_id) return Response.json({ error: 'number_id required' }, { status: 400 });
        const res = await telnyx('DELETE', `/phone_numbers/${number_id}`);
        return Response.json({ action, ok: res.ok, error: res.ok ? null : res.data?.errors?.[0]?.detail });
      }

      // ── Messaging ──────────────────────────────────────────────
      case 'send_sms': {
        const { to, from, text } = body;
        if (!to || !from || !text) return Response.json({ error: 'to, from, text required' }, { status: 400 });
        const profileId = await getMessagingProfile();
        const res = await telnyx('POST', '/messages', {
          from, to, text,
          messaging_profile_id: profileId,
        });
        return Response.json({ action, ok: res.ok, message: res.data?.data || null, error: res.ok ? null : res.data?.errors?.[0]?.detail });
      }

      case 'send_mms': {
        const { to, from, text, media_urls = [] } = body;
        if (!to || !from) return Response.json({ error: 'to, from required' }, { status: 400 });
        const profileId = await getMessagingProfile();
        const res = await telnyx('POST', '/messages', {
          from, to,
          text: text || '',
          media_urls: Array.isArray(media_urls) ? media_urls : [media_urls],
          messaging_profile_id: profileId,
        });
        return Response.json({ action, ok: res.ok, message: res.data?.data || null, error: res.ok ? null : res.data?.errors?.[0]?.detail });
      }

      case 'send_whatsapp': {
        const { to, from, text } = body;
        if (!to || !from || !text) return Response.json({ error: 'to, from, text required' }, { status: 400 });
        const res = await telnyx('POST', '/whatsapp_messages', {
          from, to, text,
        });
        return Response.json({ action, ok: res.ok, message: res.data?.data || null, error: res.ok ? null : res.data?.errors?.[0]?.detail });
      }

      case 'list_messages': {
        const res = await telnyx('GET', '/messages?per_page=50');
        return Response.json({ action, ok: res.ok, messages: res.data?.data || [], error: res.ok ? null : res.data?.errors?.[0]?.detail });
      }

      // ── Voice / Call Control ───────────────────────────────────
      case 'make_call': {
        const { to, from, connection_id, webhook_url, client_state } = body;
        if (!to || !from) return Response.json({ error: 'to, from required' }, { status: 400 });
        const payload = { to, from };
        if (connection_id) payload.connection_id = connection_id;
        if (webhook_url) payload.webhook_url = webhook_url;
        if (client_state) payload.client_state = client_state;
        const res = await telnyx('POST', '/calls', payload);
        return Response.json({ action, ok: res.ok, call: res.data?.data || null, error: res.ok ? null : res.data?.errors?.[0]?.detail });
      }

      // ── Messaging Profiles ─────────────────────────────────────
      case 'list_messaging_profiles': {
        const res = await telnyx('GET', '/messaging_profiles');
        return Response.json({ action, ok: res.ok, profiles: res.data?.data || [], error: res.ok ? null : res.data?.errors?.[0]?.detail });
      }

      case 'create_messaging_profile': {
        const { name = 'Vision Cortex Profile' } = body;
        const res = await telnyx('POST', '/messaging_profiles', { name, enabled: true });
        return Response.json({ action, ok: res.ok, profile: res.data?.data || null, error: res.ok ? null : res.data?.errors?.[0]?.detail });
      }

      // ── Billing Groups ─────────────────────────────────────────
      case 'list_billing_groups': {
        const res = await telnyx('GET', '/billing_groups');
        return Response.json({ action, ok: res.ok, groups: res.data?.data || [], error: res.ok ? null : res.data?.errors?.[0]?.detail });
      }

      // ── WhatsApp Numbers ───────────────────────────────────────
      case 'list_whatsapp_numbers': {
        const res = await telnyx('GET', '/whatsapp_phone_numbers');
        return Response.json({ action, ok: res.ok, numbers: res.data?.data || [], error: res.ok ? null : res.data?.errors?.[0]?.detail });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message || 'Telnyx integration failed' }, { status: 500 });
  }
}