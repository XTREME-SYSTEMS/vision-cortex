# 39 — System DNA v1.0 Architecture Decision Record

**DEC-ID:** DEC-DNA-001
**Date:** 2026-09-01
**Status:** APPROVED — locked before implementation
**Confidence:** HIGH
**Reversal conditions:** Only if Base44 removes Vercel/Supabase integration support, or direct LLM API pricing exceeds Base44 integration pricing (currently the inverse is true).

---

## The Decision

System DNA v1.0 will be built on a **hybrid architecture**, not purely on Base44:

| Layer | Host | Reason |
|---|---|---|
| **Control plane UI** (DNA Command Center, Benchmark Lab, Gap Engine pages) | Base44 | Native React + auth + realtime. UI is not a credit burner. |
| **System DNA data** (requirements, capabilities, gaps, evidence, decisions, knowledge, changes) | Supabase | Portable, free tier, RLS, realtime. Makes the template universal — not locked to Base44. |
| **Autonomous loop compute** (research, reasoning, benchmarking, build decisions) | Vercel cron + serverless functions | Direct LLM API keys = raw per-token pricing. Hard budget caps per cycle. No Base44 integration markup. |
| **Evidence storage** (screenshots, session replays, documents) | Google Drive | 15GB free, versioned, shareable. |
| **Cloud browser engine** | Railway | Already deployed. Stays. |
| **Schema / rules / decisions** | Git | Free version control — the spec's §40/§41 template + versioning goal. |

---

## Why This Decision

### The credit-burn problem
The Base44 `InvokeLLM` integration charges credits per LLM call. The System DNA spec (§29) demands a continuous autonomous loop: research → ingest → analyze → benchmark → define requirements → architect → prioritize → build → test → validate → harden → deploy → monitor → compare → identify gap → create action → build again. Running that loop 24/7 through Base44's integration layer drains the credit balance fast — every cycle pays Base44's markup on every LLM call.

### The fix
Move the heavy autonomous compute to Vercel serverless functions that call OpenAI / Anthropic / Google **directly with owned API keys**. Raw per-token pricing, model choice, and hard budget caps per cycle. Base44 hosts the human control plane UI (not a credit burner); Supabase holds the portable truth; Drive holds evidence; Railway runs the browser; Git versions the rules.

### Portability bonus
This architecture makes System DNA universal (the spec's §0 goal) — the template works for any system, not just Base44 apps. A system built on Vercel + Supabase can install System DNA without adopting Base44.

---

## The Honest Tradeoff

This is a **bigger build and more operational complexity**: two stacks (Base44 + Vercel + Supabase + Railway), more secrets, more deployments. For a solo builder that's real overhead. But at scale it's significantly cheaper and it makes System DNA portable — which is exactly what the spec's "universal template" demands.

The one nuance: Base44's `InvokeLLM` handles retries, model selection, and response parsing. Direct LLM calls mean we handle that ourselves. Not hard, but it's code we write and maintain.

---

## Phased Build Plan

Built to the spec's own standard (§44 — no fake completion). Each phase is complete and evidence-backed before the next begins.

### Phase 1 — The Spine (minimum viable control plane)
- 15 canonical entities on **Supabase** with the ID format (SYS-, DOM-, CAP-, REQ-, GAP-, ACT-, EVD-, DEC-, CHG-, KNO-, TST-, VAL-, SRC-, RULE-, GAT-)
- **DNA Command Center** page on Base44 (reads from Supabase) — the one-screen "where are we / what's wrong / what's next" overview
- Three engine functions on **Vercel** (direct LLM keys): `dnaTraceability` (orphan detection), `dnaGapEngine` (gaps from capabilities/requirements), `dnaScoreSystem` (multi-dimensional scoring that never aggregates to hide a critical failure)
- Migrate the 33 existing CapabilityMatrix records into `SystemDNA_Capability` + `SystemDNA_Requirement` — nothing lost
- Seed the 20 System Rules (§26) as `SystemDNA_SystemRule` records
- Credit budget cap enforced per cycle

### Phase 2 — Benchmark & Validation
- Benchmark Lab page + benchmark engine function (web research with source confidence, §10)
- Test/Validation Lab (§17 — verification vs validation separated)
- Evidence Ledger (§19)
- Quality Gates (§28 — 14 gates)
- Full scoring model (§27 — capability, evidence, reliability, security, performance, operational readiness, benchmark position)

### Phase 3 — The Loop
- Autonomous loop workflow on **Vercel cron** (with hard credit/token budget per cycle)
- Health/Observability (§24)
- Regression detection
- Three-system wiring: Vision Cortex / Cloud Browser / Auto Builder read & write System DNA (§33-36)

### Phase 4 — Template & Self-Test
- Installation playbook (replaces the "private workspace template" assertion — verify the feature first; playbook is the solid fallback)
- Self-test function (§42)
- Versioning (§41)
- Remaining pages: North Star, System Map, Requirements, Traceability, Decisions, Knowledge, Changes, Constitution

---

## Migration Note

The Capability Matrix page + `CapabilityMatrix` entity built earlier this session is **superseded** by this decision. In Phase 1 its 33 records migrate into the richer `SystemDNA_Capability` schema (adds validated/monitored/maturity_state/multi-score per §13, §14, §27) and the old entity is retired. The Capabilities page becomes the DNA Command Center. Nothing lost, everything upgraded.
