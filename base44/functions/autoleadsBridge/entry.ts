import { createClientFromRequest, secrets } from '../../runtime/index';

// ============================================================================
// autoleadsBridge — Bridge between Vision Cortex and AutoLeads (autoconstructionleads.com)
// Syncs leads, contacts, campaigns, and appointments between systems.
// AutoLeads is a Base44 app at github.com/XTREME-SYSTEMS/autoleads
// ============================================================================

// AutoLeads API — uses the published Base44 function endpoint
const AUTOLEADS_BASE = 'https://autoleads.base44.app/functions';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action = 'sync_leads' } = body;

    // AutoLeads API key (shared between systems)
    const autoleadsKey = secrets.get('VISION_CORTEX_BRAIN_API_KEY');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (autoleadsKey) headers['Authorization'] = `Bearer ${autoleadsKey}`;

    switch (action) {

      // ── SYNC LEADS: push scraped leads to AutoLeads ──────────
      case 'sync_leads': {
        const { lead_ids = [], campaign_id } = body;

        let leads: any[] = [];
        if (lead_ids.length > 0) {
          leads = await base44.entities.ScrapedLead.filter({ id: { $in: lead_ids } });
        } else if (campaign_id) {
          const campaign = await base44.entities.OutreachCampaign.get(campaign_id);
          if (campaign.lead_ids?.length > 0) {
            leads = await base44.entities.ScrapedLead.filter({ id: { $in: campaign.lead_ids } });
          }
        }

        if (leads.length === 0) return Response.json({ error: 'No leads to sync' }, { status: 400 });

        // Push each lead to AutoLeads
        let synced = 0, failed = 0;
        const errors = [];

        for (const lead of leads) {
          try {
            const payload = {
              business_name: lead.business_name,
              phone: lead.phone,
              email: lead.email,
              website: lead.website,
              address: lead.address,
              industry: lead.industry,
              location: lead.location,
              rating: lead.rating,
              review_count: lead.review_count,
              enrichment_data: lead.enrichment_data,
              latitude: lead.latitude,
              longitude: lead.longitude,
            };

            const res = await fetch(`${AUTOLEADS_BASE}/ingestLead`, {
              method: 'POST',
              headers,
              body: JSON.stringify(payload),
            });

            if (res.ok) {
              synced++;
              await base44.entities.ScrapedLead.update(lead.id, {
                enrichment_data: {
                  ...(lead.enrichment_data || {}),
                  autoleads_synced: true,
                  autoleads_synced_at: new Date().toISOString(),
                },
              });
            } else {
              failed++;
              errors.push(`${lead.business_name}: ${res.status}`);
            }
          } catch (e) {
            failed++;
            errors.push(`${lead.business_name}: ${e.message}`);
          }
        }

        return Response.json({ ok: true, synced, failed, total: leads.length, errors: errors.slice(0, 10) });
      }

      // ── SYNC CONTACTS: push CRM contacts to AutoLeads ────────
      case 'sync_contacts': {
        const { contact_ids = [] } = body;

        let contacts: any[] = [];
        if (contact_ids.length > 0) {
          contacts = await base44.entities.XtremeCrmContact.filter({ id: { $in: contact_ids } });
        } else {
          contacts = await base44.entities.XtremeCrmContact.filter({ lifecycle_stage: { $in: ['qualified', 'proposal', 'won'] } }, '-created_date', 100);
        }

        if (contacts.length === 0) return Response.json({ error: 'No contacts to sync' }, { status: 400 });

        let synced = 0, failed = 0;
        const errors = [];

        for (const contact of contacts) {
          try {
            const payload = {
              full_name: contact.full_name,
              email: contact.email,
              phone: contact.phone,
              company: contact.company,
              industry: contact.industry,
              location: contact.location,
              website: contact.website,
              lifecycle_stage: contact.lifecycle_stage,
              enrichment_data: contact.enrichment_data,
              consultation: contact.enrichment_data?.consultation,
            };

            const res = await fetch(`${AUTOLEADS_BASE}/ingestContact`, {
              method: 'POST',
              headers,
              body: JSON.stringify(payload),
            });

            if (res.ok) {
              synced++;
              await base44.entities.XtremeCrmContact.update(contact.id, {
                enrichment_data: {
                  ...(contact.enrichment_data || {}),
                  autoleads_synced: true,
                  autoleads_synced_at: new Date().toISOString(),
                },
              });
            } else {
              failed++;
              errors.push(`${contact.full_name}: ${res.status}`);
            }
          } catch (e) {
            failed++;
            errors.push(`${contact.full_name}: ${e.message}`);
          }
        }

        return Response.json({ ok: true, synced, failed, total: contacts.length, errors: errors.slice(0, 10) });
      }

      // ── SYNC APPOINTMENTS: push scheduled consultations to AutoLeads ──
      case 'sync_appointments': {
        const { contact_ids = [] } = body;

        let contacts: any[] = [];
        if (contact_ids.length > 0) {
          contacts = await base44.entities.XtremeCrmContact.filter({ id: { $in: contact_ids } });
        } else {
          // Get all contacts with scheduled consultations
          const allContacts = await base44.entities.XtremeCrmContact.filter({ lifecycle_stage: 'qualified' }, '-updated_date', 100);
          contacts = allContacts.filter((c: any) => c.enrichment_data?.consultation);
        }

        let synced = 0, failed = 0;

        for (const contact of contacts) {
          const consultation = contact.enrichment_data?.consultation;
          if (!consultation) continue;

          try {
            const res = await fetch(`${AUTOLEADS_BASE}/ingestAppointment`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                contact_name: contact.full_name,
                contact_email: contact.email,
                contact_phone: contact.phone,
                company: contact.company,
                industry: contact.industry,
                scheduled_time: consultation.scheduled_time,
                event_id: consultation.event_id,
                hangout_link: consultation.hangout_link,
                notes: consultation.notes || '',
              }),
            });

            if (res.ok) synced++; else failed++;
          } catch (e) {
            failed++;
          }
        }

        return Response.json({ ok: true, synced, failed, total: contacts.length });
      }

      // ── PULL FROM AUTOLEADS: get leads/contacts from AutoLeads ──
      case 'pull_leads': {
        const { limit = 50 } = body;
        const res = await fetch(`${AUTOLEADS_BASE}/exportLeads?limit=${limit}`, { headers });
        if (!res.ok) return Response.json({ error: `AutoLeads pull failed: ${res.status}` }, { status: res.status });
        const data = await res.json();
        return Response.json({ ok: true, leads: data.leads || [], total: data.total || 0 });
      }

      // ── HEALTH CHECK: verify AutoLeads is reachable ──────────
      case 'health_check': {
        try {
          const res = await fetch(`${AUTOLEADS_BASE}/health`, { headers, signal: AbortSignal.timeout(5000) });
          return Response.json({
            ok: res.ok,
            status: res.status,
            reachable: res.ok,
            url: AUTOLEADS_BASE,
          });
        } catch (e) {
          return Response.json({
            ok: false,
            reachable: false,
            error: e.message,
            url: AUTOLEADS_BASE,
          });
        }
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}