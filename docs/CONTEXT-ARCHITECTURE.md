# Context architecture

Three layers, with one rule between them:

> **Durable context must not name a task.**

`AGENTS.md`, `.github/copilot-instructions.md`, `.github/agents/*.agent.md`, and
`.github/instructions/*.instructions.md` are loaded for *every* task in this
repository. If any of them says "read WI-1842", then every future task starts by
reading a work item that has nothing to do with it. The instruction is wrong for
all but one task, and it is wrong silently.

This repository got that wrong at first, and the rest of this file is the fix.

## Layer 1 - durable context

Loaded for every task. Task-agnostic by construction.

| File | Holds |
| --- | --- |
| `.github/copilot-instructions.md` | How to start *any* task in this repository |
| `AGENTS.md` | Invariants, capability boundary model, required evidence bundle |
| `docs/architecture.md` | Runtime, delivery, and privacy boundaries |
| `docs/adr/*.md` | Accepted architecture decisions |
| `.github/instructions/*.instructions.md` | Path-scoped rules, via `applyTo` |
| `.github/agents/*.agent.md` | Roles defined by capability |

The test: **could this file be true a year from now, after the current backlog
is gone?** If not, it belongs in Layer 2.

ADRs are the edge case worth naming. `services.instructions.md` references
ADR-007 and that is correct, because an accepted ADR is a durable property of
the service layer, not a property of the task that happened to introduce it.

## Layer 2 - task contract

Supplied per work item. This is the only layer that names a task.

| File | Holds |
| --- | --- |
| `docs/work-items/<ID>.md` | Intent and acceptance criteria, for humans |
| `docs/work-items/<ID>.contract.json` | Allowed scope, prohibited scope, stop conditions, and the evidence that proves each criterion, for machines |
| `.github/prompts/plan-<id>.prompt.md` | The task's entry point, which invokes a task-agnostic agent |

A prompt file named after a task is not a violation. It *is* the task input.
The violation is putting task identity into something loaded unconditionally.

## Layer 3 - enforcement

Reads Layer 2. Contains no task identity of its own.

| Script | Reads | Effect |
| --- | --- | --- |
| `scripts/task-contract.mjs` | `--task <ID>` or `AGENT_TASK` | Resolves the active contract, or `null` |
| `scripts/authorize-tool.mjs` | `contract.scope` | Denies writes outside the task's allowed scope before the tool runs |
| `scripts/build-execution-report.mjs` | `contract.acceptanceCriteria` | Fails when a criterion has no proof |

Both scripts work with no task in scope. The authorizer falls back to a narrow
repository-wide default; the report refuses to run and says why:

```bash
npm run evidence
# No task in scope. Pass --task <ID> or set AGENT_TASK, for example: npm run evidence -- --task WI-1842
```

Failing loudly is the point. A report that silently graded a change against the
wrong contract would be worse than no report.

## Why this matters more than it looks

Least privilege is per task *and* per phase. That is only achievable if scope is
an input. When the boundary is hardcoded in a durable file, every task gets the
union of every scope anyone ever needed, and the boundary widens permanently.

Compare the same denial with and without a task in scope:

```
docs/architecture.md is outside the approved scope (src/, tests/, migrations/)
.github/workflows/ci.yml is outside the WI-1842 scope (src/, tests/, migrations/)
```

The second is auditable: it says which contract made the decision. A denial you
cannot attribute to a contract is a denial you cannot review.

## Adding a task

1. Write `docs/work-items/<ID>.md` with intent and acceptance criteria.
2. Write `docs/work-items/<ID>.contract.json` with scope, stop conditions, and a
   `provenBy` for each criterion.
3. Optionally add `.github/prompts/plan-<id>.prompt.md`.
4. Change nothing in Layer 1.

Step 4 is the whole point. If a new task requires editing `AGENTS.md`, either
the change is a genuine new invariant, or it belongs in the contract.
