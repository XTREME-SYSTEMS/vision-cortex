import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// ============================================================================
// swarmDispatch — Parallel batch operations across multiple agents
// Deploys a swarm of agents to handle: batch messaging, batch emails,
// batch MMS, batch enrichment, batch audits, batch follow-ups, batch calls
// Each agent in the swarm handles a chunk of work in parallel
// ============================================================================

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action = 'dispatch' } = body;

    switch (action) {

      // ── DISPATCH SWARM (parallel batch operation) ───────────
      case 'dispatch': {
        const { operation, campaign_id, from, chunk_size = 10, max_agents = 5, delay_between_chunks = 2 } = body;

        const validOps = ['batch_mms', 'batch_email', 'batch_followup', 'batch_enrich', 'batch_audit', 'batch_call', 'batch_respond'];
        if (!validOps.includes(operation)) {
          return Response.json({ error: `Invalid operation. Valid: ${validOps.join(', ')}` }, { status: 400 });
        }

        // Gather targets
        let targets: any[] = [];
        if (campaign_id) {
          const campaign = await base44.entities.OutreachCampaign.get(campaign_id);
          if (campaign.lead_ids?.length > 0) {
            targets = await base44.entities.ScrapedLead.filter({ id: { $in: campaign.lead_ids } });
          } else if (campaign.contact_ids?.length > 0) {
            targets = await base44.entities.XtremeCrmContact.filter({ id: { $in: campaign.contact_ids } });
          }
        } else if (body.lead_ids?.length > 0) {
          targets = await base44.entities.ScrapedLead.filter({ id: { $in: body.lead_ids } });
        } else if (body.contact_ids?.length > 0) {
          targets = await base44.entities.XtremeCrmContact.filter({ id: { $in: body.contact_ids } });
        }

        if (targets.length === 0) return Response.json({ error: 'No targets found' }, { status: 400 });

        // Split into chunks — each chunk is handled by one "agent" in the swarm
        const chunks: any[][] = [];
        const cs = Math.min(chunk_size, Math.ceil(targets.length / max_agents));
        for (let i = 0; i < targets.length; i += cs) {
          chunks.push(targets.slice(i, i + cs));
        }

        const functionName = {
          batch_mms: 'batchMmsOutreach',
          batch_email: 'persistentMessageAgent',
          batch_followup: 'persistentMessageAgent',
          batch_enrich: 'batchLeadFactory',
          batch_audit: 'batchLeadFactory',
          batch_call: 'aiCallCampaign',
          batch_respond: 'edenSkyeResponder',
        }[operation];

        const actionMap: Record<string, string> = {
          batch_mms: 'send_batch',
          batch_email: 'send_emails',
          batch_followup: 'run_follow_ups',
          batch_enrich: 'enrich_batch',
          batch_audit: 'audit_batch',
          batch_call: 'start_campaign',
          batch_respond: 'batch_respond',
        };

        // Dispatch all chunks in parallel (swarm)
        const swarmResults = await Promise.allSettled(
          chunks.map(async (chunk, agentIdx) => {
            const ids = chunk.map((t: any) => t.id);
            const payload: any = {
              action: actionMap[operation],
              from,
              campaign_id,
              delay_seconds: delay_between_chunks,
            };

            // Route IDs to the right param
            if (chunk[0]?.business_name) {
              payload.lead_ids = ids;
            } else {
              payload.contact_ids = ids;
            }

            // Special handling for batch_respond
            if (operation === 'batch_respond') {
              payload.responses = chunk.map((t: any) => ({
                contact_id: t.id,
                inbound_message: body.inbound_messages?.[t.id] || 'Following up on our previous message',
                channel: body.channel || 'sms',
              }));
            }

            try {
              const result = await base44.functions.invoke(functionName, payload);
              return { agent: agentIdx, chunk_size: chunk.length, result: result.data || result };
            } catch (e) {
              return { agent: agentIdx, chunk_size: chunk.length, error: e.message };
            }
          })
        );

        const summary = swarmResults.map((r, i) => ({
          agent: i,
          status: r.status,
          ...(r.status === 'fulfilled' ? r.value : { error: r.reason?.message }),
        }));

        const succeeded = summary.filter(s => s.status === 'fulfilled' && !s.error).length;
        const totalProcessed = chunks.reduce((sum, c) => sum + c.length, 0);

        // Update campaign if provided
        if (campaign_id) {
          const campaign = await base44.entities.OutreachCampaign.get(campaign_id).catch(() => null);
          if (campaign) {
            const updates: any = { status: 'completed' };
            if (operation === 'batch_mms') updates.messages_sent = (campaign.messages_sent || 0) + totalProcessed;
            if (operation === 'batch_email') updates.emails_sent = (campaign.emails_sent || 0) + totalProcessed;
            if (operation === 'batch_call') updates.calls_made = (campaign.calls_made || 0) + totalProcessed;
            updates.completed_at = new Date().toISOString();
            await base44.entities.OutreachCampaign.update(campaign_id, updates);
          }
        }

        return Response.json({
          ok: true,
          operation,
          swarm_size: chunks.length,
          total_targets: totalProcessed,
          agents_succeeded: succeeded,
          agents_failed: chunks.length - succeeded,
          results: summary,
        });
      }

      // ── FULL PIPELINE SWARM (scrape → enrich → audit → message → call) ──
      case 'full_pipeline': {
        const { industry, location, keyword, radius_miles = 50, from, hooks = ['free_audit', 'ai_tools', 'free_lead_gen_website'], max_calls = 50, autonomous = false } = body;

        if (!industry || !location || !from) {
          return Response.json({ error: 'industry, location, and from required' }, { status: 400 });
        }

        // Step 1: Create campaign
        const campaign = await base44.entities.OutreachCampaign.create({
          name: `${industry} swarm — ${location}`,
          industry, location, keyword,
          radius_miles,
          type: 'full_pipeline',
          status: 'scraping',
          from_number: from,
          hooks,
          max_daily_calls: max_calls,
          autonomous,
        });

        // Step 2: Scrape + enrich + audit + generate messages (batchLeadFactory)
        const scrapeRes = await base44.functions.invoke('batchLeadFactory', {
          action: 'run_pipeline',
          industry, location, keyword, radius_miles, hooks,
          campaign_id: campaign.id,
        });

        const leadIds = scrapeRes.data?.lead_ids || scrapeRes.lead_ids || [];
        if (leadIds.length === 0) {
          await base44.entities.OutreachCampaign.update(campaign.id, { status: 'failed', error_message: 'No leads found' });
          return Response.json({ ok: false, error: 'No leads found', campaign_id: campaign.id });
        }

        await base44.entities.OutreachCampaign.update(campaign.id, {
          lead_ids: leadIds,
          total_leads: leadIds.length,
          status: 'messaging',
        });

        // Step 3: Swarm batch MMS
        const mmsRes = await base44.functions.invoke('swarmDispatch', {
          action: 'dispatch',
          operation: 'batch_mms',
          campaign_id: campaign.id,
          from,
          chunk_size: 10,
          max_agents: 5,
        });

        // Step 4: Swarm batch emails (if emails available)
        const emailRes = await base44.functions.invoke('swarmDispatch', {
          action: 'dispatch',
          operation: 'batch_email',
          campaign_id: campaign.id,
          from,
          chunk_size: 10,
          max_agents: 3,
        });

        // Step 5: Create CRM contacts for calling
        const leads = await base44.entities.ScrapedLead.filter({ id: { $in: leadIds } });
        const contacts = [];
        for (const lead of leads) {
          const phone = lead.phone || lead.enrichment_data?.owner_phone;
          if (phone) {
            const c = await base44.entities.XtremeCrmContact.create({
              full_name: lead.enrichment_data?.owner_name || lead.business_name,
              phone, company: lead.business_name, industry: lead.industry,
              location: lead.location, website: lead.website,
              lifecycle_stage: 'lead', lead_source: 'scraper',
              enrichment_data: lead.enrichment_data,
            });
            contacts.push(c);
          }
        }

        await base44.entities.OutreachCampaign.update(campaign.id, {
          contact_ids: contacts.map(c => c.id),
          status: 'calling',
        });

        // Step 6: Swarm batch calls (if contacts exist)
        let callRes = null;
        if (contacts.length > 0) {
          callRes = await base44.functions.invoke('swarmDispatch', {
            action: 'dispatch',
            operation: 'batch_call',
            campaign_id: campaign.id,
            from,
            chunk_size: 5,
            max_agents: 3,
          });
        }

        await base44.entities.OutreachCampaign.update(campaign.id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
        });

        return Response.json({
          ok: true,
          campaign_id: campaign.id,
          total_leads: leadIds.length,
          mms_result: mmsRes.data || mmsRes,
          email_result: emailRes.data || emailRes,
          call_result: callRes?.data || callRes,
        });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}