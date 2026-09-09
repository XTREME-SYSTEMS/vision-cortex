# Autonomous Builds

This directory is auto-populated by the AGI swarm's autonomous code push.

- No manual approval — code is pushed after validation passes.
- Agents push via `agentAPI` action `push_code`.
- The code orchestrator auto-pushes each validated build spec.
