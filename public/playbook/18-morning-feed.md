# 18 — The Morning Feed (The Daily Hook)

> The addicting reason to open Vision Cortex instead of Facebook. Overnight the system found 10 money-making ideas that fit *you*. You spend 90 seconds picking one — or skip and wait for tomorrow.

## What It Is

The new home page (`/`). Replaces the current Dashboard as the primary surface. A vertical stack of **10 idea cards**, ranked, scored to your onboarding profile, each one a complete money-making opportunity the system believes you could build and launch.

## The Overnight Pipeline (autonomous, no human)

```
3am   Cloud Browser scrapes the world
        → forums (Reddit, Indie Hackers, Hacker News)
        → social (X, TikTok, LinkedIn)
        → problem spaces (G2 reviews, App Store reviews, "I wish there was…" posts)
        → elite communities, trend aggregators
4am   ingestIntel → IntelFeed records (signals, correlations, impact scores)
5am   Council deliberates the top signals (agentDebate) → filters to your profile
6am   nightlyPipelinePrep → 10 ideas, each scored + ranked
6:30  ownerDigest → the morning brief prepared
7am   YOU wake up → the Feed is ready
```

## The Idea Card

Each card shows, at a glance:

- **Title + one-liner** — the idea in one breath.
- **The problem** — who has it, how bad, how often.
- **Scores** (0–100, derived from your profile + goal):
  - **Viral potential** — likelihood of organic spread.
  - **Build difficulty** — can AutoBuilder ship it autonomously?
  - **Value** — est. annual revenue if launched.
  - **Fit** — how well it matches your onboarding profile + goal.
  - **Rich-likelihood** — probability this hits your locked goal.
- **Why this fits you** — one line, written to your profile.
- **Two actions:** `Simulate` (enter Simulation Studio) · `Skip` (dismiss; it won't resurface for 7 days).

## The Scoring (profile-driven)

Every score is a function of the idea × your profile + goal. A user whose locked goal is "millionaire in 1yr, autonomous" will see the same raw ideas scored very differently than a user whose goal is "passive $5k/mo, hands-off." The Cloud Browser's real market data (comps, search volume, competitor spend) feeds the Value and Viral scores so they're grounded, not guessed.

## The Interaction

- **Pick one** → enters the Build Session at the Vision step (the idea's title becomes the seed sentence).
- **Skip all** → "See you tomorrow." The Feed regenerates nightly.
- **No chat.** No comments. No feed-scrolling. Just 10 cards and a decision.

## The Hook Psychology

- **Scarcity** — only 10, only once a day.
- **Personalization** — scored to you, not the crowd.
- **Agency** — one tap to simulate your future.
- **Anticipation** — tomorrow's batch is already cooking.

This is the loop that makes the user open the app every morning instead of social media.

## Backend

- `nightlyPipelinePrep` (exists) — generates the 10 ideas.
- `cloudBrowserIntel` (exists) — feeds real market data into scoring.
- New: `scoreIdeaToProfile` — a lightweight function that scores a single idea against a user profile (used by the Feed and re-ranking).
- Workflow: `Morning Vision Sweep` (exists) + `Nightly Pipeline Prep` (exists) already drive the overnight batch.
