---
description: Plan WI-1842 without modifying files
agent: plan
---

This prompt names a task because it *is* the task's entry point. The durable
context it invokes - `AGENTS.md`, the agent profile, the path instructions -
names no task.

Plan **WI-1842**, defined by its issue.

Read the WI-1842 agent-task issue first: it is the contract, and it states the
goal, authoritative sources, allowed and prohibited scope, constraints,
outputs, success criteria, and stop conditions. Then read `AGENTS.md`,
`docs/architecture.md`, and every authoritative source the issue names.

Produce:

1. assumptions and ambiguities,
2. proposed design,
3. files to change, all inside the issue's allowed scope,
4. validation plan mapped to every success criterion in the issue, naming the
   test that proves each one,
5. capability boundary and stop conditions,
6. rollback and escalation path.

Do not edit files.
