# 40 — System DNA v1.0 Installation & Architecture Guide

**Document type:** Mandatory architectural document (spec §48)
**DNA Version:** SYSTEM-DNA-1.0
**Date:** 2026-09-01

---

## 1. Purpose

System DNA is the universal internal control plane for every digital system created or managed through this environment. It is the single source of truth for architecture, quality, traceability, validation, knowledge, and autonomous evolution.

This document is the installation guide and architecture reference. It is mandatory reading for every agent and builder before touching any system.

---

## 2. Architecture Decision (DEC-DNA-001)

**Hybrid architecture — locked:**

| Layer | Host | Why |
|---|---|---|
| Control plane UI | Base44 | React + auth + realtime. Not a credit burner. |
| System DNA data | Supabase (portable) | Free tier, RLS, realtime. Universal — not locked to Base44. |
| Autonomous loop compute | Vercel cron + serverless | Direct LLM API keys = raw per-token pricing. Hard budget caps. |
| Evidence storage | Google Drive | 15GB free, versioned. |
| Cloud browser engine | Railway | Already deployed. |
| Schema / rules / decisions | Git | Free version control. Template + versioning. |

**Phase 1 is implemented on Base44 entities now** (the working control plane). The Supabase/Vercel port is the migration path — the entity schemas map 1:1 to Supabase tables.

---

## 3. Canonical Entities (Phase 1 — installed)

| Entity | ID prefix | Purpose |
|---|---|---|
| SystemDNA_System | SYS- | The system being tracked (Vision Cortex, Cloud Browser, Auto Builder) |
| SystemDNA_Capability | CAP- | Capabilities with independent dimensions + multi-score |
| SystemDNA_Requirement | REQ- | Requirements with measurable acceptance criteria (SHALL format) |
| SystemDNA_Gap | GAP- | Gaps with severity, root cause, action link |
| SystemDNA_Action | ACT- | Autonomous actions with Kanban columns |
| SystemDNA_SystemRule | RULE- | The 20 immutable constitution rules |

**Phase 2 entities (next):** SystemDNA_Evidence (EVD-), SystemDNA_Decision (DEC-), SystemDNA_Knowledge (KNO-), SystemDNA_Change (CHG-), SystemDNA_Test (TST-), SystemDNA_Validation (VAL-), SystemDNA_Source (SRC-), SystemDNA_QualityGate (GAT-), SystemDNA_Risk (RSK-), SystemDNA_Metric (MET-).

---

## 4. ID Format

All IDs are permanent and never reused:
`SYS-000001`, `CAP-000001`, `REQ-000001`, `GAP-000001`, `ACT-000001`, `RULE-000001`

Format: `<PREFIX>-<6-digit zero-padded sequence>`

---

## 5. The Five Independent Dimensions (spec §13)

Every capability is measured on five independent dimensions. **No dimension is inferred from another:**

1. **Implemented** — has it been built?
2. **Validated** — has it passed validation? (NOT implied by implemented)
3. **Hardened** — has it been security-hardened? (NOT implied by validated)
4. **Production Ready** — is it launch-ready? (NOT implied by hardened)
5. **Monitored** — is it being observed? (NOT implied by production-ready)

---

## 6. Maturity States (spec §14)

`unknown → defined → planned → building → implemented → testing → validated → hardened → production → monitored → improvement`

Failure states: `blocked`, `failed`, `regression`, `deprecated`

**No AI may skip states without evidence.**

---

## 7. Multi-Score Model (spec §27)

Never use one simplistic score. Calculate:

| Score | Range | Meaning |
|---|---|---|
| Capability | 0-5 | 0 absent → 5 hardened/production-verified |
| Evidence | 0-5 | 0 none → 5 strong independent/reproducible |
| Reliability | 0-5 | |
| Security | 0-5 | |
| Performance | 0-5 | |
| Operational Readiness | 0-5 | |
| Benchmark Position | 0-100 | vs benchmark set |

**Critical rule:** A system with 95 overall but an unresolved critical security failure is NOT production-ready. The aggregate never hides a critical failure.

---

## 8. The 20 System Rules (Constitution)

1. No claim without evidence.
2. Unknown is never interpreted as yes.
3. Implemented is not validated.
4. Validated is not hardened.
5. Hardened is not automatically production-ready.
6. No critical requirement without acceptance criteria.
7. No production release with unresolved blocking failures.
8. Every failed test creates or updates a gap.
9. Every gap requires a disposition.
10. Every important decision requires rationale.
11. Every major change requires traceability.
12. Benchmark changes require evidence and versioning.
13. The system may not lower its own standard merely to increase its score.
14. Conflicts must be surfaced.
15. Ambiguity must be surfaced.
16. Missing evidence must be surfaced.
17. Regression automatically reduces affected capability status.
18. Security failures may block deployment.
19. Validation results must be reproducible where practical.
20. System DNA itself must be version controlled.

---

## 9. The Autonomous Loop (spec §29)

```
RESEARCH → INGEST → ANALYZE → BENCHMARK → DEFINE REQUIREMENTS →
ARCHITECT → PRIORITIZE → BUILD → TEST → VALIDATE → HARDEN →
DEPLOY → MONITOR → COMPARE → IDENTIFY GAP → CREATE ACTION → BUILD AGAIN
```

**Credit budget:** Hard cap per cycle (default: 50K tokens). Enforced in the Vercel cron layer. The loop stops when the budget is hit, not when credits run out.

---

## 10. The Three-System Loop (spec §36)

```
Vision Cortex (reason/decide) → System DNA → Auto Builder (build/repair) →
Cloud Browser (observe/test) → Evidence → System DNA → Vision Cortex
```

- **Vision Cortex** reads System DNA to know what to reason about; writes decisions, knowledge, requirements.
- **Auto Builder** reads requirements + actions from System DNA; writes implementations, tests, evidence.
- **Cloud Browser** reads benchmark sources; writes evidence, sources, metrics.

Every agent and page in Vision Cortex must reference System DNA IDs. A decision without a traceable DEC → EVD → REQ → CAP → ACT → TST → RESULT chain is non-compliant.

---

## 11. Zero-Assumption Rule (spec §20)

UNKNOWN is legitimate. It is not YES, NO, PASSED, or VALIDATED.

The AI must never fill unknown information with a guess to complete a workflow. If required information is unknown: create a RESEARCH task, create an AMBIGUITY task, or block the affected action.

---

## 12. Zero-Ambiguity Rule (spec §21)

Requirements containing "fast", "secure", "scalable", "best", "modern", "advanced", "high quality", "enterprise grade", "AI powered", "robust", "reliable" must be converted to measurable criteria or marked unresolved.

---

## 13. No Fake Completion (spec §44)

Never display COMPLETE, PASSED, VALIDATED, HARDENED, PRODUCTION READY, or BEST IN CLASS unless criteria are actually satisfied. Otherwise display: PARTIAL, UNTESTED, UNKNOWN, BLOCKED, FAILED, NEEDS EVIDENCE, NEEDS REVIEW.

---

## 14. Quality Gates (spec §28)

14 gates must pass before PRODUCTION VERIFIED:
1. Requirements complete
2. Architecture complete
3. Traceability complete
4. Implementation complete
5. Automated tests passing
6. Integration tests passing
7. Security tests passing
8. Performance thresholds passing
9. Regression suite passing
10. Validation passing
11. Hardening passing
12. Production health passing
13. Evidence complete
14. No unresolved blocking gaps

---

## 15. Migration Path (Base44 → Supabase)

Phase 1 entities are on Base44 now (working). To port to Supabase:

1. Create matching Postgres tables with the same field names + types
2. Add `dna_id` as unique-indexed
3. Enable RLS (admin write, authenticated read)
4. Point the Base44 UI pages at the Supabase REST API
5. Move autonomous loop functions to Vercel with direct LLM keys
6. Store evidence files on Drive, reference by URL in SystemDNA_Evidence

The entity schemas in `base44/entities/SystemDNA_*.jsonc` are the canonical definitions — Supabase tables mirror them exactly.

---

## 16. Installation Checklist (spec §46)

- [x] Core entities implemented (6 of 15 — Phase 1)
- [x] DNA Command Center page
- [x] System Constitution (20 rules seeded)
- [x] Kanban action queue (drag-and-drop)
- [x] Architecture decision logged (DEC-DNA-001)
- [x] This installation document
- [ ] Remaining 9 entities (Phase 2)
- [ ] Benchmark engine (Phase 2)
- [ ] Evidence ledger (Phase 2)
- [ ] Test & validation lab (Phase 2)
- [ ] Quality gates enforcement (Phase 2)
- [ ] Autonomous loop on Vercel (Phase 3)
- [ ] Three-system wiring (Phase 3)
- [ ] Self-test (Phase 4)
- [ ] Supabase port (Phase 4)

---

## 17. Final Principle

EVERYTHING HAS AN ID. EVERY REQUIREMENT HAS ACCEPTANCE CRITERIA. EVERY IMPLEMENTATION TRACES TO A REQUIREMENT. EVERY CLAIM HAS EVIDENCE. EVERY FAILURE CREATES A GAP. EVERY GAP CREATES AN ACTION. EVERY CHANGE IS TRACEABLE. EVERY UNKNOWN REMAINS UNKNOWN UNTIL RESOLVED. EVERY SYSTEM CONTINUOUSLY EVOLVES.

THIS IS SYSTEM DNA.
