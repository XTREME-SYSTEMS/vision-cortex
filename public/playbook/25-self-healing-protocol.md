# 25 — The Self-Healing Protocol

> The recursion that makes Vision Cortex build, validate, audit, fix, heal, optimize, and enhance itself 24/7. Adapted from the Cloud Browser's Fortress Engineer pattern.

## The Ledger — `SystemEnhancement`

Every piece of work the system could do on itself is a record:

| Field | Purpose |
|---|---|
| `title`, `description` | What to build/fix/enhance. |
| `category` | `feature` · `hardening` · `optimization` · `healing` · `doctrine` · `integration`. |
| `status` | `pending` → `in_progress` → `implemented` → `auditing` → `audited` → `optimized` (or `failed` / `blocked`). |
| `priority` | 1 (highest) – 5. |
| `source` | `autonomous` (cycle-generated) · `manual` (owner-added). |
| `implementation_plan` | The LLM-generated plan. |
| `implementation_notes` | What was done / fix history. |
| `audit_result` | `{ passed, score, failures[] }`. |
| `fix_attempts`, `max_fix_attempts` | Auto-fix retry budget (default 3). |
| `blocked_reason` | Why it can't proceed. |
| `last_action_at` | Timestamp of last cycle touch. |
| `build_order_step` | Reference to chapter 24. |

## The Cycle — `runEnhancementCycle` (every 4h)

```
for each pending/in_progress SystemEnhancement (top N by priority):
  1. PLAN ──── if pending: InvokeLLM generates an implementation_plan
  2. IMPLEMENT ─ if in_progress: execute the control-plane action
                 (create entities/functions/workflows per the plan;
                  bounded to safe operations; logged)
  3. AUDIT ──── InvokeLLM audits the work against:
                  - this architecture playbook (the spec)
                  - the Doctrine (learned wisdom)
                  - the Governance (ethics/opsec)
  4. if audit passed → mark audited → Notification to owner → next
  5. if audit failed → AUTO-FIX:
        fix_attempts += 1
        if < max → regenerate plan → back to IMPLEMENT
        if = max → mark failed → Notification (owner attention)
  6. if blocked → mark blocked → Notification
return summary { processed, implemented, audited, fixed, blocked, failed }
```

## What "Implement" Can Safely Do

The cycle runs on Base44's control plane. It can:
- Create / update `Doctrine`, `AgentLog`, `Notification`, `IntelFeed`, `Idea`, `BuildQueue` records.
- Invoke other backend functions (`agentDebate`, `councilCompound`, `pipelineOrchestrator`).
- Generate plans, audits, and doctrine via `InvokeLLM`.

It **cannot** write code files (functions/pages/components) directly — that is the builder's role (human or AI agent). So the cycle's `implemented` state means **"plan generated, audited, and ready for the builder to execute."** The builder reads the `audited` backlog and ships the code; the cycle then re-audits the shipped work and moves it to `optimized`.

This honest split keeps the loop safe and bounded while still running 24/7.

## Seeding the Ledger

On first run, if the ledger is empty, `runEnhancementCycle` auto-seeds the **Build Order (chapter 24)** — each unchecked tier item becomes a `pending` record with `build_order_step` set. The system starts itself.

## The Audit Criteria

An audit passes when the plan/work satisfies:
1. **Spec alignment** — matches the relevant playbook chapter.
2. **Doctrine consistency** — doesn't contradict learned wisdom.
3. **Governance compliance** — respects ethics + opsec rules.
4. **Bounded cost** — the action's LLM/entity cost is within limits.
5. **No regression** — doesn't break existing flows.

Failures produce a `failures[]` list the auto-fix uses as corrective context.

## The Owner's Window

- The Dashboard shows the ledger: pending / in-progress / audited / failed counts.
- `Notification` alerts on `failed` and `blocked` (needs human attention).
- A per-workflow kill-switch lets the owner pause any cycle.
- Every cycle run is logged to `AgentLog` for forensics.

## The Recursion

```
build order (ch.24) → seeds ledger → cycle plans/audits → builder ships → cycle re-audits → optimized
                                                                            │
                                                                            └─→ doctrine refined (ch.21 compound)
                                                                                  │
                                                                                  └─→ next cycle smarter
```

This is the loop that makes the platform **self-validating, self-provisioning, self-healing, self-optimizing, and self-enhancing** — 24/7, recursively, forever.
