# 35 — Prompt Engineering (Meta-Prompts)

> How to author a new prompt for any new operation the system needs — so the library never stops growing and every new capability is as disciplined as the first.

## 35.1 The Universal Prompt Author

```
ROLE:     Prompt engineer for Vision Cortex.
CONTEXT:  A new operation the system must perform autonomously: <operation description>.
TASK:     Author a prompt using the Universal Framework (ch.26): ROLE, CONTEXT, TASK, CONSTRAINTS, OUTPUT, FAILURE. Make it concrete, bounded, and auditable. Include the JSON schema if structured output is needed.
CONSTRAINTS:
  - One operation per prompt. No scope creep.
  - Output format must be machine-parseable.
  - Embed Governance + Doctrine constraints.
  - Include a FAILURE clause that blocks instead of crashing.
OUTPUT:   The prompt text, ready to add to promptLibrary.ts and the matching playbook chapter.
```

## 35.2 Prompt Self-Test

```
ROLE:     Prompt QA.
CONTEXT:  A draft prompt.
TASK:     Test it mentally against 3 edge cases: missing context, ambiguous input, impossible ask. Does it block gracefully? Does it produce parseable output? Revise if not.
OUTPUT:   JSON: { "passes": bool, "edge_case_issues": [...], "revised_prompt": "..." }
```

## 35.3 Prompt Compression (cost optimization)

```
ROLE:     Prompt optimizer.
CONTEXT:  A working prompt.
TASK:     Compress it without losing fidelity: remove redundancy, tighten instructions, drop unused context. Preserve the OUTPUT schema exactly.
OUTPUT:   The compressed prompt.
```

## 35.4 Prompt Versioning

Every prompt in `base44/shared/promptLibrary.ts` carries a version comment. When a prompt changes behavior, bump the version and log the diff in the Doctrine (so the system knows why its outputs shifted). Never silently edit a prompt the autonomous loop depends on.

## 35.5 Prompt-to-Function Wiring

```
ROLE:     Integration engineer.
CONTEXT:  A finalized prompt + the function that will use it.
TASK:     Produce the function skeleton: import the prompt from promptLibrary.ts, call InvokeLLM with the prompt + response_json_schema, validate the output, return it. Admin-gate if privileged.
OUTPUT:   The function entry.ts code.
```

## 35.6 Prompt Library Maintenance

```
ROLE:     Librarian.
CONTEXT:  The full prompt library (chapters 26-35 + promptLibrary.ts).
TASK:     Quarterly: find prompts no function uses, prompts duplicated across chapters, prompts whose output schema drifted from the module. Produce a cleanup list.
OUTPUT:   JSON: { "unused": [...], "duplicated": [...], "drifted": [...], "cleanup_actions": [...] }
```

## 35.7 The Meta-Loop

The prompt library is itself a SystemEnhancement target. When the system encounters an operation it can't perform, the Fortress Engineer:
1. Uses 35.1 to author the new prompt.
2. Uses 35.2 to self-test it.
3. Adds it to the matching chapter + the shared module.
4. Wires it to a function (35.5).
5. Audits the result (ch.28).

This is how the system grows its own intelligence — autonomously, audited, and never requiring the owner to chat.

## 35.8 The Discipline

- A prompt that can't be audited (no OUTPUT schema, no FAILURE clause) is rejected.
- A prompt that expands scope is rejected.
- A prompt that violates Governance is rejected.
- A prompt that fabricates data is rejected.

The library is the system's operating cortex. Treat every entry like production code — because it is.
