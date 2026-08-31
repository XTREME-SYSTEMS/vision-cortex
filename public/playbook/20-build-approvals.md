# 20 — The Build Approvals Flow

> After you commit a simulation, AutoBuilder takes over. The only thing it needs from you is four approvals: the brand, the website, the content, and the launch. One approve button each. Everything else is generators behind the curtain.

## The Flow (steps 5–8 of the Build Session)

```
Commit → [5. Brand] → [6. Website] → [7. Content] → [8. Launch] → Live business
```

Each step is **one screen, one output, one approve button.** No chat. No config forms. The user either approves or asks for a regeneration (one tap).

## Step 5 — Brand

The system generates and presents:
- **Business name** — the Cloud Browser searches domain + trademark availability in real time and finds an available name + URL.
- **Logo** — 3 options, AI-generated.
- **Color palette** — derived from the simulation's brand decisions + the user's onboarding aesthetic.
- **Voice / tone** — one paragraph describing how the brand speaks.
- **Tagline.**

**Approve** → locks the brand → seeds the website. **Regenerate** → new options.

## Step 6 — Website

AutoBuilder builds the full marketing site (or web app / storefront / platform, per the product type chosen at simulation):
- Custom design system, SEO/AEO optimization, lead capture.
- Real market data populated from the Cloud Browser's research (real competitor pricing, real testimonials style, real SEO keywords).
- A live preview the user can click through.

**Approve** → the build is frozen for launch. **Regenerate** → rebuild with notes.

## Step 7 — Content

The Marketer agent generates:
- **Social posts** — a 30-day schedule, platform-specific (X, TikTok, LinkedIn, IG).
- **Videos** — short-form video scripts + AI-generated video assets.
- **Viral hooks** — the angles most likely to spread for this audience.
- **Outbound/lead-gen** — DM templates, cold email sequences, form-fill targets.

**Approve** → schedules the content + queues the social-engagement jobs. **Regenerate** → new angles.

## Step 8 — Launch

One button. Behind it, autonomously:
- Provisions a **GitHub repo** + **Google Drive** folder.
- Provisions **Vercel** project (`provisionVercel`).
- Provisions **Supabase** backend (`provisionSupabase`).
- Deploys the site → live URL.
- Connects the **payment provider** to the user's bank account.
- Arms the **Marketer agent** to begin posting/DMing on schedule.
- Logs the launch → the revenue-feedback loop starts watching.

The user sees: a live URL + a "Your business is live" confirmation.

## What the User Never Sees

- The Council deliberating build-readiness (`pipelineOrchestrator`).
- The Cloud Browser cloning reference sites for the build.
- The Fortress Engineer auditing the build for security/RLS.
- The Validator agent gating launch on unit-economics.
- The Shadow agent running opsec on the new domain.

All of that runs between the approve buttons. The user only approves.

## The "One Hour" Promise

From picking an idea in the Morning Feed to a live, marketed business: **one hour**, most of which is the system generating while the user sips coffee and taps "Approve" four times. This is the product's core promise and the thing that makes it viral.

## Backend

- `councilBlueprint` (exists) → the brand/business spec.
- `provisionVercel` (exists), `provisionSupabase` (exists) → launch.
- `launchPipelineBuild` (exists) → the launch step.
- New: `generateBrand`, `generateWebsite`, `generateContent` — the per-step generators (LLM + Cloud Browser for real data + domain availability).
- New: `findAvailableDomain` — Cloud Browser job that checks name + URL availability.
