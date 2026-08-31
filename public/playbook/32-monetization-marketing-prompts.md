# 32 — Monetization & Marketing Prompts

> The money engine. After launch, the Marketer agent runs 24/7 — posting, engaging, converting — and revenue flows back to teach the Council.

## 32.1 Viral Hook Engineering

```
ROLE:     Viral strategist.
CONTEXT:  A brand + audience + platform.
TASK:     Produce 10 viral hook angles, each with the psychological trigger (status, identity, curiosity, utility, outrage, belonging), the hook line, and the predicted share-rate.
OUTPUT:   JSON: [{ "angle": "...", "trigger": "...", "hook": "...", "predicted_share_rate": 0-100 }]
```

## 32.2 Social Post Generation (per platform)

```
ROLE:     Platform-native copywriter.
CONTEXT:  Brand voice + a hook + platform (X|TikTok|LinkedIn|IG|YouTube).
TASK:     Produce 5 posts native to the platform: hook, body, CTA, hashtags/sounds, best post time.
CONSTRAINTS:
  - Match the platform's native length and format.
  - No generic cross-posted copy.
OUTPUT:   JSON: [{ "platform": "...", "hook": "...", "body": "...", "cta": "...", "tags": [...], "best_time": "..." }]
```

## 32.3 Outbound / DM / Cold Email

```
ROLE:     Outbound specialist.
CONTEXT:  A target persona + the offer.
TASK:     Produce a 3-touch sequence (cold email or DM): hook → value → soft CTA. Personalization tokens. Compliance (CAN-SPAM, no deception).
OUTPUT:   JSON: { "touches": [{ "subject": "...", "body": "...", "tokens": [...] }], "compliance_notes": "..." }
```

## 32.4 Lead-Gen Form Fill (Cloud Browser job)

```
ROLE:     Lead-gen automator.
CONTEXT:  A target lead-list site.
TASK:     Produce the Cloud Browser job: navigate, fill the form with the offer, submit, log the lead. Bounded to opt-in forms only.
CONSTRAINTS:
  - Never submit to non-consenting recipients. No spam.
OUTPUT:   JSON: { "job": {...}, "leads_per_run": N, "compliance": "opt_in_only" }
```

## 32.5 Engagement / Community Participation

```
ROLE:     Community engager.
CONTEXT:  A relevant thread/post.
TASK:     Produce a genuinely useful reply that naturally surfaces the product. No shilling. Add value first.
OUTPUT:   JSON: { "reply": "...", "value_add": "...", "product_mention": "natural|none" }
```

## 32.6 Pricing Strategy

```
ROLE:     Pricing strategist.
CONTEXT:  A product + competitor pricing + willingness-to-pay data.
TASK:     Recommend a pricing model (one-time/subscription/freemium/usage) + 3 tiers + the anchor + the annual discount. Justify against unit economics.
OUTPUT:   JSON: { "model": "...", "tiers": [{ "name": "...", "price_usd": N, "features": [...] }], "anchor": "...", "annual_discount_pct": N, "rationale": "..." }
```

## 32.7 Revenue Optimization (ongoing)

```
ROLE:     Revenue ops.
CONTEXT:  Last 30 days: traffic, conversion, churn, revenue.
TASK:     Identify the highest-leverage lever (price, funnel step, retention, upsell). Produce one experiment with hypothesis + expected lift.
OUTPUT:   JSON: { "lever": "...", "experiment": "...", "hypothesis": "...", "expected_lift_pct": N }
```

## 32.8 Revenue Feedback → Council (the learning loop)

```
ROLE:     Council reviewer.
CONTEXT:  A revenue event: which idea/build earned how much, and why.
TASK:     Extract the doctrine: what worked, generalize it, weight it. Feed tomorrow's Morning Feed scoring.
OUTPUT:   JSON: { "doctrine": "...", "category": "...", "weight": 1-5, "applies_to_feed_scoring": true }
```

## 32.9 Affiliate / Sponsorship / Partnership Acquisition

```
ROLE:     Partnerships lead.
CONTEXT:  A growing audience.
TASK:     Produce the outreach list (10 targets) + pitch templates + the sponsorship rate card.
OUTPUT:   JSON: { "targets": [...], "pitch": "...", "rate_card": {...} }
```

## 32.10 Churn Recovery

```
ROLE:     Retention specialist.
CONTEXT:  A churned-user cohort + exit signals.
TASK:     Produce a win-back sequence + the root-cause hypothesis + a product fix.
OUTPUT:   JSON: { "winback_sequence": [...], "root_cause": "...", "product_fix": "..." }
```

Monetization is not a step — it's a continuous loop. Every revenue signal feeds the Council; every Council insight sharpens the next campaign.
