---
description: Plan WI-1842 without modifying files
agent: plan
---

This prompt names a task because it *is* the task's entry point. The durable
context it invokes - `AGENTS.md`, the agent profile, the path instructions -
names no task.

Plan **WI-1842**.

Read `docs/work-items/WI-1842.md`, its contract
`docs/work-items/WI-1842.contract.json`, `AGENTS.md`, `docs/architecture.md`,
and `docs/adr/007-durable-idempotency.md`.

Produce:

1. assumptions and ambiguities,
2. proposed design,
3. files to change, all inside the contract's `inputs.scope.allowed`,
4. validation plan mapped to every entry in the contract's `successCriteria`,
5. capability boundary and stop conditions,
6. rollback and escalation path.

Do not edit files.
