# Context architecture

Three layers, with one rule between them:

> **Durable context must not name a task.**

`AGENTS.md`, `.github/agents/*.agent.md`, and
`.github/instructions/*.instructions.md` are loaded for *every* task in this
repository. If any of them says "read WI-1842", then every future task starts by
reading a work item that has nothing to do with it. The instruction is wrong for
all but one task, and it is wrong silently.

This repository got that wrong at first, and the rest of this file is the fix.

## Layer 1 - durable context

Loaded for every task. Task-agnostic by construction.

| File | Holds |
| --- | --- |
| `AGENTS.md` | The only hand-authored durable file: how to start any task, invariants, capability boundary model, required evidence bundle |
| `.github/copilot-instructions.md` | **Generated** from `AGENTS.md`. Some Copilot surfaces do not read `AGENTS.md` yet, so a shim must exist; generating it prevents a second source of truth. |
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

Supplied per work item. This is the only layer that names a task, and it does
not live in the repository.

> "In GitHub workflows, success criteria should be defined in the issue or pull
> request... Write acceptance criteria directly in the issue, reference those
> criteria in the pull request, and use them as the basis for validation."
>
> — [Microsoft Learn](https://learn.microsoft.com/en-us/training/modules/design-agent-architecture-integration/3-inputs-outputs-success-criteria)

| Where | Holds |
| --- | --- |
| **The GitHub issue** | The contract itself: goal, authoritative sources, allowed and prohibited scope, constraints, outputs, success criteria, stop conditions |
| `.github/ISSUE_TEMPLATE/agent-task.yml` | The shape the issue must take. Durable, and names no task. |
| `docs/demo-setup/<ID>.issue-seed.md` | Demo setup only: the text used to create that issue |
| `.github/prompts/plan-<id>.prompt.md` | The task's entry point, which invokes a task-agnostic agent |

The repository holds the **template**, not the contract. A prompt file named
after a task is not a violation - it *is* the task input. The violation is
putting task identity into something loaded unconditionally.

### Why a seed file exists

A live issue cannot be cloned, version-controlled, or rehearsed offline, which
is exactly what a demo repository needs. `docs/demo-setup/<ID>.issue-seed.md` is the
text used to create the issue, and nothing reads it as authoritative: the
resolved contract records whether it came from an issue or a seed file, and the
execution report prints that provenance.

The seed files double as parser fixtures, so an issue-template change the
parser cannot read fails CI rather than failing on stage.

### What is and is not standard here

| Element | Source |
| --- | --- |
| The task contract concept | Microsoft Learn |
| Inputs / Outputs / Success criteria | Microsoft Learn |
| The contract living in the issue | Microsoft Learn |
| Scoping changes to allowed paths | Microsoft Learn |
| The `ID \| statement \| proving test` line format | This repository |
| `stopConditions` | This repository |
| Caching a parsed contract to `artifacts/` | This repository |

Learn keeps criteria as prose and makes them binding through **required status
checks**. This repository adds a parse step so a criterion can be checked
individually, which is an addition to Learn's model, not a part of it.

## Layer 3 - enforcement

Reads Layer 2. Contains no task identity of its own.

| Script | Reads | Effect |
| --- | --- | --- |
| `scripts/fetch-task-contract.mjs` | `--issue <n>` or `--file <seed>` | Parses the issue into `artifacts/task-contract.json` and records the source |
| `scripts/authorize-tool.mjs` | the resolved contract's `inputs.scope` | Denies writes outside `allowed`, and denies path patterns in `prohibited` even when they sit inside an allowed tree |
| `scripts/build-execution-report.mjs` | the resolved contract's `successCriteria[].provenBy` | Fails when a criterion has no proof |

Both gates work with no contract resolved. The authorizer falls back to a
narrow repository-wide default; the report refuses to run and says why:

```bash
npm run evidence
# No task contract resolved. The contract lives in the issue; run one of:
#   npm run contract:fetch -- --issue <number>
#   npm run contract:fetch -- --file docs/demo-setup/<ID>.issue-seed.md
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

1. Open an issue using the **Agent task** template.
2. Fill in goal, authoritative sources, allowed and prohibited scope,
   constraints, outputs, success criteria, and stop conditions.
3. Optionally save the body to `docs/demo-setup/<ID>.issue-seed.md` so the issue can
   be recreated for a demo, and add `.github/prompts/plan-<id>.prompt.md`.
4. Change nothing in Layer 1.

Step 4 is the whole point. If a new task requires editing `AGENTS.md`, either
the change is a genuine new invariant, or it belongs in the issue.
