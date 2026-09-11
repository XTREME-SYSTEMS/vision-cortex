/**
 * Vision Cortex — Base44 SDK compatibility runtime.
 * Runs the original base44/functions/.../entry.ts unchanged on Vercel (Node) / Railway.
 *
 * See ../SYSTEM-PORT.md for the contract.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1';

export const secrets = {
  get(name: string): string | null {
    if (!name) return null;
    const v = process.env[`SECRET_${name}`] ?? process.env[name] ??
      (name === 'AI_GATEWAY_API_KEY' ? (process.env['VERCEL_AI_GATEWAY_API_KEY'] ?? process.env['SECRET_VERCEL_AI_GATEWAY_API_KEY']) : undefined);
    return v === undefined || v === '' ? null : (v as string);
  }
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

async function supabaseFetch(path: string, init: any, auth: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: auth === SERVICE_ROLE_KEY ? SERVICE_ROLE_KEY : SUPABASE_ANON_KEY,
      Authorization: `Bearer ${auth}`,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });
  if (!res.ok) {
    let detail = '';
    try { detail = JSON.stringify(await res.json()).slice(0, 500); } catch { detail = await res.text(); }
    throw new Error(`Supabase ${res.status} on ${path}: ${detail}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function restEncode(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  const s = String(value).replace(/"/g, '\\"');
  return `"${s}"`;
}

interface FilterParams {
  [k: string]: any;
}

function buildFilterQuery(params: FilterParams = {}): string {
  const parts: string[] = [];
  const filterType: Record<string, string> = params.filter_type || {};
  for (const [field, value] of Object.entries(params)) {
    if (['sort', 'order', 'limit', 'offset', 'filter_type'].includes(field)) continue;
    if (value === undefined || value === null) continue;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // mongo-style: { $in, $ne, $gt, $gte, $lt, $lte, $like }
      for (const [op, opVal] of Object.entries(value as Record<string, any>)) {
        switch (op) {
          case '$in':
            parts.push(`${field}=in.(${(opVal as any[]).map(restEncode).join(',')})`);
            break;
          case '$nin':
            parts.push(`${field}=not.in.(${(opVal as any[]).map(restEncode).join(',')})`);
            break;
          case '$ne':
            parts.push(`${field}=neq.${restEncode(opVal)}`);
            break;
          case '$gt': parts.push(`${field}=gt.${restEncode(opVal)}`); break;
          case '$gte': parts.push(`${field}=gte.${restEncode(opVal)}`); break;
          case '$lt': parts.push(`${field}=lt.${restEncode(opVal)}`); break;
          case '$lte': parts.push(`${field}=lte.${restEncode(opVal)}`); break;
          case '$like':
            parts.push(`${field}=like.*${String(opVal).replace(/\*/g, '')}*`);
            break;
          default: break;
        }
      }
      continue;
    }

    const ft = filterType[field];
    if (Array.isArray(value) || ft === 'in' || ft === 'not_in') {
      const list = Array.isArray(value) ? value : [value];
      const op = ft === 'not_in' ? 'not.in' : 'in';
      parts.push(`${field}=${op}.(${list.map(restEncode).join(',')})`);
    } else if (ft === 'like') {
      parts.push(`${field}=like.*${String(value).replace(/\*/g, '')}*`);
    } else if (ft === 'neq' || ft === 'not') {
      parts.push(`${field}=neq.${restEncode(value)}`);
    } else if (ft === 'gt' || ft === 'gte' || ft === 'lt' || ft === 'lte') {
      parts.push(`${field}=${ft}.${restEncode(value)}`);
    } else {
      parts.push(`${field}=eq.${restEncode(value)}`);
    }
  }

  let sort = params.sort;
  let order = params.order;
  if (typeof sort === 'string' && sort.startsWith('-')) {
    sort = sort.slice(1);
    order = 'desc';
  }
  if (sort) parts.push(`order=${sort}.${order === 'desc' || order === 'descending' ? 'desc' : 'asc'}`);
  if (params.limit) parts.push(`limit=${params.limit}`);
  if (params.offset) parts.push(`offset=${params.offset}`);
  return parts.join('&');
}

/* ------------------------------------------------------------------ */
/* entity client                                                       */
/* ------------------------------------------------------------------ */

function makeEntityClient(table: string, auth: string) {
  const tableQ = encodeURIComponent(`"${table}"`);
  return {
    async list(params: FilterParams = {}) {
      const q = buildFilterQuery(params);
      return supabaseFetch(`/rest/v1/${tableQ}?select=*&${q}`, { method: 'GET' }, auth) as Promise<any[]>;
    },
    async filter(params: FilterParams = {}) {
      return this.list(params);
    },
    async get(id: string) {
      const rows = await supabaseFetch(
        `/rest/v1/${tableQ}?select=*&id=eq.${encodeURIComponent(id)}`,
        { method: 'GET' }, auth);
      if (!rows || !rows.length) throw new Error(`${table} ${id} not found`);
      return rows[0];
    },
    async create(data: any) {
      const rows = await supabaseFetch(
        `/rest/v1/${tableQ}?select=*`,
        { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(data) },
        auth);
      return Array.isArray(rows) ? rows[0] : rows;
    },
    async update(id: string, data: any) {
      const rows = await supabaseFetch(
        `/rest/v1/${tableQ}?id=eq.${encodeURIComponent(id)}&select=*`,
        { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(data) },
        auth);
      if (!rows || !rows.length) throw new Error(`${table} ${id} not found`);
      return rows[0];
    },
    async delete(id: string) {
      await supabaseFetch(
        `/rest/v1/${tableQ}?id=eq.${encodeURIComponent(id)}`,
        { method: 'DELETE' }, auth);
      return { success: true, status: 'deleted' };
    }
  };
}

function makeEntities(auth: string): any {
  return new Proxy({}, {
    get(_t, prop: string) {
      return makeEntityClient(prop, auth);
    }
  });
}

/* ------------------------------------------------------------------ */
/* integrations                                                        */
/* ------------------------------------------------------------------ */

async function gatewayChat(payload: any) {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) throw new Error('AI_GATEWAY_API_KEY not configured');
  let model = payload.model || process.env.AI_GATEWAY_MODEL || 'anthropic/claude-sonnet-4';
  // AI Gateway model ids are provider-prefixed (e.g. 'openai/gpt-5', 'groq/llama-3.3-70b-versatile').
  // Bare model ids get the default provider prefix so legacy ids keep working.
  if (model && !model.includes('/')) {
    model = `${process.env.AI_GATEWAY_DEFAULT_PROVIDER || 'google'}/${model}`;
  }
  // Normalize legacy Base44 underscore ids (e.g. 'gemini_3_flash') to gateway ids ('gemini-3-flash').
  if (model) model = model.replace(/_/g, '-');

  const messages: any[] = [];
  const sys = payload.system_prompt || payload.system || '';
  if (sys) messages.push({ role: 'system', content: sys });
  const prompt = typeof payload.prompt === 'string'
    ? payload.prompt
    : JSON.stringify(payload.prompt ?? '');
  messages.push({ role: 'user', content: prompt });

  const body: any = {
    model,
    messages,
    max_tokens: Math.min(payload.max_tokens || 4096, 32768),
    temperature: payload.temperature ?? 0.7
  };
  if (payload.response_json_schema || payload.json_schema) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(`${AI_GATEWAY_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`AI Gateway ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  const data = await res.json();
  const response = data.choices?.[0]?.message?.content || '';
  return {
    response,
    generation: response,
    text: response,
    model: data.model || model,
    usage: data.usage || {}
  };
}

async function sendEmail(payload: any) {
  const { to, subject, body, html_body, from } = payload;
  if (!to || (!body && !html_body)) throw new Error('SendEmail requires "to" and a body');
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';
  if (!smtpUser || !smtpPass) throw new Error('SMTP not configured (SMTP_USER/SMTP_PASS)');
  // dynamic import keeps the bundle lean and fails loudly when creds are absent
  const nodemailer: any = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: smtpUser, pass: smtpPass }
  });
  const info = await transporter.sendMail({
    from: from || process.env.EMAIL_FROM || smtpUser,
    to: Array.isArray(to) ? to.join(',') : to,
    subject: subject || '(no subject)',
    text: body || undefined,
    html: html_body || undefined
  });
  return { message_id: info.messageId, status: 'sent' };
}

async function uploadFile(payload: any) {
  const { file_name, content, content_type } = payload;
  if (!file_name || !content) throw new Error('UploadFile requires file_name and content (base64)');
  const bucket = 'app-files';
  const path = `${Date.now()}-${file_name}`;
  const buf = Buffer.from(content, 'base64');
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': content_type || 'application/octet-stream',
      'x-upsert': 'true'
    },
    body: new Uint8Array(buf)
  });
  if (!res.ok) throw new Error(`Storage upload failed ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return {
    file_url: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeURIComponent(path)}`,
    path
  };
}

async function generateImage(payload: any) {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) throw new Error('AI_GATEWAY_API_KEY not configured');
  const res = await fetch(`${AI_GATEWAY_URL}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: (payload.model || process.env.AI_GATEWAY_IMAGE_MODEL || 'openai/dall-e-3').replace(/_/g, '-'),
      prompt: payload.prompt,
      size: payload.size || '1024x1024',
      n: 1
    })
  });
  if (!res.ok) throw new Error(`AI Gateway image ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return { url: data.data?.[0]?.url || data.url, data };
}

async function transcribeAudio(payload: any) {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) throw new Error('AI_GATEWAY_API_KEY not configured');
  const { file_base64, file_name } = payload;
  if (!file_base64) throw new Error('TranscribeAudio requires file_base64');
  const bytes = Buffer.from(file_base64, 'base64');
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)]), file_name || 'audio.mp3');
  form.append('model', (payload.model || process.env.AI_GATEWAY_TRANSCRIBE_MODEL || 'openai/whisper-1').replace(/_/g, '-'));
  const res = await fetch(`${AI_GATEWAY_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });
  if (!res.ok) throw new Error(`AI Gateway audio ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return { text: data.text || '', ...data };
}

function makeIntegrations() {
  const Core: any = {
    InvokeLLM: gatewayChat,
    SendEmail: sendEmail,
    UploadFile: uploadFile,
    GenerateImage: generateImage,
    TranscribeAudio: transcribeAudio
  };
  return { Core };
}

function makeConnectors() {
  return {
    async getConnection(name: string) {
      const envName = `CONN_${String(name).toUpperCase().replace(/[^A-Z0-9]/g, '_')}_ACCESS_TOKEN`;
      const token = process.env[envName];
      return token ? { access_token: token, provider: name } : null;
    }
  };
}

/* ------------------------------------------------------------------ */
/* client assembly                                                     */
/* ------------------------------------------------------------------ */

interface B44User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

async function resolveUser(jwt: string | null): Promise<B44User | null> {
  if (!jwt) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${jwt}` }
    });
    if (!res.ok) return null;
    const su = await res.json();
    let role = 'user';
    let fullName: string = su.user_metadata?.full_name || su.user_metadata?.name || '';
    if (SERVICE_ROLE_KEY) {
      try {
        const rows = await supabaseFetch(
          `/rest/v1/${encodeURIComponent('"User"')}?id=eq.${encodeURIComponent(su.id)}&select=*`,
          { method: 'GET' }, SERVICE_ROLE_KEY);
        if (rows && rows.length) {
          role = rows[0].role || 'user';
          fullName = fullName || rows[0].full_name || '';
        }
      } catch { /* profile row may not exist yet */ }
    }
    return { id: su.id, email: su.email || '', full_name: fullName, role };
  } catch {
    return null;
  }
}

export function createClientFromRequest(req: Request) {
  let jwt: string | null = null;
  try {
    const authz = req.headers.get('authorization') || (req as any).headers?.authorization;
    if (authz && authz.toLowerCase().startsWith('bearer ')) jwt = authz.slice(7).trim();
    if (!jwt) {
      const url = new URL(req.url);
      jwt = url.searchParams.get('token');
    }
  } catch { /* no auth */ }

  const userPromise: Promise<B44User | null> = resolveUser(jwt);

  const client: any = {
    auth: {
      async me() { return userPromise; }
    },
    entities: makeEntities(jwt || SUPABASE_ANON_KEY),
    asServiceRole: {
      entities: makeEntities(SERVICE_ROLE_KEY),
      integrations: makeIntegrations(),
      connectors: makeConnectors()
    },
    integrations: makeIntegrations()
  };
  return client;
}

/** Build a client with service-role access directly (used by the Railway worker). */
export function createServiceClient() {
  return {
    auth: { async me() { return { id: '00000000-0000-0000-0000-000000000000', email: 'system@worker', full_name: 'Vision Cortex Worker', role: 'admin' }; } },
    entities: makeEntities(SERVICE_ROLE_KEY),
    asServiceRole: {
      entities: makeEntities(SERVICE_ROLE_KEY),
      integrations: makeIntegrations(),
      connectors: makeConnectors()
    },
    integrations: makeIntegrations()
  };
}

export default { createClientFromRequest, createServiceClient, secrets };
