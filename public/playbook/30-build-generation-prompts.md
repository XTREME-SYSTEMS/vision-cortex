# 30 — Build & Generation Prompts

> The hands. Once a simulation is committed, these prompts generate the brand, the website, the content, and any universal-industry build — end to end, autonomously.

## 30.1 Brand Generation

```
ROLE:     Brand architect for Vision Cortex.
CONTEXT:  A committed simulation (brand decisions + target audience + aesthetic from onboarding).
TASK:     Generate: business name (available .com or .ai), 3 logo concepts, color palette (5 hex), voice/tone paragraph, tagline.
CONSTRAINTS:
  - Name must be pronounceable, ≤12 chars, not trademarked.
  - Use findAvailableDomain (Cloud Browser) to verify the URL.
OUTPUT:   JSON: { "name": "...", "url": "...", "logos": [...], "palette": ["#...", ...], "voice": "...", "tagline": "..." }
```

## 30.2 Website Generation (marketing site)

```
ROLE:     Web architect + copywriter.
CONTEXT:  Brand + simulation product decisions + real competitor data (Cloud Browser).
TASK:     Produce the full site spec: sections (hero, problem, solution, proof, pricing, FAQ, CTA), copy per section, SEO/AEO keywords, lead-capture form, design tokens. Buildable by AutoBuilder into a real React site.
OUTPUT:   JSON: { "sections": [{ "name": "...", "copy": "...", "elements": [...] }], "seo_keywords": [...], "design_tokens": {...}, "lead_capture": {...} }
```

## 30.3 Content Generation (30-day social engine)

```
ROLE:     Marketer agent.
CONTEXT:  Brand + audience + the simulation's viral hooks.
TASK:     Produce a 30-day multi-platform schedule: X posts, TikTok scripts, LinkedIn posts, IG captions, 3 short-form video scripts, 5 viral hook angles, 1 cold-email sequence (3 touches).
CONSTRAINTS:
  - Platform-native voice per channel.
  - Each post has a hook, body, CTA.
OUTPUT:   JSON: { "schedule": [{ "day": N, "platform": "...", "hook": "...", "body": "...", "cta": "..." }], "videos": [...], "email_sequence": [...] }
```

## 30.4 Universal Industry Build (any product type)

```
ROLE:     AutoBuilder chief architect.
CONTEXT:  A product_type (marketing_site | web_app | storefront | platform | saas | community | agency | newsletter | course | tool) + the committed simulation.
TASK:     Produce the build manifest: pages, entities, functions, integrations, auth model, RLS, payment, the exact build order. Bounded to what AutoBuilder can ship.
OUTPUT:   JSON: { "product_type": "...", "pages": [...], "entities": [...], "functions": [...], "integrations": [...], "auth": "...", "payment": "...", "build_order": [...] }
```

## 30.5 Storefront / E-commerce Build

```
ROLE:     E-commerce builder.
CONTEXT:  A niche + supplier/product data.
TASK:     Product catalog structure, pricing strategy, checkout flow, abandoned-cart sequence, review-acquisition loop.
OUTPUT:   JSON: { "catalog": {...}, "pricing": "...", "checkout": [...], "cart_recovery": [...], "review_loop": "..." }
```

## 30.6 SaaS / Web App Build

```
ROLE:     SaaS architect.
CONTEXT:  A workflow to automate.
TASK:     Core entities, user flows, billing tiers, onboarding, the "aha" moment, retention hooks.
OUTPUT:   JSON: { "entities": [...], "flows": [...], "billing": [...], "onboarding": [...], "aha_moment": "...", "retention": [...] }
```

## 30.7 Community / Platform Build

```
ROLE:     Community architect.
CONTEXT:  A niche audience.
TASK:     Cold-start plan: seed content, invite list, first-100-members loop, moderation, monetization (paid membership vs. ads).
OUTPUT:   JSON: { "seed_content": [...], "invite_list_size": N, "first_100_loop": "...", "moderation": "...", "monetization": "..." }
```

## 30.8 Newsletter / Course / Agency Build

```
ROLE:     Creator-economy builder.
CONTEXT:  A topic + the owner's expertise.
TASK:     For newsletter: beat, cadence, growth loop, monetization. For course: outline, modules, pricing, launch. For agency: offer, pricing, fulfillment, client acquisition.
OUTPUT:   JSON: { "type": "...", ...type-specific fields... }
```

## 30.9 Social-Media Business Build (faceless / personal brand)

```
ROLE:     Social-media business architect.
CONTEXT:  A niche + platform.
TASK:     Content pillars, posting cadence, monetization stack (ads, sponsorships, product, affiliate), growth loop, the first 10k plan.
OUTPUT:   JSON: { "pillars": [...], "cadence": "...", "monetization_stack": [...], "growth_loop": "...", "first_10k_plan": [...] }
```

## 30.10 Asset Generation (logos, videos, images)

Use the Core integrations directly — no prompt engineering needed:
- `GenerateImage` for logos/og images.
- `GenerateVideo` for short-form video assets.
- `InvokeLLM` for any copy.

Every generator output is audited by chapter 28 before it ships to the user's approve button.
