import { createClientFromRequest, secrets } from '../../runtime/index';
import { browseSession, browseStealth, str } from '../../shared/cloudBrowser.ts';

// Processes pending Brain commands — executes scrape_url, add_seed, run_cycle, etc.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      isAdmin = user?.role === 'admin';
    } catch {}
    if (!isAdmin) return Response.json({ error: 'Admin only' }, { status: 403 });

    // Fetch pending commands
    const commands = await base44.asServiceRole.entities.BrainCommand.filter(
      { status: 'pending' },
      'received_at',
      10
    ).catch(() => []);

    if (commands.length === 0) {
      return Response.json({ status: 'idle', message: 'No pending commands' });
    }

    const results = [];
    for (const cmd of commands) {
      try {
        // Mark as processing
        await base44.asServiceRole.entities.BrainCommand.update(cmd.id, { status: 'processing' });

        let resultText = '';
        const p = cmd.payload || {};

        switch (cmd.command_type) {
          case 'scrape_url': {
            if (!p.url) throw new Error('url required for scrape_url');
            try {
              const text = await browseStealth(p.url, {
                maxChars: 40000,
                retries: 2,
              });
              resultText = `Scraped ${p.url}: ${text.text?.length || 0} chars extracted`;

              // If category provided, ingest as intel
              if (p.category && text.text) {
                const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
                  prompt: `Extract intelligence from this page. URL: ${p.url}\nCategory: ${p.category}\n\nContent:\n"""\n${text.text}\n"""`,
                  model: 'gemini_3_flash',
                  response_json_schema: {
                    type: 'object',
                    properties: {
                      items: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            headline: { type: 'string' },
                            summary: { type: 'string' },
                            source: { type: 'string' },
                            url: { type: 'string' },
                            signals: { type: 'array', items: { type: 'string' } },
                            region: { type: 'string' },
                            impact_score: { type: 'number' },
                          },
                          required: ['headline', 'summary'],
                        },
                      },
                    },
                    required: ['items'],
                  },
                });
                const records = (llm.items || []).map((it) => ({
                  category: p.category,
                  headline: str(it.headline, 300),
                  summary: str(it.summary, 2000),
                  source: str(it.source, 200),
                  url: str(it.url || p.url, 500),
                  signals: (it.signals || []).slice(0, 8).map((s) => str(s, 300)),
                  region: str(it.region, 80) || 'Global',
                  impact_score: Number(it.impact_score) || 0,
                })).filter((r) => r.headline);
                if (records.length) {
                  await base44.asServiceRole.entities.IntelFeed.bulkCreate(records);
                  resultText += `, ingested ${records.length} intel items`;
                }
              }
            } catch (e) {
              resultText = `Scrape failed: ${e.message}`;
            }
            break;
          }

          case 'add_seed': {
            if (!p.domain) throw new Error('domain required for add_seed');
            await base44.asServiceRole.entities.IntelFeed.create({
              category: p.category || 'Seed',
              headline: `Seed target: ${p.domain}`,
              summary: p.notes || `Added by Brain command. Vertical: ${p.vertical || 'unknown'}`,
              url: `https://${p.domain}`,
              source: 'brain_command',
              region: 'Global',
              impact_score: 0,
            });
            resultText = `Seed added: ${p.domain}`;
            break;
          }

          case 'run_cycle': {
            // Trigger the intelligence cycle
            const cycleRes = await base44.functions.invoke('runIntelligenceCycle', { mode: 'process' });
            resultText = `Intelligence cycle triggered: ${cycleRes?.data?.status || 'unknown'}`;
            break;
          }

          case 'run_monetization': {
            const monRes = await base44.functions.invoke('runDataMonetizationCycle', {});
            resultText = `Monetization cycle triggered: ${monRes?.data?.status || 'unknown'}`;
            break;
          }

          case 'update_strategy': {
            resultText = `Strategy update received: ${p.strategy || p.notes || 'no details'}`;
            break;
          }

          case 'follow_money': {
            const moneyRes = await base44.functions.invoke('shadowMoneyHunt', {});
            resultText = `Money hunt triggered: ${moneyRes?.data?.status || 'unknown'}`;
            break;
          }

          case 'create_job': {
            resultText = `Job creation queued: ${p.notes || p.url || 'no details'}`;
            break;
          }

          default:
            resultText = `Unknown command type: ${cmd.command_type}`;
        }

        // Mark complete
        await base44.asServiceRole.entities.BrainCommand.update(cmd.id, {
          status: 'completed',
          result: str(resultText, 2000),
          processed_at: new Date().toISOString(),
        });

        results.push({ command_id: cmd.id, type: cmd.command_type, status: 'completed', result: resultText });
      } catch (e) {
        await base44.asServiceRole.entities.BrainCommand.update(cmd.id, {
          status: 'failed',
          result: str(e.message, 2000),
          processed_at: new Date().toISOString(),
        });
        results.push({ command_id: cmd.id, type: cmd.command_type, status: 'failed', error: e.message });
      }
    }

    // Log the batch
    await base44.asServiceRole.entities.BrainSyncLog.create({
      direction: 'brain_to_eyes',
      operation: 'command_processed',
      status: results.every((r) => r.status === 'completed') ? 'success' : 'failed',
      items_count: results.length,
      details: `${results.filter((r) => r.status === 'completed').length}/${results.length} completed`,
      batch_id: `PROCESS-${Date.now()}`,
    });

    return Response.json({ status: 'success', processed: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}