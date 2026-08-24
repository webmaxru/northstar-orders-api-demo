---
description: Plan WI-1842 without modifying files
agent: plan
---

This prompt names a task because it *is* the task's entry point. The durable
context it invokes - `AGENTS.md`, the agent profile, the path instructions -
names no task.

Plan **WI-1842**.

The contract has already been resolved for you. The `SessionStart` hook read it
from its GitHub issue, injected it into this conversation, and cached it at
`artifacts/task-contract.json`. Use that. Do **not** read
`docs/demo-setup/WI-1842.issue-seed.md`: it is the text used to create the
issue, not the issue, and it may be stale.

If no contract was injected, stop and say so instead of substituting the seed.

Then read `AGENTS.md`, `docs/architecture.md`, and every authoritative source
the contract names.

Produce:

1. assumptions and ambiguities,
2. proposed design,
3. files to change, all inside the contract's allowed scope,
4. validation plan mapped to every success criterion, naming the test that
   proves each one,
5. capability boundary and stop conditions,
6. rollback and escalation path.

Do not edit files.
