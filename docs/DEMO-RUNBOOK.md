# Northstar Orders API demo runbook

This repository supports the three demos in **From Prompt to Production** without modifying `main`.

## Stable refs

| Ref                       | Purpose                                                    | Expected result                                 |
| ------------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| `main` / `demo-baseline`  | Initial API with no idempotency                            | Unit validation passes                          |
| `demo/context-enabled`    | Task contract, ADR, instructions, and red acceptance tests | Unit passes; acceptance fails                   |
| `demo/naive-reference`    | Process-local idempotency fallback                         | Narrow tests pass; adversarial acceptance fails |
| `demo/governed-reference` | PostgreSQL transaction and durable evidence                | All validation passes                           |

## Prepare disposable worktrees

```powershell
npm run demo:worktree -- demo1
npm run demo:worktree -- demo2
npm run demo:worktree -- naive
npm run demo:worktree -- governed
```

Worktrees are created beside the repository under `northstar-orders-api-demo-worktrees`. Re-running the command removes and recreates only the selected disposable worktree. The script refuses to remove a dirty worktree.

## Demo 1: productive failure

1. Prepare `demo1`.
2. Open the WI-1842 task-contract issue.
3. Prompt Copilot:  
   `Implement WI-1842. Add idempotency to POST /orders, run tests, and stop when they pass.`
4. Stop after eight minutes.
5. Compare the result with `demo/naive-reference`.

The point is not to force a particular model failure. If Copilot produces a durable design, say so and use the naive reference branch to explain the process-local and check-then-act failure modes.

## Demo 2: plan, implement, evaluate

1. Prepare `demo2`.
2. Ask Copilot to read WI-1842, `AGENTS.md`, and ADR-007.
3. Require a plan and stop before edits.
4. Approve the plan, implement, and run `npm run test:acceptance`.
5. Create a PR and use GitHub Actions as the evidence bundle.

The repository is hosted on GitHub, so this demo uses a GitHub issue, pull request, branch rules, and Actions instead of Azure Boards, Azure Repos, and Azure Pipelines.

## Demo 3: measured workflow comparison

Use two disposable copies of the same small task. Record:

- `/context` before work,
- `/usage` after work,
- accepted outcome,
- elapsed time,
- review rework.

For automation, Copilot CLI also supports `--usage-output-file`.

## Return to initial state

```powershell
git switch main
git status --short
npm run demo:state
```

`main` must remain at tag `demo-baseline` with a clean worktree.
