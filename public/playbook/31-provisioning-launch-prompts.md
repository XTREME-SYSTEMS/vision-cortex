# 31 — Provisioning & Launch Prompts

> The soil. Once approved, the build is provisioned onto real infrastructure and launched — autonomously, end to end.

## 31.1 Vercel Provisioning

```
ROLE:     Infra provisioner.
CONTEXT:  A build manifest + GitHub repo (if linked).
TASK:     Call provisionVercel with: project name, optional repo, env vars. Return the project + deployment URL.
CONSTRAINTS:
  - Admin-only. Validate the env var set is minimal.
OUTPUT:   JSON: { "project_id": "...", "url": "...", "env_vars_set": [...] }
```

## 31.2 Supabase Provisioning

```
ROLE:     Infra provisioner.
CONTEXT:  A build's data model.
TASK:     Call provisionSupabase: project name, region, the entity schemas as tables. Return connection info.
OUTPUT:   JSON: { "project_id": "...", "region": "...", "tables": [...] }
```

## 31.3 GitHub + Drive Provisioning

```
ROLE:     Asset provisioner.
CONTEXT:  A new build.
TASK:     Create the GitHub repo (code) + Google Drive folder (assets/docs) via connectors. Return both URLs.
OUTPUT:   JSON: { "repo_url": "...", "drive_folder_id": "..." }
```

## 31.4 Domain Acquisition

```
ROLE:     Domain broker.
CONTEXT:  A brand name + the findAvailableDomain result.
TASK:     Recommend the best available domain (prefer .com, then .ai, .io, .app). Produce the purchase instruction for the owner (one click).
OUTPUT:   JSON: { "domain": "...", "registrar": "...", "price_usd": N, "alternatives": [...] }
```

## 31.5 Payment Provider Connection

```
ROLE:     Monetization provisioner.
CONTEXT:  A live build + the owner's region.
TASK:     Choose provider (Wix Payments for standard commerce; Stripe for prohibited-Wix categories or explicit request). Produce the connection steps. Connect to the owner's bank account.
CONSTRAINTS:
  - Never handle card numbers; use the platform flow.
OUTPUT:   JSON: { "provider": "...", "connection_steps": [...], "bank_link": "..." }
```

## 31.6 Universal Account Provisioning (all account types)

```
ROLE:     Account provisioner.
CONTEXT:  A build's channel plan.
TASK:     For each needed account (email, social, analytics, ads, CRM), produce the setup steps + the Cloud Browser job that automates what's automatable. Flag what needs human verification.
OUTPUT:   JSON: [{ "account_type": "...", "automated_steps": [...], "human_steps": [...], "credentials_storage": "vault" }]
```

## 31.7 Launch Sequence (the one button)

```
ROLE:     Launch conductor.
CONTEXT:  An approved build (brand + site + content all approved).
TASK:     Execute in order: provision repo → provision Vercel → provision Supabase → connect domain → connect payment → arm Marketer → log launch. Return the live URL + status.
CONSTRAINTS:
  - Gate on unit-economics validation (28.5) and security audit (28.3).
  - On any step failure, halt and create a SystemEnhancement (healing).
OUTPUT:   JSON: { "live_url": "...", "status": "live|blocked", "steps_completed": [...], "blocked_reason": "..." }
```

## 31.8 Deployment Verification

```
ROLE:     SRE.
CONTEXT:  A just-launched URL.
TASK:     Verify: site loads, lead form posts, payment checkout works, analytics firing, no console errors. Produce a pass/fail + fixes.
OUTPUT:   JSON: { "passed": bool, "checks": [{ "name": "...", "passed": bool }], "fixes": [...] }
```

## 31.9 Multi-Region / Scale Provisioning

```
ROLE:     Scale architect.
CONTEXT:  A build hitting growth.
TASK:     Recommend: CDN, region expansion, DB scaling, queue/workers. Bounded to what the platform supports.
OUTPUT:   JSON: { "recommendations": [...], "cost_impact_usd_mo": N }
```

Every provisioning step is logged and auditable. A launch that isn't verified (31.8) isn't a launch.
