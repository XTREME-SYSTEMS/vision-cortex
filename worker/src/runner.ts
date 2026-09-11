import { registry } from '../../base44/runtime/registry';
import { createServiceClient, secrets } from '../../base44/runtime/index';
import { createServer } from 'node:http';

export interface ScheduleItem {
  cron: string;
  function: string;
}

export const DEFAULT_SCHEDULES: ScheduleItem[] = [
  { cron: '*/15 * * * *', function: 'autonomousHeartbeat' },
  { cron: '0 * * * *', function: 'autonomousMasterLoop' },
  { cron: '0 */2 * * *', function: 'runIntelligenceCycle' },
  { cron: '0 * * * *', function: 'opportunitySweep' },
  { cron: '0 4 * * *', function: 'nightlyPipelinePrep' },
  { cron: '0 */6 * * *', function: 'masterDeepOrchestrator' },
  { cron: '0 6 * * *', function: 'autoEnhanceAll' },
  { cron: '0 5 * * *', function: 'systemScanner' }
];

/**
 * Parses a single 5-field cron component string (e.g. star, star/15, 0,30, 1-5, 1-10/2)
 * into a Set of matching integers within [min, max].
 */
export function parseCronField(fieldStr: string, min: number, max: number): Set<number> {
  const result = new Set<number>();
  const parts = fieldStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed === '*') {
      for (let i = min; i <= max; i++) {
        result.add(i);
      }
    } else if (trimmed.startsWith('*/')) {
      const step = parseInt(trimmed.slice(2), 10);
      if (!isNaN(step) && step > 0) {
        for (let i = min; i <= max; i++) {
          if ((i - min) % step === 0) {
            result.add(i);
          }
        }
      }
    } else if (trimmed.includes('/')) {
      const [rangeStr, stepStr] = trimmed.split('/');
      const step = parseInt(stepStr, 10);
      let rangeStart = min;
      let rangeEnd = max;
      if (rangeStr !== '*') {
        if (rangeStr.includes('-')) {
          const [s, e] = rangeStr.split('-');
          rangeStart = parseInt(s, 10);
          rangeEnd = parseInt(e, 10);
        } else {
          rangeStart = parseInt(rangeStr, 10);
        }
      }
      if (!isNaN(step) && step > 0 && !isNaN(rangeStart) && !isNaN(rangeEnd)) {
        for (let i = rangeStart; i <= rangeEnd; i++) {
          if ((i - rangeStart) % step === 0 && i >= min && i <= max) {
            result.add(i);
          }
        }
      }
    } else if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          if (i >= min && i <= max) {
            result.add(i);
          }
        }
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= min && num <= max) {
        result.add(num);
      }
    }
  }

  return result;
}

/**
 * Checks if a Date matches a 5-field cron expression:
 * minute hour day-of-month month day-of-week
 */
export function matchesCron(cronExpr: string, date: Date): boolean {
  const fields = cronExpr.trim().split(/\s+/);
  if (fields.length !== 5) return false;

  const minute = date.getMinutes();
  const hour = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1; // 1-12
  const dayOfWeek = date.getDay(); // 0-6

  const validMinutes = parseCronField(fields[0], 0, 59);
  const validHours = parseCronField(fields[1], 0, 23);
  const validDaysOfMonth = parseCronField(fields[2], 1, 31);
  const validMonths = parseCronField(fields[3], 1, 12);
  const validDaysOfWeek = parseCronField(fields[4], 0, 6);

  return (
    validMinutes.has(minute) &&
    validHours.has(hour) &&
    validDaysOfMonth.has(dayOfMonth) &&
    validMonths.has(month) &&
    validDaysOfWeek.has(dayOfWeek)
  );
}

/**
 * Executes a function entry from the registry using a synthetic Request.
 */
async function runJob(name: string, triggerType: 'cron' | 'manual' = 'cron', cronExpr?: string) {
  const isoTime = new Date().toISOString();
  console.log(`[${isoTime}] [FIRE] Executing job '${name}' (trigger: ${triggerType}${cronExpr ? `, schedule: '${cronExpr}'` : ''})`);

  try {
    const entry = (registry as Record<string, any>)[name];
    if (!entry || typeof entry.default !== 'function') {
      console.error(`[${new Date().toISOString()}] [ERROR] Job '${name}' failed: function not found in registry`);
      return { status: 404, error: `Function '${name}' not found in registry` };
    }

    const req = new Request(`https://worker.internal/api/functions/${name}`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + (process.env.SUPABASE_SERVICE_ROLE_KEY || ''),
        'content-type': 'application/json'
      },
      body: '{}'
    });

    const res = await entry.default(req);
    console.log(`[${new Date().toISOString()}] [SUCCESS] Job '${name}' completed with status: ${res.status}`);
    return { status: res.status };
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] [ERROR] Job '${name}' threw exception:`, err?.message || err);
    return { status: 500, error: String(err?.message || err) };
  }
}

// Determine active schedules
let activeSchedules: ScheduleItem[] = DEFAULT_SCHEDULES;
if (process.env.WORKER_SCHEDULES) {
  try {
    const parsed = JSON.parse(process.env.WORKER_SCHEDULES);
    if (Array.isArray(parsed) && parsed.length > 0) {
      activeSchedules = parsed;
      console.log(`Loaded ${activeSchedules.length} custom schedules from WORKER_SCHEDULES env.`);
    }
  } catch (e) {
    console.error('Failed to parse WORKER_SCHEDULES env, using DEFAULT_SCHEDULES fallback:', e);
  }
}

let lastTickMinuteKey = '';

function tick() {
  const now = new Date();
  const currentMinuteKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
  if (currentMinuteKey === lastTickMinuteKey) {
    return;
  }
  lastTickMinuteKey = currentMinuteKey;

  for (const item of activeSchedules) {
    if (matchesCron(item.cron, now)) {
      runJob(item.function, 'cron', item.cron);
    }
  }
}

// Start HTTP Server
const PORT = parseInt(process.env.PORT || '3000', 10);
const server = createServer(async (req, res) => {
  const method = req.method || 'GET';
  const url = req.url || '/';
  const pathname = url.split('?')[0];

  if (method === 'GET' && (pathname === '/' || pathname === '/health')) {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (method === 'POST' && pathname.startsWith('/run/')) {
    const name = pathname.slice('/run/'.length).trim();
    const workerToken = process.env.WORKER_TOKEN;
    const rawHeader = req.headers['x-worker-token'];
    const clientToken = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (workerToken && clientToken !== workerToken) {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized: invalid or missing x-worker-token header' }));
      return;
    }

    if (!name) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing function name in path /run/:name' }));
      return;
    }

    const outcome = await runJob(name, 'manual');
    const httpCode = outcome.status >= 200 && outcome.status < 600 ? outcome.status : 500;
    res.writeHead(httpCode, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ function: name, status: outcome.status, error: outcome.error }));
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Vision Cortex Worker active on port ${PORT}`);
  console.log(`Active schedules (${activeSchedules.length}):`);
  for (const s of activeSchedules) {
    console.log(`  - ${s.cron.padEnd(15)} -> ${s.function}`);
  }
  // Start 1-second interval ticker
  setInterval(tick, 1000);
});
