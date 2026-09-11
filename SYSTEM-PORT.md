# Vision Cortex — Port Contract (Base44 → Vercel + Supabase + Railway)

This document is the binding contract for the port. All workers follow it exactly.

Source of truth: this repo root (`visioncortex/`) is a Base44 export (Vite React SPA + `base44/` backend).

## Target architecture

```
thevisioncortex.com (IONOS DNS) → Vercel
  ├── SPA (dist/) — static
  ├── /api/functions/[name]  — ALL ~190 base44 backend functions (Node runtime)
  └── /api/llm               — authenticated passthrough for frontend LLM calls
Supabase
  ├── Postgres: all 80+ entities as tables (schema generated from base44/entities/*.jsonc)
  ├── Auth: email/password + Google OAuth; public."User" mirrors role/full_name
  └── Storage: bucket "app-files" for UploadFile
Railway
  └── worker/ — long-running autonomous loops calling the same function entries in-process (service role)
```

## Backend compatibility layer (ALREADY WRITTEN — do not modify)

`base44/runtime/index.ts` exports exactly what the base44 SDK provided:

- `createClientFromRequest(req)` — returns `base44` client
- `secrets` — `{ get(name) }` → `process.env['SECRET_'+name] ?? process.env[name] ?? null`

Client surface (verified by grep over all entries):
- `base44.auth.me()` → `{ id, email, full_name, role } | null`
- `base44.entities.<Entity>.list(params?)` / `.filter(params)` / `.get(id)` / `.create(data)` / `.update(id, data)` / `.delete(id)`
- `base44.asServiceRole.<same>` (bypasses RLS via service key)
- `base44.asServiceRole.integrations.Core.InvokeLLM(payload)` → `{ response, generation, usage, model }`
- `base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body, html_body?, from? })`
- `base44.asServiceRole.integrations.Core.UploadFile({ file_name, content_type, content })` (content = base64) → `{ file_url }`
- `base44.asServiceRole.integrations.Core.GenerateImage({ prompt, size? })` → `{ url }`
- `base44.asServiceRole.integrations.Core.TranscribeAudio({ file_base64, file_name })` → `{ text }`
- `base44.asServiceRole.connectors.getConnection(name)` → `{ access_token } | null` (env: `CONN_<NAME>_ACCESS_TOKEN`)

Filter semantics (frontend uses these — the runtime implements both):
- `{ field: value }` equality; `{ field: { $in: [...] } }`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$like`
- also `filter_type` map `{ field: 'in'|'not_in'|'like'|'gt'|'gte'|'lt'|'lte'|'neq' }`
- `sort` (`'-field'` = desc), `order` ('asc'|'desc'), `limit`, `offset`

## Environment variables (server)

```
SUPABASE_URL=                 # https://<ref>.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_GATEWAY_API_KEY=           # Vercel AI Gateway key (https://vercel.com/ai-gateway)
AI_GATEWAY_MODEL=             # default chat model id, e.g. anthropic/claude-sonnet-4
AI_GATEWAY_IMAGE_MODEL=        # e.g. openai/dall-e-3 (optional)
SMTP_HOST=smtp.gmail.com      # Google Workspace SMTP
SMTP_PORT=465
SMTP_USER=                    # e.g. system@thevisioncortex.com
SMTP_PASS=                    # Google Workspace app password
EMAIL_FROM=                   # default From header
CONN_GMAIL_ACCESS_TOKEN=      # optional connector tokens (long-lived)
CONN_GOOGLEDRIVE_ACCESS_TOKEN=
CONN_GOOGLECALENDAR_ACCESS_TOKEN=
CONN_GOOGLESHEETS_ACCESS_TOKEN=
CONN_GOOGLETASKS_ACCESS_TOKEN=
CONN_GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN=
SECRET_<NAME>=                # app secrets used via secrets.get(), e.g. SECRET_GROQ_API_KEY
```

## Frontend shim contract (`src/lib/b44-client.js`)

Replaces `@base44/sdk` `createClient`. Must export `createClient(opts)` returning an object with:

- `auth`: `me()`, `loginViaEmailPassword(email,pass)`, `register({email,password,full_name?})`,
  `loginWithProvider('google')`, `logout()`, `isAuthenticated()`,
  `resetPasswordRequest(email)`, `resetPassword(newPassword)`,
  `verifyOtp({email,token,type?})`, `resendOtp(email)`, `setToken()` (no-op)
  — all via `@supabase/supabase-js`
- `entities`: Proxy over entity names → `{ list, filter, get, create, update, delete }`
  using supabase-js (user session; RLS enforced by Postgres)
- `functions`: `{ invoke(name, args) }` → `POST /api/functions/<name>` with
  `Authorization: Bearer <session access token>` and JSON body; returns response JSON
- `integrations.Core.InvokeLLM(payload)` → `POST /api/llm` (same auth)

`src/api/base44Client.js` becomes a thin re-export of the shim.
`src/lib/AuthContext.jsx` is rewritten to Supabase auth but MUST keep its existing
exported hook API (read the current file; keep every exported name and state shape:
`user`, `isAuthenticated`, `isLoadingAuth`, `login`, `register`, `loginWithGoogle`,
`logout`, etc.). Pages import `useAuth` from it — they must not change.

Auth flows: Google OAuth via `supabase.auth.signInWithOAuth({provider:'google', options:{redirectTo: window.location.origin}})`.
Public settings check (`/api/apps/public/...`) is dropped — the app requires no registration gate;
treat all authenticated users as registered (role from public."User").

## Database

`supabase/migrations/0001_init.sql` is GENERATED from `base44/entities/*.jsonc`:

- table per entity, quoted PascalCase name, e.g. `CREATE TABLE public."Opportunity" (...)`
- reserved columns on every table: `id uuid primary key default gen_random_uuid()`,
  `created_date timestamptz default now()`, `updated_date timestamptz default now()`,
  `created_by uuid references auth.users(id)`
- JSON-schema type map: string→text, number→double precision, boolean→boolean,
  array→jsonb, object→jsonb, enum→text (no pg enums — keep migrations simple)
- `required` → `not null` ONLY for non-reserved fields
- RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
  - if entity `rls` block has a `user_condition` with `role: admin` for an operation →
    policy allows only `admin` role (checked via `public."User".role`)
  - otherwise → owner policy (`created_by = auth.uid()`), admins bypass
  - INSERT policies set `created_by` from `auth.uid()`
- trigger on `auth.users` INSERT → insert `public."User"` row
  (`id`, `email`, `full_name` from raw_user_meta_data, `role` = 'admin' if first user else 'user')
- `updated_date` auto-update trigger on every table
- storage bucket `app-files` (public) + statement

## Directory plan

- `api/functions/[name].ts` — WRITTEN (catch-all; imports registry)
- `api/llm.ts` — WRITTEN
- `base44/runtime/index.ts` — WRITTEN (compat layer)
- `base44/runtime/registry.ts` — GENERATED (static imports of all entries)
- `base44/functions/*/entry.ts` — imports rewritten mechanically
- `supabase/migrations/0001_init.sql` — generated
- `worker/` — Railway service
- `provision/` — provisioning system + runbook
- `vercel.json` — SPA rewrite + /api passthrough
