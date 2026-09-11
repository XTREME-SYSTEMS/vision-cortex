# Vision Cortex Operations Runbook & Provisioning Guide

This runbook covers the end-to-end architecture, automated provisioning system, environment configuration, DNS setup, day-2 operations, and troubleshooting for **Vision Cortex**.

---

## 1. System Architecture

```
                                  +-----------------------+
                                  |   IONOS DNS Manager   |
                                  | (thevisioncortex.com) |
                                  +-----------+-----------+
                                              |
                                              | A: 76.76.21.21
                                              | CNAME www: cname.vercel-dns.com
                                              v
+-----------------------------------------------------------------------------------+
| Vercel Cloud Platform                                                             |
|                                                                                   |
|  +---------------------------+       +-----------------------------------------+  |
|  | Vite React SPA (dist/)    |       | Serverless API Functions                |  |
|  | Routes fallback to        |  -->  |  • /api/functions/[name] (~190 entries) |  |
|  | /index.html               |       |  • /api/llm (AI Gateway Passthrough)    |  |
|  +---------------------------+       +-------------------+---------------------+  |
+----------------------------------------------------------|------------------------+
                                                           |
                          +--------------------------------+--------------------------------+
                          |                                                                 |
                          v                                                                 v
+---------------------------------------------------+            +---------------------------------------------------+
| Supabase Managed Infrastructure                   |            | Railway Background Worker                         |
|                                                   |            |                                                   |
|  • Postgres Database (80+ entity tables)          |            |  • worker/ service running autonomous loops       |
|  • Auth (Email/Password + Google OAuth)           |            |  • Calls backend entries with Service Role rights |
|  • Storage Bucket: "app-files"                    |            |  • HTTP endpoint POST /run/<name> for ad-hoc jobs  |
|  • RLS Security Policies via public."User".role   |            |  • Authenticated via WORKER_TOKEN                 |
+---------------------------------------------------+            +---------------------------------------------------+
```

---

## 2. Automated Provisioning System

The automated provisioning pipeline is driven by `./provision/provision.sh`. It handles project creation, migration, environment sync, domain association, and status checking idempotently using `provision/.state.json`.

### 2.1 Quick Start

```bash
# 1. Preview planned actions (Dry Run)
./provision/provision.sh --dry-run

# 2. Run full automated provisioning
export SUPABASE_ACCESS_TOKEN="sbp_your_supabase_token"
export VERCEL_TOKEN="ver_your_vercel_token"       # Optional (falls back to manual CLI)
export RAILWAY_TOKEN="railway_your_railway_token"  # Optional (falls back to manual steps)

./provision/provision.sh \
  --project-name visioncortex \
  --region us-east-1 \
  --domain thevisioncortex.com

# 3. Check live status of provisioned services
./provision/provision.sh --status
```

### 2.2 CLI Flags Reference

| Flag | Default | Description |
| --- | --- | --- |
| `--org-id <id>` | (auto-selected) | Specify exact Supabase Organization ID |
| `--org-name <name>` | (auto-selected) | Match Supabase Organization by name |
| `--project-name <name>` | `visioncortex` | Supabase & Vercel project identifier |
| `--region <region>` | `us-east-1` | Supabase database region |
| `--domain <domain>` | `thevisioncortex.com` | Custom domain mapped to Vercel project |
| `--skip-db` | `false` | Skip applying `supabase/migrations/0001_init.sql` |
| `--dry-run` | `false` | Print actions without making API calls or modifying state |
| `--status` | `false` | Inspect recorded state in `.state.json` and query live APIs |

---

## 3. Environment Variables Reference

Secrets and configuration are read from `provision/.env.production` (generated during provisioning) and deployed to Vercel and Railway.

| Variable Name | Target Scope | Description | Example / Default |
| --- | --- | --- | --- |
| `SUPABASE_URL` | Server | Supabase REST / Realtime API base URL | `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Server | Public anonymous API key for Supabase | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Secret administrative service role key (bypasses RLS) | `eyJhbGci...` |
| `VITE_SUPABASE_URL` | Frontend | Supabase project URL bundled into Vite client | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Public Supabase anon key bundled into Vite client | `eyJhbGci...` |
| `AI_GATEWAY_API_KEY` | Server | Vercel AI Gateway API key | `vkey_12345...` |
| `AI_GATEWAY_MODEL` | Server | Default chat model identifier | `anthropic/claude-sonnet-4` |
| `AI_GATEWAY_IMAGE_MODEL` | Server | Default image generation model identifier | `openai/dall-e-3` |
| `SMTP_HOST` | Server | SMTP server host for outgoing mail | `smtp.gmail.com` |
| `SMTP_PORT` | Server | SMTP server port | `465` |
| `SMTP_USER` | Server | Google Workspace account email | `system@thevisioncortex.com` |
| `SMTP_PASS` | Server | Google Workspace 16-character App Password | `abcd efgh ijkl mnop` |
| `EMAIL_FROM` | Server | Default From email address header | `system@thevisioncortex.com` |
| `CONN_*_ACCESS_TOKEN` | Server | Long-lived OAuth access tokens for external connectors | `ya29.a0...` |
| `SECRET_*` | Server | Custom secrets accessed via `secrets.get('NAME')` | e.g. `SECRET_GROQ_API_KEY` |
| `WORKER_TOKEN` | Worker / Server | Secret bearer token for authorizing background worker jobs | `sec_worker_123` |

---

## 4. Day-2 Operations

### 4.1 Redeploying Applications

* **Vercel Frontend & Serverless API Functions**:
  ```bash
  vercel --prod
  ```
  Or trigger deployment automatically by pushing commits to the main Git branch.

* **Railway Worker Service**:
  ```bash
  cd worker
  railway up
  ```

### 4.2 Instant Production Rollback

If a Vercel deployment encounters critical regression:
```bash
vercel rollback
```
Select the previous healthy deployment alias from the CLI interactive menu to instantly route production traffic back to it.

### 4.3 Triggering Worker Jobs Manually

Background worker jobs defined in `worker/` can be invoked ad-hoc via HTTP POST:
```bash
curl -X POST "https://<your-railway-worker-url>/run/<job_name>" \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"param": "value"}'
```

### 4.4 Applying Future DDL / Schema Migrations

To apply database updates or new migrations after initial provisioning:
```bash
curl -X POST "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "ALTER TABLE public.\"User\" ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';"}'
```

### 4.5 Service Log Locations

* **Vercel API & Functions Logs**:
  Navigate to [Vercel Dashboard](https://vercel.com) -> Select `visioncortex` project -> **Logs** / **Functions** tab. Real-time streaming logs and invocation execution times are visible here.
* **Supabase Database & Auth Logs**:
  Navigate to [Supabase Dashboard](https://supabase.com/dashboard) -> Select Project -> **Logs** -> Choose **Postgres Logs**, **API Logs**, **Auth Logs**, or **Storage Logs**.
* **Railway Worker Logs**:
  Navigate to [Railway Dashboard](https://railway.app) -> Select Project -> Select `worker` Service -> **Deployments** -> **View Logs**.

---

## 5. IONOS DNS Setup Guide

Configure DNS records for `thevisioncortex.com` in IONOS Domain Center:

1. Log in to the [IONOS Control Center](https://ionos.com) and navigate to **Domains & SSL** -> `thevisioncortex.com` -> **DNS Settings**.
2. Add / Edit the following DNS records:

   | Type | Host Name | Points To / Value | TTL |
   | --- | --- | --- | --- |
   | **A** | `@` | `76.76.21.21` | 1 hour / Automatic |
   | **CNAME** | `www` | `cname.vercel-dns.com` | 1 hour / Automatic |

3. Save settings. Verification on Vercel typically completes within 1 to 10 minutes.

---

## 6. Google Workspace & App-Password Setup

1. Sign in to [Google Workspace Admin Console](https://admin.google.com).
2. Create the system account user: `system@thevisioncortex.com`.
3. Log in as `system@thevisioncortex.com` at [Google Account Security](https://myaccount.google.com/security).
4. Enable **2-Step Verification** (2FA).
5. Navigate to [App Passwords](https://myaccount.google.com/apppasswords).
6. Create an App Password:
   * **App**: Mail
   * **Device**: Custom (`Vercel Production`)
7. Copy the generated 16-character code.
8. Store `SMTP_USER=system@thevisioncortex.com` and `SMTP_PASS=<16-char-code>` in `provision/.env.production` and Vercel environment variables.

---

## 7. Vercel AI Gateway Configuration

Vision Cortex routes all LLM calls through Vercel AI Gateway:

1. Open [Vercel AI Gateway](https://vercel.com/ai-gateway).
2. Create or copy an existing AI Gateway API Key (`vkey_...`).
3. Set the key and desired model identifiers in Vercel project environment variables:
   * `AI_GATEWAY_API_KEY`: `vkey_your_api_key_here`
   * `AI_GATEWAY_MODEL`: `anthropic/claude-sonnet-4` (or model of choice)
   * `AI_GATEWAY_IMAGE_MODEL`: `openai/dall-e-3`

---

## 8. Troubleshooting & Common Pitfalls

### 8.1 Vercel Function Timeouts
* **Symptom**: HTTP 504 Gateway Timeout or function duration exceeded on `/api/functions/[name]`.
* **Cause**: Vercel Serverless functions have execution limits (10s on Hobby, 15s/60s on Pro).
* **Fix**: Offload heavy computational tasks, batch processing, long-running LLM loops, or web scraping to the Railway background worker (`worker/`) via HTTP POST `/run/<job_name>`.

### 8.2 Supabase Row Level Security (RLS) Errors
* **Symptom**: API returns empty list or permission denied when querying tables via client session.
* **Cause**: User row missing in `public."User"` table or invalid role assignment.
* **Fix**: Ensure the user has a record in `public."User"` where `id = auth.uid()`. Check `public."User".role` value ('admin' vs 'user'). Admins bypass condition checks; regular users are restricted by ownership (`created_by = auth.uid()`).

### 8.3 Supabase OAuth Redirect Whitelist
* **Symptom**: Google OAuth authentication redirects to error page or invalid redirect URL.
* **Cause**: Missing allowed redirect URIs in Supabase Authentication settings.
* **Fix**: In [Supabase Dashboard](https://supabase.com/dashboard) -> **Authentication** -> **URL Configuration**:
  * **Site URL**: `https://thevisioncortex.com`
  * **Redirect URLs**: Add `https://thevisioncortex.com/*` and `https://*.vercel.app/*` (for Vercel preview environments).
