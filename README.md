# Northstar Orders API

> **Synthetic demo repository.** Northstar Commerce, its incidents, metrics, and identifiers are fictional.

A small TypeScript/Fastify API for demonstrating governed GitHub Copilot workflows: task contracts, plan-first implementation, capability boundaries, evidence bundles, deterministic checks, and cost-aware sessions.

## Quick start

```bash
npm ci
npm run validate
npm start
```

```bash
curl -X POST http://localhost:3000/orders -H "content-type: application/json" -d '{"sku":"WIDGET-1","quantity":2}'
```

## Demo scenario

[Issue #4](https://github.com/webmaxru/northstar-orders-api-demo/issues/4) is the task contract for **WI-1842**: prevent duplicate orders when clients retry after a timeout. The baseline deliberately has no idempotency. See [`docs/demo-setup/`](docs/demo-setup/README.md) for how to recreate the issue.

Read [`docs/DEMO-RUNBOOK.md`](docs/DEMO-RUNBOOK.md) before presenting.

## Session artifacts

[`docs/PATTERNS-MAP.md`](docs/PATTERNS-MAP.md) maps each pattern from **From agents to engineering systems** to the file and command in this repository that demonstrates it: the task contract, path-scoped context, capability boundaries enforced before tool use, the execution report used as an evidence gate, and a bounded repair policy.

[`docs/SESSION-RUNBOOK.md`](docs/SESSION-RUNBOOK.md) is the slide-by-slide delivery guide: what to put on screen at each slide, for how long, the exact commands with their expected output, and the fallbacks.

[`docs/END-TO-END-FLOW.md`](docs/END-TO-END-FLOW.md) traces the whole workflow from running the plan prompt to a mergeable pull request: which script creates or checks which file, when, and why that ordering is forced.

[`docs/LOCAL-VSCODE-FLOW.md`](docs/LOCAL-VSCODE-FLOW.md) is the same flow performed by hand in VS Code, including which parts of the boundary VS Code does and does not enforce.

```bash
npm run hook:check      # pre-tool-use authorization decision from stdin
npm run contract:fetch -- --issue 4    # resolve the contract from its issue
npm run evidence                      # build artifacts/report.json and gate on missing evidence
npm run repair:check    # decide repair or escalate from an attempt log
```

## Branches

| Branch | What it holds | Use it to |
| --- | --- | --- |
| `main` | The baseline API, tagged `demo-baseline`. No idempotency, no agent harness. | Show the starting point. |
| `demo/naive-reference` | Baseline plus the plausible wrong answer: process-local state that passes a single-process test and fails across instances. | Show the failure the talk opens with. |
| `demo/context-enabled` | Durable context - `AGENTS.md`, path-scoped instructions - with the implementation still absent. | Show context as code, before and after. |
| `demo/governed-reference` | A governed implementation with the acceptance suite. | Show the answer with its evidence. |
| **`demo/implement-start`** | The full agent harness - agents, prompts, hooks, workflows, migration, metrics, acceptance suite - **without** the idempotency implementation. | **Run the flow.** `/plan 4` and `/implement 4` have real work to do here. |
| `demo/engineering-system` | The same harness with the implementation finished. | Read the answer, and present Mode A of the session runbook. |
| `plan/wi-1842` | The plan-first pull request branch, cut from whichever branch you planned on. | Review intent before any code exists. |

`demo/implement-start` is the one to start from if you want to drive the agents
yourself: on `demo/engineering-system` the work is already done, so
`/implement 4` correctly finds nothing to do.

## Safety

- No customer or production data.
- No credentials or tokens are committed.
- `main` is a stable baseline tagged `demo-baseline`.
- Rehearse in disposable Git worktrees.
- Reference branches are never merged into `main`.

