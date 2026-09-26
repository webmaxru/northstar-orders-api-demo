# Plan: AES-REPO-CONTROLS-EVIDENCE

## Objective
Migrate the required `repository-controls` result from an unprivileged pull-request audit to a protected trusted-publisher audit, using the already configured trusted publisher App. Rebind only the existing required check to that trusted status source, preserve all other protections and the no-bypass policy, and prove a safe bootstrap/rollback path before changing the rule. Pull-request code must never receive administrator or secret-inventory credentials. If no no-bypass bootstrap is feasible, stop before changing the ruleset or implementation and report the exact additional human decision required.

## Plan
Risk: high. Base: `agent/implement/aes-surface-evidence` at `2e3cd083399661947b98b420f66ce7a9523ca68b`. This replaces the prior proposal because the live issue contract was explicitly amended. The prior PR #23 approval is invalid. No implementation or ruleset mutation is authorized until an independent human approves this exact revised plan.

### Current control-plane evidence
- Active ruleset `23998987` requires `repository-controls` from integration `15368` and `trusted-acceptance` from integration `5075466`; the ruleset is strict and has no bypass actors.
- The PR job uses only `Contents: read` and `Metadata: read`; its online administrator lookups remain unavailable.
- Existing protected publisher run `36191075115` reported `online.available=false` and `rulesetCount=0`.
- Publisher run `36233334770` for PR #23 failed before its audit because the current resolver requires a PR targeting `main`, while the plan PR base is `agent/implement/aes-surface-evidence`.

### Planned migration
1. Prove a no-bypass bootstrap sequence before editing code or settings. The trusted status producer must be deployable while all current required checks remain enforced; otherwise stop before mutation.
2. If feasible, validate the exact Governed Change source run/attempt and same-repo PR identity, including the task-declared stacked base, before importing artifacts.
3. Run online controls only in the protected default-branch publisher with the existing App; keep admin/secret access out of PR jobs and fail closed on missing or unavailable evidence.
4. Have the protected publisher emit `repository-controls` from App `5075466` on the verified PR head. Test the exact context, creator integration, source-run provenance, report freshness and negative cases.
5. Only after trusted publication is proven, rebind only ruleset `23998987` context `repository-controls` from integration `15368` to `5075466`. Preserve strictness, all other contexts and the empty bypass list; verify and record the before/after state.
6. If no no-bypass bootstrap exists, make no settings or code changes and report the additional human decision required.

## Scope and files to change
- `.github/workflows/governed-change.yml`
- `.github/workflows/governance-review.yml`
- `.github/workflows/publish-evidence.yml`
- `.github/workflows/system-maintenance-approval.yml`
- `scripts/governance-audit.mjs`
- `scripts/resolve-workflow-run.mjs`
- `scripts/resolve-workflow-pr.mjs`
- `scripts/publish-acceptance-status.mjs`
- `tests/unit/governance-audit.test.ts`
- `tests/unit/resolve-workflow-run.test.ts`
- `tests/unit/resolve-workflow-pr.test.ts`
- `tests/unit/publish-acceptance-status.test.ts`
- `docs/architecture.md`

Prohibited paths and operations:
- `src/**`
- `migrations/**`
- `package.json`
- `package-lock.json`
- `.github/governance/**`
- `.github/zizmor.yml`
- `all workflow files not listed under Allowed scope`
- `production resources or deployment`
- `all hosted settings except the single authorized binding change on repository ruleset 23998987: required context `repository-controls` integration_id 15368 to existing trusted publisher App integration_id 5075466`
- `any change to other required status contexts, their integration IDs, strict status policy, pull-request requirements, CODEOWNERS review, bypass actors, force-push/deletion rules, or protected environments`
- `creating/installing a new GitHub App, changing App installation permissions, generating keys, changing secrets, credentials, or account settings`
- `adding administrator or secret-inventory credentials to any pull_request job or PR-controlled process`
- `broadening pull_request GITHUB_TOKEN beyond minimal read access required to retrieve trusted evidence`
- `removing, renaming, weakening, or suppressing required repository-controls or other security checks`
- `trusting or executing artifacts produced by pull-request-controlled code as proof of external repository controls`
- `scanner suppressions, severity downgrades, or blanket ignore rules`
- `changes to issue #20's approved plan or scanner-remediation implementation`

## Success criteria
- AC1 | PR-triggered code never receives administrator or secret-inventory credentials or privileged write permissions | pull request workflows do not expose privileged governance credentials
- AC2 | The trusted publisher emits repository-controls only for an exact verified source workflow run and PR head | publishes repository controls only after exact source identity validation
- AC3 | Missing, stale, mismatched, malformed, or PR-originated evidence remains unavailable/failing and is never represented as pass | rejects mismatched trusted governance report provenance
- AC4 | Ruleset 23998987 changes only the repository-controls integration to 5075466; all other protections and the empty bypass list remain intact | preserves hosted-control and approval boundaries
- AC5 | The no-bypass bootstrap reaches the trusted status producer without disabling required checks or adding a bypass actor | verifies repository-controls no-bypass bootstrap
- AC6 | The approved implementation passes focused and complete local validation and records exact hosted outcomes without overstating acceptance | records complete validation for trusted control evidence

## Evidence
- Live ruleset 23998987 before/after snapshots limited to the required-context integration binding, strict policy and bypass actors; no unrelated settings or secret values.
- Source-run resolver outputs binding repository, exact workflow/event/run/attempt, PR, base/head, task/plan digest and report identity.
- Positive and negative tests for trusted status provenance, source-run mismatch, stacked-base resolution, stale/missing report, PR-originated artifacts and no-bypass bootstrap.
- Protected publisher workflow run, status context integration_id 5075466 on exact PR head, trusted governance report digest and successful repository-controls job.
- Focused and full local command outputs, exact test counts, PostgreSQL result when required by changed process boundaries, candidate SHA and hosted run URLs.
- If the no-bypass bootstrap is impossible, a bounded blocked report naming the exact external action required; no code or ruleset mutation is performed.

## Decisions and handoffs
- The repository owner explicitly authorized the narrow scope expansion on 2026-09-26: one ruleset 23998987 context rebind from Actions 15368 to existing trusted publisher App 5075466, plus protected trusted status publication. The owner did not authorize bypass actors, new Apps, keys, permissions, or other settings changes.
- The previous PR #23 approval at head 8e081a74eb3374756d7b911988ae730a4e7e3a5d is invalid after issue #22 bodyDigest changed to 83e1dc73048048e9353242379bd127a2aae8f0a1bca3eb62ff2c06b22b597c68. This proposal must be reviewed anew.
- Current evidence: ruleset 23998987 binds repository-controls to integration 15368 and trusted-acceptance to 5075466; PR tokens expose only Contents:read and Metadata:read; trusted publisher run 36191075115 reported online.available=false/rulesetCount=0; Publish Evidence run 36233334770 did not resolve PR #23 because its base is a stacked branch.
- Issue #20 remains blocked and its approved plan is not authority for this scope. If this task changes the shared base, issue #20 must be rebound and re-approved against the exact new base before scanner remediation.

## Risks
- A no-bypass bootstrap may be impossible because the current required context prevents merging the code that would produce the trusted replacement status; this must be proven before any external rule change.
- A trusted status on the wrong PR head, base or source run could satisfy an unintended branch policy; bind and re-read all identities.
- Rebinding the required context before the protected status producer works could block all merges; stage the rule mutation last and keep a verified rollback.
- A stale App audit or a PR-controlled report can misrepresent mutable settings; require a fresh trusted report and fail closed.
- The current publisher resolver's main-only base check blocks stacked PRs; any broader resolver must still require a same-repository PR and exact task-declared base.

## Rollback and escalation
- If the trusted publisher status is missing, stale, mismatched, or attributed to an unexpected integration, fail the check and do not rebind the ruleset.
- If the ruleset no-bypass bootstrap cannot be proven, make no settings change and request a separate explicit human decision; do not add a bypass actor or disable enforcement.
- If after an authorized rule change the status fails verification, restore only the original repository-controls integration_id 15368 and confirm the rest of ruleset 23998987 is unchanged.
- Stop after the same required policy/security check fails twice with the same normalized signature; no blind reruns.

<!-- northstar:plan-contract:start -->
```json
{
  "schema": "northstar/plan/1",
  "taskId": "AES-REPO-CONTROLS-EVIDENCE",
  "contractDigest": "83e1dc73048048e9353242379bd127a2aae8f0a1bca3eb62ff2c06b22b597c68",
  "baseSha": "2e3cd083399661947b98b420f66ce7a9523ca68b",
  "baseBranch": "agent/implement/aes-surface-evidence",
  "risk": "high",
  "objective": "Migrate the required `repository-controls` result from an unprivileged pull-request audit to a protected trusted-publisher audit, using the already configured trusted publisher App. Rebind only the existing required check to that trusted status source, preserve all other protections and the no-bypass policy, and prove a safe bootstrap/rollback path before changing the rule. Pull-request code must never receive administrator or secret-inventory credentials. If no no-bypass bootstrap is feasible, stop before changing the ruleset or implementation and report the exact additional human decision required.",
  "scope": {
    "allowed": [
      ".github/workflows/governed-change.yml",
      ".github/workflows/governance-review.yml",
      ".github/workflows/publish-evidence.yml",
      ".github/workflows/system-maintenance-approval.yml",
      "scripts/governance-audit.mjs",
      "scripts/resolve-workflow-run.mjs",
      "scripts/resolve-workflow-pr.mjs",
      "scripts/publish-acceptance-status.mjs",
      "tests/unit/governance-audit.test.ts",
      "tests/unit/resolve-workflow-run.test.ts",
      "tests/unit/resolve-workflow-pr.test.ts",
      "tests/unit/publish-acceptance-status.test.ts",
      "docs/architecture.md"
    ],
    "prohibited": [
      "src/**",
      "migrations/**",
      "package.json",
      "package-lock.json",
      ".github/governance/**",
      ".github/zizmor.yml",
      "all workflow files not listed under Allowed scope",
      "production resources or deployment",
      "all hosted settings except the single authorized binding change on repository ruleset 23998987: required context `repository-controls` integration_id 15368 to existing trusted publisher App integration_id 5075466",
      "any change to other required status contexts, their integration IDs, strict status policy, pull-request requirements, CODEOWNERS review, bypass actors, force-push/deletion rules, or protected environments",
      "creating/installing a new GitHub App, changing App installation permissions, generating keys, changing secrets, credentials, or account settings",
      "adding administrator or secret-inventory credentials to any pull_request job or PR-controlled process",
      "broadening pull_request GITHUB_TOKEN beyond minimal read access required to retrieve trusted evidence",
      "removing, renaming, weakening, or suppressing required repository-controls or other security checks",
      "trusting or executing artifacts produced by pull-request-controlled code as proof of external repository controls",
      "scanner suppressions, severity downgrades, or blanket ignore rules",
      "changes to issue #20's approved plan or scanner-remediation implementation"
    ]
  },
  "operations": [
    "workflow-change",
    "security-change"
  ],
  "steps": [
    "Reconfirm the live task digest, exact base SHA, active ruleset 23998987, required-check identities, strict policy and empty bypass list. Recheck only stored sanitized run evidence and App metadata; do not expose tokens or secret values.",
    "Before changing source or hosted settings, produce a no-bypass bootstrap design that can deploy and exercise trusted publisher status code while every current required check remains enforced. Model the actual branch protection and protected-environment sequence. If no such path exists, stop before implementation or ruleset mutation and report the exact additional human decision required.",
    "If a no-bypass bootstrap is proven, extend the resolver to validate the exact completed Governed Change source run/attempt, repository, event, associated same-repository PR, target base, live head, task/plan contract and artifact identity before importing any evidence. Support the declared stacked base; never check out or execute the PR branch in the privileged publisher.",
    "Run the online governance audit only in the trusted default-branch publisher using the existing protected trusted-publisher environment and existing App 5075466 permissions. Keep all administrator/secret-inventory credentials out of pull_request and PR-controlled processes. Fail closed for unavailable or incomplete online audit results.",
    "Have the protected publisher emit a repository-controls status through existing App 5075466 only after the audit and exact source identity checks succeed; publish failure for any mismatch or unavailable control. Bind the status to the exact validated PR head, source run/attempt, task/plan, and sanitized report/policy digests.",
    "Keep the PR-side repository-controls job read-only; it may validate the trusted publisher status/report provenance but must not run admin API reads or trust PR-produced audit artifacts. Add explicit regression tests for source-run and base-branch resolution, exact status creator/context/SHA, stale evidence, and hostile PR inputs.",
    "Only after the trusted publisher status is proven on the implementation candidate and the no-bypass bootstrap remains intact, update exactly ruleset 23998987 required context repository-controls from integration_id 15368 to existing App integration_id 5075466. Re-read the live ruleset immediately afterward and verify every other field, context, strict flag, and empty bypass list is unchanged.",
    "Run focused tests, npm run agentic:compile, npm run agentic:zizmor, npm run validate, npm run test:acceptance and npm run validate:all. Record exact command results and candidate SHA. Run hosted checks only after local validation; do not claim acceptance if any required check remains unavailable or failed."
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
      "statement": "PR-triggered code never receives administrator or secret-inventory credentials or privileged write permissions",
      "provenBy": "pull request workflows do not expose privileged governance credentials"
    },
    {
      "id": "AC2",
      "statement": "The trusted publisher emits repository-controls only for an exact verified source workflow run and PR head",
      "provenBy": "publishes repository controls only after exact source identity validation"
    },
    {
      "id": "AC3",
      "statement": "Missing, stale, mismatched, malformed, or PR-originated evidence remains unavailable/failing and is never represented as pass",
      "provenBy": "rejects mismatched trusted governance report provenance"
    },
    {
      "id": "AC4",
      "statement": "Ruleset 23998987 changes only the repository-controls integration to 5075466; all other protections and the empty bypass list remain intact",
      "provenBy": "preserves hosted-control and approval boundaries"
    },
    {
      "id": "AC5",
      "statement": "The no-bypass bootstrap reaches the trusted status producer without disabling required checks or adding a bypass actor",
      "provenBy": "verifies repository-controls no-bypass bootstrap"
    },
    {
      "id": "AC6",
      "statement": "The approved implementation passes focused and complete local validation and records exact hosted outcomes without overstating acceptance",
      "provenBy": "records complete validation for trusted control evidence"
    }
  ],
  "evidence": [
    "Live ruleset 23998987 before/after snapshots limited to the required-context integration binding, strict policy and bypass actors; no unrelated settings or secret values.",
    "Source-run resolver outputs binding repository, exact workflow/event/run/attempt, PR, base/head, task/plan digest and report identity.",
    "Positive and negative tests for trusted status provenance, source-run mismatch, stacked-base resolution, stale/missing report, PR-originated artifacts and no-bypass bootstrap.",
    "Protected publisher workflow run, status context integration_id 5075466 on exact PR head, trusted governance report digest and successful repository-controls job.",
    "Focused and full local command outputs, exact test counts, PostgreSQL result when required by changed process boundaries, candidate SHA and hosted run URLs.",
    "If the no-bypass bootstrap is impossible, a bounded blocked report naming the exact external action required; no code or ruleset mutation is performed."
  ],
  "decisionsAndHandoffs": [
    "The repository owner explicitly authorized the narrow scope expansion on 2026-09-26: one ruleset 23998987 context rebind from Actions 15368 to existing trusted publisher App 5075466, plus protected trusted status publication. The owner did not authorize bypass actors, new Apps, keys, permissions, or other settings changes.",
    "The previous PR #23 approval at head 8e081a74eb3374756d7b911988ae730a4e7e3a5d is invalid after issue #22 bodyDigest changed to 83e1dc73048048e9353242379bd127a2aae8f0a1bca3eb62ff2c06b22b597c68. This proposal must be reviewed anew.",
    "Current evidence: ruleset 23998987 binds repository-controls to integration 15368 and trusted-acceptance to 5075466; PR tokens expose only Contents:read and Metadata:read; trusted publisher run 36191075115 reported online.available=false/rulesetCount=0; Publish Evidence run 36233334770 did not resolve PR #23 because its base is a stacked branch.",
    "Issue #20 remains blocked and its approved plan is not authority for this scope. If this task changes the shared base, issue #20 must be rebound and re-approved against the exact new base before scanner remediation."
  ],
  "risks": [
    "A no-bypass bootstrap may be impossible because the current required context prevents merging the code that would produce the trusted replacement status; this must be proven before any external rule change.",
    "A trusted status on the wrong PR head, base or source run could satisfy an unintended branch policy; bind and re-read all identities.",
    "Rebinding the required context before the protected status producer works could block all merges; stage the rule mutation last and keep a verified rollback.",
    "A stale App audit or a PR-controlled report can misrepresent mutable settings; require a fresh trusted report and fail closed.",
    "The current publisher resolver's main-only base check blocks stacked PRs; any broader resolver must still require a same-repository PR and exact task-declared base."
  ],
  "rollbackAndEscalation": [
    "If the trusted publisher status is missing, stale, mismatched, or attributed to an unexpected integration, fail the check and do not rebind the ruleset.",
    "If the ruleset no-bypass bootstrap cannot be proven, make no settings change and request a separate explicit human decision; do not add a bypass actor or disable enforcement.",
    "If after an authorized rule change the status fails verification, restore only the original repository-controls integration_id 15368 and confirm the rest of ruleset 23998987 is unchanged.",
    "Stop after the same required policy/security check fails twice with the same normalized signature; no blind reruns."
  ],
  "planDigest": "bec47dd5c87a1575f3d4197ab65ecfd07c4debc62e8fb848e4eedb87970e97d3"
}
```
<!-- northstar:plan-contract:end -->
