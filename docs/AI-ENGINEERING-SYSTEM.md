# AI engineering system

This document maps the learning guide's terminology to executable repository
artifacts. The source guide remains
[`Developing-in-Agentic-AI-Systems-Learning-Paths.md`](Developing-in-Agentic-AI-Systems-Learning-Paths.md).

## Alignment assessment

The starting repository had a strong application example and several good
building blocks, but it was not yet a complete AI engineering system.

| Guide capability | Starting state | Reference implementation |
| --- | --- | --- |
| Plan -> act -> evaluate | Partial | Explicit phases, role handoffs, and evidence decisions |
| Issue task contract | Strong | Trusted provenance, digest, non-goals, validation, rollout |
| PR as state anchor | Partial | Canonical plan, approval, commits, checks, evidence, decisions |
| Machine-readable risk | Missing | `northstar/plan/1` plus deterministic risk floor |
| Plan approval | Misleading | Human review bound to contract, plan, base, and plan-only commit |
| Role specialization | Partial | Planner, implementer, dependency, security, and risk-review roles |
| Least privilege | Partial | Tool lists, pre-tool denial, job-level workflow permissions |
| Scope enforcement | Partial | Pre-tool path policy plus commit-level changed-path gate |
| CI evaluation | Partial | Fan-out/fan-in quality, build, acceptance, dependency, secret, CodeQL, merge, governance, and review jobs |
| Evidence | Incorrectly permissive | Commit-bound producer envelopes; missing evidence fails |
| Human acceptance | Documented only | Approval checks in code; hosted rules remain explicitly unverified |
| Recovery | Strong but differently named | Guide taxonomy plus policy, security, and transient-environment dispositions |
| Observability | Partial | Payload-free hook audit and commit/run/actor-bound workflow evidence |
| Workflow concurrency | Missing | Workflow-and-branch concurrency groups |
| Continuous AI | Missing | Compiled GitHub Agentic Workflow with staged safe output |
| MCP governance | Misconfigured | Fake endpoint removed; registry/allow-list boundary documented |
| Governance lifecycle | Missing | Weekly/monthly/quarterly audit policy and named owners |
| Documentation accuracy | Misleading | Stale branches, PRs, slides, and demo-only docs removed |

### Verified starting facts

- `npm run validate` passed 138 unit tests.
- PostgreSQL acceptance passed 8 tests, including concurrent retries across two
  service instances.
- `npm audit --audit-level=high` failed on Fastify and transitive `fast-uri`
  advisories.
- The durable evidence comment on the historical implementation PR said
  `PASS` while its security artifact was absent and dependency review was red.
- The plan-only PR had no reviews, while implementation logic treated any open
  plan PR as approved.
- The README and runbooks named remote branches that no longer existed.
- Branch-protection and ruleset APIs returned HTTP 403 for the current private
  repository plan.

## Control loop

### Plan

The issue defines inputs, outputs, and success criteria. The planner produces
both reviewable Markdown and a `northstar/plan/1` contract. Risk routing uses
the machine-readable value, never an interpretation of prose.

High and critical plans require plan-only human approval. The approval record
binds the authoritative contract digest, canonical plan digest, base SHA, plan
commit, reviewer, review ID, and timestamp.

### Act

The implementer receives write tools only after an approved plan resolves.
Native Copilot `PreToolUse` checks the actual requested tool call. A second
commit-level scope gate checks the complete diff, including both sides of
renames. Prose prohibitions remain explicit reviewer responsibilities rather
than being falsely reported as mechanically enforced.

### Evaluate

The governed workflow runs independent jobs in parallel and combines their
artifacts:

1. plan contract and approval;
2. changed-path scope;
3. instruction sync, lint, typecheck, build, and unit tests;
4. PostgreSQL acceptance tests;
5. dependency audit;
6. supplemental secret scan;
7. CodeQL/SARIF;
8. merge validation;
9. governance policy;
10. current human review.

Each job emits a `northstar/check-evidence/1` record. The final
`northstar/execution-report/3` rejects missing, failed, stale, cross-run, or
cross-commit evidence.

The trusted evidence publisher also runs `validation-authority`. A pull request
that changes its own workflows, governance policy, validation scripts, or test
configuration cannot self-certify `ready_for_acceptance`; that bootstrap change
requires external human review and becomes trusted only after it is merged to
the default branch.

## Enforcement layers

| Layer | Mechanism | Guarantee |
| --- | --- | --- |
| Pre-action | Agent tools and `PreToolUse` | Blocks missing-contract, out-of-scope, destructive, secret, and publication operations before execution |
| In-action | GitHub Actions jobs | Runs deterministic quality, security, policy, and acceptance checks |
| Post-action | Check envelopes, execution report, PR evidence | Makes result, actor, commit, run, and limitations inspectable |
| Acceptance | Reviews, CODEOWNERS, rulesets, environments | Humans and platform policy decide merge and deployment |

Hooks are defense in depth, not the acceptance authority. Command-hook timeouts
are fail-open, cloud-agent `ask` becomes deny, and cloud hook files are
ephemeral.

## GitHub Agentic Workflows

The Daily Repository Status workflow demonstrates **Continuous AI**:

- Markdown describes the outcome.
- Frontmatter constrains triggers, permissions, network, tools, budget, and
  safe outputs.
- The agent receives read-only repository access.
- The only write is a staged, bounded `create-issue` safe output.
- `gh aw compile` produces the hardened `.lock.yml`.

It augments deterministic CI. Its analysis and proposed output never decide
whether a change is accepted.

## MCP

The original repository committed a fictitious MCP endpoint. It was removed.
Copilot cloud agent enables the repository-scoped, read-only GitHub MCP server
by default. Any additional server must be configured by an administrator,
discovered through an approved registry, restricted to named tools, and given
runtime-only `COPILOT_MCP_*` credentials.

Registry and organization allow-list settings are external GitHub controls.
They are documented and audited, but cannot be activated by a repository file.

## Validation levels

### Local reference validated

Source-controlled contracts, policies, agents, hooks, workflows, schemas,
tests, application behavior, dependency health, Agentic Workflow compilation,
and the local demo have passed. The execution report is
`ready_for_review`.

### Hosted integration validated

The branch is published and real GitHub evidence proves current human reviews,
workflow runs, required checks, CODEOWNERS enforcement, rulesets, secret
scanning, push protection, and protected-environment approval. Only this level
can produce `ready_for_acceptance`.

The current repository plan does not expose branch-protection/ruleset APIs for
this private repository, so hosted integration must remain unverified until
that external limitation is removed.
