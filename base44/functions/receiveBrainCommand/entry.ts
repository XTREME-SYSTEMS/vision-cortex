import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// Brain → Eyes webhook: the Brain pushes commands here.
// Authenticated via x-brain-api-key header matching VISION_CORTEX_INBOUND_API_KEY.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Authenticate — the Brain sends x-brain-api-key
    const apiKey = req.headers.get('x-brain-api-key') || '';
    const expectedKey = secrets.get('VISION_CORTEX_INBOUND_API_KEY') || '';
    if (!expectedKey || apiKey !== expectedKey) {
      return Response.json({ error: 'Unauthorized — invalid x-brain-api-key' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const commandType = body.command_type;
    if (!commandType) return Response.json({ error: 'command_type is required' }, { status: 400 });

    // Store the command for async processing
    const cmd = await base44.asServiceRole.entities.BrainCommand.create({
      command_type: commandType,
      status: 'pending',
      payload: {
        url: body.url || '',
        prompt: body.prompt || '',
        category: body.category || '',
        domain: body.domain || '',
        vertical: body.vertical || '',
        strategy: body.strategy || '',
        notes: body.notes || '',
      },
      received_at: new Date().toISOString(),
    });

    // Log receipt
    await base44.asServiceRole.entities.BrainSyncLog.create({
      direction: 'brain_to_eyes',
      operation: 'command_received',
      status: 'success',
      items_count: 1,
      details: `Command ${commandType} queued as ${cmd.id}`,
      batch_id: cmd.id,
    });

    return Response.json({
      status: 'queued',
      command_id: cmd.id,
      command_type: commandType,
      message: 'Command received and queued for processing',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}