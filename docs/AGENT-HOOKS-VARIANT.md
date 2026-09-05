# Responsible AI Agent Hooks variant

Branch: `reference/ai-engineering-system-agent-hooks`

This branch preserves the complete outer AI engineering system from
`reference/ai-engineering-system` and replaces only the native Copilot
`PreToolUse` adapter with
[`@responsibleai/agent-hooks@0.1.0-alpha.5`](https://responsibleai.github.io/agent-hooks/).

## Compatibility conclusion

Responsible AI Agent Hooks is **architecturally compatible** with the learning
guide:

- `pre_tool_call` provides model-independent least-privilege enforcement;
- deterministic composition allows task, role, human-boundary, evidence, and
  compatibility policies to run together;
- content identities bind records to the task, plan, role, repository SHA, and
  tool arguments;
- interception records are payload-free and auditable;
- fail-closed interceptor errors strengthen an owned agent host.

It is **not a drop-in replacement** for this GitHub/Copilot engineering system.
It does not fetch issue contracts, create or approve plans, run CI, evaluate
JUnit or SARIF, enforce rulesets, implement CODEOWNERS, gate environments, or
manage repair budgets. All of those outer GitHub controls remain unchanged.

## What this branch adds

`scripts/agent-hooks-bridge.mjs` translates:

```text
Copilot PreToolUse
  -> Agent Hooks pre_tool_call
  -> sequential/run_all composition
  -> Copilot permissionDecision / modifiedArgs
```

Five interceptors run for every call:

1. `task-contract-gate`
2. `role-gate`
3. `human-boundary`
4. `evidence-output-gate`
5. `native-policy-compatibility`

The last interceptor reuses the proven native policy, so representative
allow/deny/ask decisions remain equivalent while the other interceptors make
responsibility boundaries visible in the Agent Hooks record.

Copilot CLI and cloud-agent `PreToolUse` payloads do not expose a trustworthy
active custom-agent identity. On those hosts, `.github/agents/*.agent.md`
tool lists remain the role boundary and the Agent Hooks role interceptor emits
a payload-free `role_unavailable` warning rather than inventing an implementer
identity.

VS Code can add a second, agent-scoped `PreToolUse` invocation with an explicit
role argument; `.vscode/settings.json` enables that preview surface. The
repository-level bridge still runs, so the most restrictive decision wins.

The custom `northstar-sha256` identity includes:

- `tool_call.name` and arguments;
- task ID and task-contract digest;
- approved-plan digest;
- workflow role;
- repository SHA;
- adapter and conformance labels.

The default Agent Hooks identity intentionally does not bind arbitrary
extensions, so this custom provider is required to prevent an approval or
record from floating between tasks or plans.

## Honest protocol mapping

| Agent Hooks event | Copilot surface | Status |
| --- | --- | --- |
| `agent_startup` | `SessionStart` | Approximation only |
| `input` | `UserPromptSubmit` | Side effects only; command-hook prompt transforms are not generally applied |
| `pre_model_call` | None | Unavailable |
| `post_model_call` | None | Unavailable |
| `pre_tool_call` | `PreToolUse` | Implemented |
| `post_tool_call` | `PostToolUse` / `PostToolUseFailure` | Native audit remains; not translated |
| `output` | None for the main agent | Unavailable |
| `agent_shutdown` | `SessionEnd` / `Stop` | Semantics differ; native audit remains |

Therefore this branch is an explicitly:

```text
nonconformant-partial-adapter
```

It must not claim Agent Hooks CTK conformance. A conformant host would need to
own the model loop, tool dispatcher, session sequence, approval resolver, and
all eight interception points.

## Enforcement limits

The SDK fails closed when an interceptor throws, returns an invalid verdict, or
exceeds its internal timeout. The outer Copilot command-hook host still owns
the final dispatch:

- Copilot command-hook timeouts remain fail-open.
- Cloud agent converts `ask` to `deny` because no approver is present.
- A separate process handles each hook invocation, so Agent Hooks session
  sequence and in-memory record retention do not span the whole Copilot
  session.
- The cooperative Agent Hooks contract is not a sandbox; a hostile host could
  skip the bridge.

Persisted records remove verdict messages and approval payloads so paths,
commands, prompts, and tool arguments are represented only by content
identities and stable reason codes.

The branch keeps GitHub Actions, rulesets, reviews, environments, and
`trusted-acceptance` as the acceptance authority.

## Complexity comparison

| Dimension | Native branch | Agent Hooks branch |
| --- | --- | --- |
| Runtime dependencies | Node standard library | Alpha SDK plus native Rust/N-API binary |
| Host fit | Direct Copilot payloads | Copilot <-> Agent Hooks translation |
| Policy code | One native evaluator | Native evaluator retained plus five-interceptor adapter |
| Composition | Repository-specific | Standard `sequential/run_all` records |
| Identity | Repository evidence digests | Standardized custom content identity |
| Audit | Native payload-free hook record | Agent Hooks interception record for pre-tool calls |
| Lifecycle coverage | Every Copilot event the repo configures | Only `pre_tool_call` can be honestly mapped |
| Failure boundary | Copilot host semantics | SDK fail-closed inside outer Copilot fail-open timeout |
| Portability | Copilot CLI, cloud agent, VS Code | Valuable when several owned hosts share one policy contract |

For this repository, Agent Hooks makes the system **more complex**. It adds a
native alpha dependency, adapter code, custom identity logic, and two protocol
failure models while leaving the entire GitHub governance system in place.

It would simplify a future architecture only if Northstar owned the agent
runtime—for example, a Microsoft Agent Framework host—and needed the same
interceptors, identities, approval semantics, and records across multiple
frameworks.

## Demo

```powershell
npm ci
npm run agent-hooks:smoke
npm run test:unit
npm run validate:all
```

Compare native and Agent Hooks decisions directly:

```powershell
$call = '{"toolName":"bash","toolArgs":{"command":"printenv"}}'
$call | npm run hook:native --silent
$call | npm run hook:check --silent
```

Both deny the request. The Agent Hooks variant additionally appends a
payload-free `pre_tool_call` record to:

```text
artifacts/agent-hooks-records.jsonl
```
