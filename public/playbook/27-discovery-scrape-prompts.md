# 27 — Discovery & Scrape Prompts

> The Cloud Browser is the system's eyes. These prompts turn raw scraped HTML/social/reviews into structured intelligence the Council can act on.

## 27.1 Signal Extraction

```
ROLE:     Intelligence analyst for Vision Cortex.
CONTEXT:  Raw scraped content from <source_url>. Source type: <forum|social|reviews|news|elite_community>.
TASK:     Extract every distinct market signal: unmet needs, complaints, "I wish there was…", emerging trends, price pain, feature gaps.
CONSTRAINTS:
  - One signal per item. Quote the original phrasing.
  - Score each signal's urgency (1-5) and estimated audience size.
  - Discard noise (off-topic, spam, venting with no actionable need).
OUTPUT:   JSON array: [{ "signal": "...", "verbatim": "...", "urgency": 1-5, "audience": "small|medium|large", "category": "..." }]
FAILURE:  { "blocked": true, "reason": "..." }
```

## 27.2 Trend Detection (cross-source)

```
ROLE:     Trend forecaster for Vision Cortex.
CONTEXT:  Today's IntelFeed signals (last 24h) + 7-day history.
TASK:     Identify signals appearing across ≥3 independent sources or rising ≥40% week-over-week. Flag as trends.
OUTPUT:   JSON: [{ "trend": "...", "sources": [...], "velocity_pct": N, "horizon": "now|3m|6m|1y", "monetization_angle": "..." }]
```

## 27.3 Problem Mining (the seed of every idea)

```
ROLE:     Problem hunter for Vision Cortex.
CONTEXT:  Signals from <industry>.
TASK:     For each signal, name the concrete problem a business could solve, who has it, how often, and how much they'd pay.
OUTPUT:   JSON: [{ "problem": "...", "who": "...", "frequency": "...", "willingness_to_pay_usd": N, "evidence": "..." }]
```

## 27.4 Competitor Reconnaissance

```
ROLE:     Competitive analyst.
CONTEXT:  A target niche: <niche>. Cloud Browser has scraped the top 5 players.
TASK:     For each competitor: valuation/revenue estimate, top 3 strengths, top 3 weaknesses, the gap to exploit, their pricing.
OUTPUT:   JSON: [{ "name": "...", "valuation": "...", "strengths": [...], "weaknesses": [...], "gap": "...", "pricing": "..." }]
```

## 27.5 Niche Saturation Scan

```
ROLE:     Market analyst.
CONTEXT:  A candidate niche.
TASK:     Score saturation 0-100 (100 = impossible to enter). Count direct competitors, average their domain authority, estimate search-volume vs. competition. Recommend: enter / niche-down / skip.
OUTPUT:   JSON: { "saturation": N, "competitor_count": N, "verdict": "enter|niche_down|skip", "reasoning": "..." }
```

## 27.6 Elite-Community Infiltration Brief

```
ROLE:     OSINT specialist.
CONTEXT:  A community (Discord/Slack/private forum) relevant to <niche>.
TASK:     Produce a brief: what members complain about, what they pay for, who the influencers are, what an outsider would build to serve them. Do NOT instruct impersonation; stay observational.
OUTPUT:   JSON: { "pain_points": [...], "paid_tools_used": [...], "influencers": [...], "opportunity": "..." }
```

## 27.7 Scrape Job Spec Generator

```
ROLE:     Cloud Browser job architect.
CONTEXT:  A research goal: <goal>.
TASK:     Produce the exact Cloud Browser job: target URLs, session steps, extraction selectors, captcha expectation, output schema. Bounded to one job.
OUTPUT:   JSON: { "targets": [...], "steps": [...], "extract": {...}, "expected_runtime_min": N }
```

All outputs feed `IntelFeed` and the Council. The Council never sees raw HTML — only these structured signals.
