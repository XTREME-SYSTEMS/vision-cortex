# 26 — Prompt Library (Master Index)

> The operating manual for the entire Destiny Engine. Every prompt the system needs to run autonomously — discovery, validation, simulation, building, launching, monetizing, healing, governing — lives here. The agent and the backend functions consult this library instead of chatting with the owner.

## How to Use This Library

1. **The agent (me):** when asked to build/fix/launch/enhance anything, find the matching chapter below, use the prompt template, execute, then validate with the audit prompt from chapter 28.
2. **The backend functions:** import the operational templates from `base44/shared/promptLibrary.ts` and pass them to `InvokeLLM`. The markdown here is the human-readable spec; the shared module is the executable copy.
3. **The autonomous loop:** `runEnhancementCycle` reads the Build Order (ch.24), plans with the plan prompt, audits with the audit prompt, fixes with the fix prompt — all from the shared module.

## The Universal Prompt Framework

Every prompt in this library follows the same skeleton — copy it, fill the slots, run:

```
ROLE:     You are <agent role> for Vision Cortex, an autonomous business-building engine.
CONTEXT:  <relevant playbook chapter + entity data + prior decisions>
TASK:     <one concrete operation>
CONSTRAINTS:
  - American English, zero ambiguity, minimal emotion.
  - Bounded to the task; do not expand scope.
  - Respect Governance (ch. ethics/opsec) and Doctrine (learned wisdom).
  - Never fabricate data; if unknown, say so or use web context.
OUTPUT:   <exact format — plain text, or JSON matching this schema: {...}>
FAILURE:  If you cannot satisfy a constraint, return { "blocked": true, "reason": "..." }.
```

## The Library Chapters

| Ch | Domain | When to use |
|---|---|---|
| 27 | Discovery & Scrape | Cloud Browser jobs, signal/trend/problem mining |
| 28 | Validation & Audit | idea validation, deep/forensic/security audits, unit-economics |
| 29 | Strategy & Simulation | strategy generation, forecast + reverse simulation, recommendation |
| 30 | Build & Generation | brand, website, content, universal industry builds, all product types |
| 31 | Provisioning & Launch | Vercel/Supabase/GitHub/Drive/payment/domain, all account types |
| 32 | Monetization & Marketing | social engagement, viral hooks, outbound, pricing, revenue ops |
| 33 | Self-Healing & Hardening | enhancement cycle, auto-fix, healing, hardening, optimization |
| 34 | Governance & Doctrine | council deliberation, doctrine extraction, ethics, opsec |
| 35 | Prompt Engineering (Meta) | how to author a new prompt for any new operation |

## The Self-Governance Rule

No prompt in this library may instruct the system to act unethically, illegally, or outside the Governance charter (ch.34). Every prompt embeds the constraints. Every output is auditable. The system governs itself the way a disciplined boardroom does — by principle, not by permission.

## The Zero-Failure Principle

"Zero chance of failure" is achieved not by never failing, but by **always detecting and always fixing.** Every prompt includes a `FAILURE` clause that returns a structured block instead of crashing, and every autonomous step is followed by an audit (ch.28) that catches what the step missed. The loop is: **do → audit → fix → re-audit → ship.** A failure is just another input to the loop.

## Operational Module

The executable prompt templates live in `base44/shared/promptLibrary.ts`. Import what you need:
```ts
import { SIMULATE_FORECAST, BRAND_GENERATE, AUDIT_DEEP, ENHANCEMENT_PLAN, ... } from "../../shared/promptLibrary.ts";
```
Keep the markdown (this chapter set) and the module in sync — the markdown is the spec of record; the module is the runtime.
