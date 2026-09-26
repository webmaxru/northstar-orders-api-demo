# Plan: AES-PARALLEL-ISOLATION

## Objective
Support simultaneous independent agent tasks on one local machine through Copilot CLI with separate Git worktrees, and in Copilot cloud agent through isolated task checkouts and workflow runs. Prevent one task or session from overwriting, clearing, reading as authority, or accepting another task's contracts, plans, evidence, retry state, or test resources. Also isolate PostgreSQL acceptance suites so files running concurrently never create, reset, or query the same shared schema. On 2026-09-26, hosted validation repeatedly failed because tests/acceptance/idempotency.acceptance.test.ts and tests/acceptance/postgres-privacy.acceptance.test.ts raced while creating the public `orders` type/table; PostgreSQL reported duplicate pg_type_typname_nsp_index and the tests observed two rows instead of one.

## Plan
Risk: high. Base: `agent/implement/aes-surface-evidence` at `2e3cd083399661947b98b420f66ce7a9523ca68b`. This is a plan-only proposal. No implementation changes are authorized until an eligible independent reviewer approves the exact plan commit.

### Current failure evidence
- The task contract documents a shared-checkout resolver reproduction: concurrent tasks overwrite `artifacts/task-contract.json` and `artifacts/task-session.json`.
- Hosted acceptance on unchanged plan-only PR runs reported PostgreSQL `orders` type/schema collisions (`pg_type_typname_nsp_index`) and cross-test row-count failures when acceptance files ran concurrently.

### Planned approach
1. Prove the shared-checkout failure and two-worktree isolation with deterministic concurrent tests before changing runtime authority.
2. Enforce one explicit owner per write-capable worktree; reject conflicts before clearing or writing any cached contract/plan/evidence.
3. Keep per-task artifacts in the isolated checkout/namespace and make cleanup ownership-checked.
4. Give each PostgreSQL acceptance suite a unique schema and each local server a unique port; cleanup only owned resources.
5. Preserve parallelism for independent task branches while serializing genuinely shared privileged targets.
6. Validate both synthetic concurrency controls and actual CLI/cloud sessions; state unsupported canaries honestly.

## Scope and files to change
- `scripts/**`
- `tests/**`
- `.github/hooks/**`
- `.github/agents/**`
- `.github/prompts/**`
- `.github/instructions/**`
- `.github/governance/**`
- `.github/workflows/**`
- `.github/CODEOWNERS`
- `.github/copilot-instructions.md`
- `AGENTS.md`
- `docs/architecture.md`
- `docs/RECOVERY-POLICY.md`
- `package.json`
- `package-lock.json`
- `.gitignore`
- `docker-compose.yml`

Prohibited paths and operations:
- `src/**`
- `migrations/**`
- `production resources`
- `hosted permissions, credentials, account settings, or repository visibility without separate explicit administrator approval`
- `unrelated edits in the original framework or other repositories`

## Success criteria
- AC1 | Two actual resolver processes in separate Git worktrees preserve independent task, plan and session state using the same artifact basenames | isolates simultaneous task state across Git worktrees
- AC2 | A second task/session in an owned checkout is rejected before any owner state is cleared or changed | rejects a conflicting workspace owner without mutating its artifacts
- AC3 | Every authority/evidence artifact resolves within the explicit owning execution context and cross-context or escaping paths are rejected | confines artifact paths to their owning execution context
- AC4 | One task's failed resolution, Stop retry, cleanup or recovery cannot affect the other live task | contains failure and cleanup within the owning task
- AC5 | Concurrent validation outputs have run/attempt/producer identity and fan-in rejects mixed task or source bundles | rejects cross-task and cross-run parallel evidence
- AC6 | Independent acceptance suites can run concurrently without sharing or resetting the same PostgreSQL schema, ports, or teardown resources | isolates concurrent local test resources
- AC7 | Workflow concurrency permits independent branches/tasks while preserving intentional shared-target serialization | scopes workflow concurrency without globally serializing independent tasks
- AC8 | An explicit task-start workflow prepares or selects an isolated matching workspace without switching or reusing another active task's checkout | provisions only the explicitly selected task workspace
- AC9 | Live local CLI and cloud parallel canaries produce independent inspectable outcomes, or remain explicitly unverified until they can be run | proves parallel execution on the claimed Copilot surfaces
- AC10 | The idempotency and privacy PostgreSQL acceptance suites use distinct temporary schemas and can run concurrently without duplicate DDL or cross-test rows | isolates PostgreSQL acceptance schemas per suite

## Evidence
- Exact predecessor base/commit and current task/plan digests; no prior issue #14/#15 approval is reused for issue #16.
- Concurrent two-process tests showing shared-checkout conflict is rejected before owner state mutation and separate worktrees preserve independent caches.
- PostgreSQL acceptance results showing idempotency and privacy suites run concurrently in distinct schemas, with cleanup confined to each schema; test ports/resources are independent.
- Workflow concurrency test output proving independent branches run concurrently and shared production/deployment targets remain serialized.
- Actual CLI and cloud canary run IDs/attempts, task/plan/session identities, host versions, workspace paths and evidence artifacts; unsupported surfaces recorded as unverified.
- Exact npm validate, validate:all, scanner and focused test commands/results at the candidate SHA, plus dependency/security and recovery evidence.

## Decisions and handoffs
- The user authorized completing remaining system tasks; issue #16 still requires its own exact high-risk plan approval and implementation review. This proposal does not modify issue #14 or approved plan #15.
- The plan base is agent/implement/aes-surface-evidence at 2e3cd083399661947b98b420f66ce7a9523ca68b, not main and not the historical e509ce0 checkpoint.
- Current hosted acceptance evidence includes duplicate orders type/schema creation (pg_type_typname_nsp_index) and cross-test row-count failures when the idempotency and privacy acceptance files ran concurrently. The failing job came from a plan-only diff, so this is a baseline test-resource defect, not a code change from that PR.
- Issue #16 is a prerequisite for issue #24 preflight because acceptance must pass before any temporary ruleset window. Issue #24 remains blocked until this task is accepted.

## Risks
- A global active-task file or cleanup routine can erase another session's authority/evidence if ownership is not checked before writes.
- Artifact path namespacing can break existing consumers or silently leave stale root-level files that look authoritative.
- PostgreSQL schema isolation must not touch production schemas or drop shared databases; cleanup only the unique test schema created by that test.
- Parallel test isolation must not turn into global serialization of independent task workflows or weaken shared-target deployment controls.
- Fixture success is not live CLI/cloud proof; incomplete canaries must remain explicitly unverified.

## Rollback and escalation
- Keep each change isolated on a dedicated branch and worktree; roll back task resolver, namespace, concurrency and test-resource changes together if ownership/evidence regresses.
- Cleanup only exact temporary schemas, ports and task-owned artifact directories; never remove a shared database, parent directory, or another task workspace.
- If the old root-level artifact migration is ambiguous, do not adopt or delete it automatically; require an explicit owner-controlled transition.
- Stop after repeated identical required failures, policy/security failures, unresolved session ownership conflicts, or a missing CLI/cloud identity.

<!-- northstar:plan-contract:start -->
```json
{
  "schema": "northstar/plan/1",
  "taskId": "AES-PARALLEL-ISOLATION",
  "contractDigest": "d84b51e076ef5febef7190f223ebba064d25759233001d2e3318f1849898cd1a",
  "baseSha": "2e3cd083399661947b98b420f66ce7a9523ca68b",
  "baseBranch": "agent/implement/aes-surface-evidence",
  "risk": "high",
  "objective": "Support simultaneous independent agent tasks on one local machine through Copilot CLI with separate Git worktrees, and in Copilot cloud agent through isolated task checkouts and workflow runs. Prevent one task or session from overwriting, clearing, reading as authority, or accepting another task's contracts, plans, evidence, retry state, or test resources. Also isolate PostgreSQL acceptance suites so files running concurrently never create, reset, or query the same shared schema. On 2026-09-26, hosted validation repeatedly failed because tests/acceptance/idempotency.acceptance.test.ts and tests/acceptance/postgres-privacy.acceptance.test.ts raced while creating the public `orders` type/table; PostgreSQL reported duplicate pg_type_typname_nsp_index and the tests observed two rows instead of one.",
  "scope": {
    "allowed": [
      "scripts/**",
      "tests/**",
      ".github/hooks/**",
      ".github/agents/**",
      ".github/prompts/**",
      ".github/instructions/**",
      ".github/governance/**",
      ".github/workflows/**",
      ".github/CODEOWNERS",
      ".github/copilot-instructions.md",
      "AGENTS.md",
      "docs/architecture.md",
      "docs/RECOVERY-POLICY.md",
      "package.json",
      "package-lock.json",
      ".gitignore",
      "docker-compose.yml"
    ],
    "prohibited": [
      "src/**",
      "migrations/**",
      "production resources",
      "hosted permissions, credentials, account settings, or repository visibility without separate explicit administrator approval",
      "unrelated edits in the original framework or other repositories"
    ]
  },
  "operations": [
    "workflow-change",
    "security-change"
  ],
  "steps": [
    "Reconfirm the live task digest, predecessor PR #18 head/base, issue #14 and approved plan #15 identities, and exact repository/worktree state. Treat checkpoint e509ce0 only as historical fixture evidence, not an accepted base.",
    "Add deterministic failing regressions for two resolver processes sharing one worktree and a positive concurrent two-worktree control. Use temporary test roots and explicit fixture identities only.",
    "Implement task/workspace ownership so a second session in an owned checkout is rejected before any task cache, plan, retry state, or evidence is cleared or written. Bind ownership to explicit task, session and repository identities; avoid a machine-global active-task pointer.",
    "Namespace mutable artifacts and retry/evidence records by owning execution context while retaining stable artifact basenames inside each isolated worktree. Make cleanup and recovery verify ownership and remove only the owning task namespace.",
    "Isolate PostgreSQL acceptance suites by allocating a unique temporary schema per suite/process, setting a safe search_path, and cleaning up only that schema. Isolate server ports and teardown resources; do not serialize all unrelated tests merely to hide collisions.",
    "Update workflow concurrency only where required: independent task branches remain parallel; shared privileged/deployment targets remain serialized. Do not modify required status checks, approval semantics, or external settings.",
    "Add tests for concurrent resolver, authorization, audit, validation, failure/cleanup, mixed artifacts, path escape, stale task state, schema isolation, and independent port allocation.",
    "Run focused tests, npm run validate, npm run agentic:compile, npm run agentic:zizmor, npm run test:acceptance and npm run validate:all at the exact candidate SHA. Retain the independent PostgreSQL acceptance boundary and record exact results.",
    "Run two actual Copilot CLI task sessions in separate worktrees on the same machine and two actual Copilot cloud tasks/PRs where supported. Record host/version, task/session/plan identity, workspace paths, workflow/run/attempt evidence and final decisions; if any surface cannot be exercised, report it explicitly and do not substitute fixtures.",
    "If a host cannot preserve task/session identity, if a shared-workspace conflict can clear another owner state, or if a safe PostgreSQL namespace cannot be isolated without changing prohibited production code, stop and report the smallest required scope amendment."
  ],
  "requiredChecks": [
    "plan-contract",
    "plan-approval",
    "scope-policy",
    "quality",
    "acceptance",
    "dependency-review",
    "codeql",
    "secret-scan",
    "merge-validation",
    "governance-policy",
    "validation-authority",
    "repository-controls",
    "human-review",
    "evidence"
  ],
  "successCriteria": [
    {
      "id": "AC1",
      "statement": "Two actual resolver processes in separate Git worktrees preserve independent task, plan and session state using the same artifact basenames",
      "provenBy": "isolates simultaneous task state across Git worktrees"
    },
    {
      "id": "AC2",
      "statement": "A second task/session in an owned checkout is rejected before any owner state is cleared or changed",
      "provenBy": "rejects a conflicting workspace owner without mutating its artifacts"
    },
    {
      "id": "AC3",
      "statement": "Every authority/evidence artifact resolves within the explicit owning execution context and cross-context or escaping paths are rejected",
      "provenBy": "confines artifact paths to their owning execution context"
    },
    {
      "id": "AC4",
      "statement": "One task's failed resolution, Stop retry, cleanup or recovery cannot affect the other live task",
      "provenBy": "contains failure and cleanup within the owning task"
    },
    {
      "id": "AC5",
      "statement": "Concurrent validation outputs have run/attempt/producer identity and fan-in rejects mixed task or source bundles",
      "provenBy": "rejects cross-task and cross-run parallel evidence"
    },
    {
      "id": "AC6",
      "statement": "Independent acceptance suites can run concurrently without sharing or resetting the same PostgreSQL schema, ports, or teardown resources",
      "provenBy": "isolates concurrent local test resources"
    },
    {
      "id": "AC7",
      "statement": "Workflow concurrency permits independent branches/tasks while preserving intentional shared-target serialization",
      "provenBy": "scopes workflow concurrency without globally serializing independent tasks"
    },
    {
      "id": "AC8",
      "statement": "An explicit task-start workflow prepares or selects an isolated matching workspace without switching or reusing another active task's checkout",
      "provenBy": "provisions only the explicitly selected task workspace"
    },
    {
      "id": "AC9",
      "statement": "Live local CLI and cloud parallel canaries produce independent inspectable outcomes, or remain explicitly unverified until they can be run",
      "provenBy": "proves parallel execution on the claimed Copilot surfaces"
    },
    {
      "id": "AC10",
      "statement": "The idempotency and privacy PostgreSQL acceptance suites use distinct temporary schemas and can run concurrently without duplicate DDL or cross-test rows",
      "provenBy": "isolates PostgreSQL acceptance schemas per suite"
    }
  ],
  "evidence": [
    "Exact predecessor base/commit and current task/plan digests; no prior issue #14/#15 approval is reused for issue #16.",
    "Concurrent two-process tests showing shared-checkout conflict is rejected before owner state mutation and separate worktrees preserve independent caches.",
    "PostgreSQL acceptance results showing idempotency and privacy suites run concurrently in distinct schemas, with cleanup confined to each schema; test ports/resources are independent.",
    "Workflow concurrency test output proving independent branches run concurrently and shared production/deployment targets remain serialized.",
    "Actual CLI and cloud canary run IDs/attempts, task/plan/session identities, host versions, workspace paths and evidence artifacts; unsupported surfaces recorded as unverified.",
    "Exact npm validate, validate:all, scanner and focused test commands/results at the candidate SHA, plus dependency/security and recovery evidence."
  ],
  "decisionsAndHandoffs": [
    "The user authorized completing remaining system tasks; issue #16 still requires its own exact high-risk plan approval and implementation review. This proposal does not modify issue #14 or approved plan #15.",
    "The plan base is agent/implement/aes-surface-evidence at 2e3cd083399661947b98b420f66ce7a9523ca68b, not main and not the historical e509ce0 checkpoint.",
    "Current hosted acceptance evidence includes duplicate orders type/schema creation (pg_type_typname_nsp_index) and cross-test row-count failures when the idempotency and privacy acceptance files ran concurrently. The failing job came from a plan-only diff, so this is a baseline test-resource defect, not a code change from that PR.",
    "Issue #16 is a prerequisite for issue #24 preflight because acceptance must pass before any temporary ruleset window. Issue #24 remains blocked until this task is accepted."
  ],
  "risks": [
    "A global active-task file or cleanup routine can erase another session's authority/evidence if ownership is not checked before writes.",
    "Artifact path namespacing can break existing consumers or silently leave stale root-level files that look authoritative.",
    "PostgreSQL schema isolation must not touch production schemas or drop shared databases; cleanup only the unique test schema created by that test.",
    "Parallel test isolation must not turn into global serialization of independent task workflows or weaken shared-target deployment controls.",
    "Fixture success is not live CLI/cloud proof; incomplete canaries must remain explicitly unverified."
  ],
  "rollbackAndEscalation": [
    "Keep each change isolated on a dedicated branch and worktree; roll back task resolver, namespace, concurrency and test-resource changes together if ownership/evidence regresses.",
    "Cleanup only exact temporary schemas, ports and task-owned artifact directories; never remove a shared database, parent directory, or another task workspace.",
    "If the old root-level artifact migration is ambiguous, do not adopt or delete it automatically; require an explicit owner-controlled transition.",
    "Stop after repeated identical required failures, policy/security failures, unresolved session ownership conflicts, or a missing CLI/cloud identity."
  ],
  "planDigest": "2bed7dfceb38e1d09db8893e8b4af7492068ca88b42323d393f433a99ccb3339"
}
```
<!-- northstar:plan-contract:end -->
