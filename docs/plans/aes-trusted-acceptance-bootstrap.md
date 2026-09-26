# Plan: AES-TRUSTED-ACCEPTANCE-BOOTSTRAP

## Objective
Safely bootstrap trusted-acceptance publication for same-repository stacked PRs without exposing publisher credentials to pull-request code. If needed, use one explicitly approved, time-bounded bootstrap window that removes only the `repository-controls` and `trusted-acceptance` required-context entries from ruleset 23998987 for at most 60 minutes, while keeping every other required check, strict mode, pull-request review, CODEOWNERS review, and the empty bypass list unchanged. The `evidence` check must remain truthful and must not claim `ready_for_acceptance` while either trusted status is absent. Restore both contexts after the protected publisher can produce and validate the trusted statuses. If the remaining checks cannot safely carry the migration, stop without changing settings.

## Plan
Risk: high. Base: `agent/implement/aes-surface-evidence` at `2e3cd083399661947b98b420f66ce7a9523ca68b`. This replaces the previous plan after the owner authorized a bounded two-context bootstrap to be planned. The prior PR #25 approval is invalid. No implementation or ruleset mutation is authorized until this exact plan revision receives independent approval.

### Current failure evidence
- Protected publisher run `36236293245` failed resolving the approved stacked PR because it requires a PR targeting `main`; the PR base is `agent/implement/aes-surface-evidence`.
- The required `trusted-acceptance` result is absent for the exact approved head.
- Existing ruleset `23998987`: `repository-controls` -> Actions integration `15368`; `trusted-acceptance` -> trusted publisher App `5075466`; strict checks and empty bypass list.

### Bounded bootstrap
- The only planned exception is removal of exactly `repository-controls` and `trusted-acceptance` for **no more than 60 minutes**.
- Keep `evidence`, all other required checks, strict mode, PR review, CODEOWNERS, protected environments and the empty bypass list unchanged.
- During the window, `evidence` must not report `ready_for_acceptance` while either trusted status is absent.
- Preflight must show every remaining check can pass, unrelated main merges are paused, and the publisher plus rollback are ready. Otherwise do not start.
- Restore `repository-controls` -> App `5075466` and `trusted-acceptance` -> App `5075466`; compare exact before/after state. On any failure, restore original state, including `repository-controls` -> `15368`, immediately.

### Planned implementation
1. Add exact stacked-base PR/source-run resolution in trusted default-branch publisher code; no PR checkout or execution.
2. Validate repository, workflow, event, run/attempt, PR, base/head, task/plan, report/policy digest and freshness before imports/statuses.
3. Publish the trusted statuses from App `5075466` only after a fresh `ready_for_acceptance` report.
4. Add positive/negative tests, run focused and complete validation, then use the narrowly bounded bootstrap only if all preflight gates pass.
5. If the publisher still cannot be deployed without violating remaining controls, stop and restore without merging or bypass.

## Scope and files to change
- `.github/workflows/governed-change.yml`
- `.github/workflows/publish-evidence.yml`
- `.github/workflows/system-maintenance-approval.yml`
- `scripts/resolve-workflow-pr.mjs`
- `scripts/resolve-workflow-run.mjs`
- `scripts/publish-acceptance-status.mjs`
- `scripts/select-execution-plan.mjs`
- `scripts/build-execution-report.mjs`
- `tests/unit/resolve-workflow-pr.test.ts`
- `tests/unit/resolve-workflow-run.test.ts`
- `tests/unit/publish-acceptance-status.test.ts`
- `tests/unit/build-execution-report.test.ts`
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
- `all hosted settings except the single authorized bootstrap operation on ruleset 23998987: temporarily remove only `repository-controls` and `trusted-acceptance` required-context entries for at most 60 minutes, then restore both; no other ruleset or environment changes`
- `any changes to other required status contexts, their integration IDs, strict status policy, pull-request requirements, CODEOWNERS review, bypass actors, force-push/deletion rules, or protected environments`
- `creating/installing a new GitHub App, changing App installation permissions, generating keys, changing secrets, credentials, or account settings`
- `adding administrator or secret-inventory credentials to any pull_request job or PR-controlled process`
- `broadening pull_request GITHUB_TOKEN beyond minimal read access required to retrieve trusted run metadata`
- `trusting or executing artifacts produced by pull-request-controlled code as proof of external repository controls`
- `claiming `ready_for_acceptance` while trusted statuses are absent, failed, stale, or mismatched`
- `scanner suppressions, severity downgrades, or blanket ignore rules`
- `changes to issue #20's approved plan or issue #22's ruleset/bootstrap scope`
- `merging or approving this implementation PR or any other PR`

## Success criteria
- AC1 | The trusted publisher resolves exact same-repository stacked PRs from immutable workflow-run identity without executing PR code | resolves stacked same-repository PR bases
- AC2 | `trusted-acceptance` is emitted only by App 5075466 for the exact current PR head after the trusted report is `ready_for_acceptance` | publishes trusted acceptance only for validated head
- AC3 | Missing, stale, failed, or mismatched evidence never produces success and migration evidence never claims acceptance | rejects stale publisher run provenance
- AC4 | The bootstrap removes only the two named contexts for at most 60 minutes, preserves `evidence` and all other requirements, adds no bypass actor, and restores the contexts | preserves hosted-control and approval boundaries
- AC5 | PR workflows receive no privileged credentials and the protected publisher never checks out or executes PR code | publisher never executes pull request code
- AC6 | The implementation passes focused/full validation and records exact hosted status identity and ruleset restoration | records complete trusted-acceptance validation

## Evidence
- Exact pre-window, intermediate and restored ruleset 23998987 snapshots; all excluded fields/context identities, strict mode, and empty bypass actor list preserved.
- Preflight record showing every remaining required check including `evidence` is available/passing and unrelated main merges are paused for the single window.
- Positive/negative resolver output binding repository, source workflow/event/run/attempt, unique PR, base/head, task/plan, artifact/report/policy digests and freshness.
- Protected publisher logs and commit status API responses proving trusted-acceptance and repository-controls originated from App 5075466 and target the exact PR head after ready_for_acceptance.
- Exact start/end timestamps proving the two-context exception lasted less than 60 minutes; rollback evidence if any precondition fails.
- Focused/full validation commands, exit codes, counts, PostgreSQL evidence if applicable, exact candidate SHA and hosted run links.

## Decisions and handoffs
- The owner authorized planning a one-time temporary removal of only repository-controls and trusted-acceptance for at most 60 minutes. This is planning scope only; the current plan requires a fresh independent approval after the issue amendment before any settings change.
- Issue #24 body digest is 500b3c0381ca079651b2197b1f91a35d03631311d9024022e84d84ec695caefe; its prior plan PR #25 head 0987c84bbf2aaa5a1f6be8193c1af8148cbb6661 was approved but that approval is invalid after the issue amendment.
- Current ruleset 23998987 binds repository-controls to 15368 and trusted-acceptance to 5075466. Publisher run 36236293245 failed on stacked PR #23 because the current resolver only accepts a main base. The exact approved plan #25 head 0987c84 also has no trusted-acceptance status.
- No status, ruleset, code, credential, or bypass mutation has yet been made under issue #24. Issue #22 depends on #24; issue #20 remains blocked.

## Risks
- Temporarily removing two required contexts reduces protection; retain every other requirement, keep the window under 60 minutes, pause unrelated main merges, and restore immediately on any deviation.
- The `evidence` check could incorrectly claim ready_for_acceptance while trusted contexts are intentionally absent; tests and fail-closed report policy must prevent that.
- Publisher status on the wrong head/run/plan could satisfy protection incorrectly; bind all immutable identities and verify App creator integration.
- The trusted publisher update may not be deployable because the exact PR cannot receive trusted-acceptance before publisher deployment; the preflight may therefore still fail.
- A concurrent ruleset edit or unrelated PR merge during the window could invalidate rollback; compare exact snapshots and stop on drift.

## Rollback and escalation
- Never start the window unless all preflight conditions pass, `evidence` stays required, unrelated main merges are paused and rollback is ready.
- On any failure or time pressure, restore both original entries: repository-controls integration 15368 and trusted-acceptance integration 5075466. Re-read all rules and confirm strict mode and empty bypass list.
- Never add bypass actors, disable ruleset enforcement, lower strictness, remove `evidence`, expose credentials to PR code, or extend the window.
- If exact restoration cannot be verified immediately, stop every other operation and escalate to the repository owner; do not represent acceptance as complete.

<!-- northstar:plan-contract:start -->
```json
{
  "schema": "northstar/plan/1",
  "taskId": "AES-TRUSTED-ACCEPTANCE-BOOTSTRAP",
  "contractDigest": "500b3c0381ca079651b2197b1f91a35d03631311d9024022e84d84ec695caefe",
  "baseSha": "2e3cd083399661947b98b420f66ce7a9523ca68b",
  "baseBranch": "agent/implement/aes-surface-evidence",
  "risk": "high",
  "objective": "Safely bootstrap trusted-acceptance publication for same-repository stacked PRs without exposing publisher credentials to pull-request code. If needed, use one explicitly approved, time-bounded bootstrap window that removes only the `repository-controls` and `trusted-acceptance` required-context entries from ruleset 23998987 for at most 60 minutes, while keeping every other required check, strict mode, pull-request review, CODEOWNERS review, and the empty bypass list unchanged. The `evidence` check must remain truthful and must not claim `ready_for_acceptance` while either trusted status is absent. Restore both contexts after the protected publisher can produce and validate the trusted statuses. If the remaining checks cannot safely carry the migration, stop without changing settings.",
  "scope": {
    "allowed": [
      ".github/workflows/governed-change.yml",
      ".github/workflows/publish-evidence.yml",
      ".github/workflows/system-maintenance-approval.yml",
      "scripts/resolve-workflow-pr.mjs",
      "scripts/resolve-workflow-run.mjs",
      "scripts/publish-acceptance-status.mjs",
      "scripts/select-execution-plan.mjs",
      "scripts/build-execution-report.mjs",
      "tests/unit/resolve-workflow-pr.test.ts",
      "tests/unit/resolve-workflow-run.test.ts",
      "tests/unit/publish-acceptance-status.test.ts",
      "tests/unit/build-execution-report.test.ts",
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
      "all hosted settings except the single authorized bootstrap operation on ruleset 23998987: temporarily remove only `repository-controls` and `trusted-acceptance` required-context entries for at most 60 minutes, then restore both; no other ruleset or environment changes",
      "any changes to other required status contexts, their integration IDs, strict status policy, pull-request requirements, CODEOWNERS review, bypass actors, force-push/deletion rules, or protected environments",
      "creating/installing a new GitHub App, changing App installation permissions, generating keys, changing secrets, credentials, or account settings",
      "adding administrator or secret-inventory credentials to any pull_request job or PR-controlled process",
      "broadening pull_request GITHUB_TOKEN beyond minimal read access required to retrieve trusted run metadata",
      "trusting or executing artifacts produced by pull-request-controlled code as proof of external repository controls",
      "claiming `ready_for_acceptance` while trusted statuses are absent, failed, stale, or mismatched",
      "scanner suppressions, severity downgrades, or blanket ignore rules",
      "changes to issue #20's approved plan or issue #22's ruleset/bootstrap scope",
      "merging or approving this implementation PR or any other PR"
    ]
  },
  "operations": [
    "workflow-change",
    "security-change"
  ],
  "steps": [
    "Reconfirm the live issue digest, exact base, ruleset 23998987 fields/context integration IDs, strict mode, empty bypass list, exact code-owner/review requirements, trusted publisher App identity, protected environment, and publisher-run failure. Store an exact before-state snapshot and do not mutate settings.",
    "Implement and locally validate the resolver and publisher logic first on an isolated branch. Resolve only a completed allowed source workflow run/attempt from this repository and uniquely map it to an open same-repository PR whose current immutable head/base match the live task/plan. Support stacked bases from trusted metadata without requiring `main`; never check out or execute PR code.",
    "Keep privileged online controls, artifacts and status creation entirely in protected default-branch publisher code using the existing protected environment/App. Pull-request jobs remain read-only. The publisher must revalidate the task, approved plan, human review, scope, report digest and freshness before status publication.",
    "Before any ruleset update, preflight the exact implementation PR: all checks that will remain required must be passing and demonstrated to run; `evidence` must remain required and yield at most `ready_for_review` while either trusted context is absent; unrelated main merges must be paused; the publisher route and rollback command must be ready. Abort if any condition is not met.",
    "Only after preflight, open a single maximum-60-minute maintenance window and remove exactly `repository-controls` and `trusted-acceptance` context entries from ruleset 23998987. Keep `evidence`, all other contexts, strict mode, PR review, CODEOWNERS, empty bypass actors and environments unchanged. Record the start time and exact intermediate ruleset.",
    "Deploy/activate the already-reviewed trusted publisher implementation through the approved protected route without merging unreviewed PR code. Run the trusted source-run validator against the exact PR/run/attempt and require the report to be `ready_for_acceptance`; publish `trusted-acceptance` from App 5075466 to that exact PR head.",
    "Once the trusted-acceptance status is independently verified on the exact head, publish `repository-controls` from App 5075466 only if the trusted online governance audit is complete and ready, likewise bound to the exact source run/report/policy. Do not fabricate either status or reuse a stale report.",
    "Restore both required contexts immediately: repository-controls -> App 5075466; trusted-acceptance remains App 5075466. Re-read ruleset 23998987 and byte-for-byte compare all unrelated rules, integration IDs, strict flag, empty bypass list and target/conditions to the saved baseline. Close the window under 60 minutes and resume normal merge flow.",
    "If any required check fails, source identity becomes ambiguous, status creator/head is wrong, evidence is not ready_for_acceptance, the ruleset drifts, or the 60-minute deadline is at risk, immediately restore exactly the prior required contexts (repository-controls integration 15368, trusted-acceptance integration 5075466), verify all other rules unchanged, and stop.",
    "Add focused positive/negative tests for stacked bases, source run/attempt/workflow/event, task/plan/head/report, stale evidence, status App/context/commit binding, migration readiness state, and proof that PR code never executes in the publisher. Run focused tests, npm run agentic:compile, npm run agentic:zizmor, npm run validate, npm run test:acceptance and npm run validate:all. Record exact results and candidate SHA."
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
      "statement": "The trusted publisher resolves exact same-repository stacked PRs from immutable workflow-run identity without executing PR code",
      "provenBy": "resolves stacked same-repository PR bases"
    },
    {
      "id": "AC2",
      "statement": "`trusted-acceptance` is emitted only by App 5075466 for the exact current PR head after the trusted report is `ready_for_acceptance`",
      "provenBy": "publishes trusted acceptance only for validated head"
    },
    {
      "id": "AC3",
      "statement": "Missing, stale, failed, or mismatched evidence never produces success and migration evidence never claims acceptance",
      "provenBy": "rejects stale publisher run provenance"
    },
    {
      "id": "AC4",
      "statement": "The bootstrap removes only the two named contexts for at most 60 minutes, preserves `evidence` and all other requirements, adds no bypass actor, and restores the contexts",
      "provenBy": "preserves hosted-control and approval boundaries"
    },
    {
      "id": "AC5",
      "statement": "PR workflows receive no privileged credentials and the protected publisher never checks out or executes PR code",
      "provenBy": "publisher never executes pull request code"
    },
    {
      "id": "AC6",
      "statement": "The implementation passes focused/full validation and records exact hosted status identity and ruleset restoration",
      "provenBy": "records complete trusted-acceptance validation"
    }
  ],
  "evidence": [
    "Exact pre-window, intermediate and restored ruleset 23998987 snapshots; all excluded fields/context identities, strict mode, and empty bypass actor list preserved.",
    "Preflight record showing every remaining required check including `evidence` is available/passing and unrelated main merges are paused for the single window.",
    "Positive/negative resolver output binding repository, source workflow/event/run/attempt, unique PR, base/head, task/plan, artifact/report/policy digests and freshness.",
    "Protected publisher logs and commit status API responses proving trusted-acceptance and repository-controls originated from App 5075466 and target the exact PR head after ready_for_acceptance.",
    "Exact start/end timestamps proving the two-context exception lasted less than 60 minutes; rollback evidence if any precondition fails.",
    "Focused/full validation commands, exit codes, counts, PostgreSQL evidence if applicable, exact candidate SHA and hosted run links."
  ],
  "decisionsAndHandoffs": [
    "The owner authorized planning a one-time temporary removal of only repository-controls and trusted-acceptance for at most 60 minutes. This is planning scope only; the current plan requires a fresh independent approval after the issue amendment before any settings change.",
    "Issue #24 body digest is 500b3c0381ca079651b2197b1f91a35d03631311d9024022e84d84ec695caefe; its prior plan PR #25 head 0987c84bbf2aaa5a1f6be8193c1af8148cbb6661 was approved but that approval is invalid after the issue amendment.",
    "Current ruleset 23998987 binds repository-controls to 15368 and trusted-acceptance to 5075466. Publisher run 36236293245 failed on stacked PR #23 because the current resolver only accepts a main base. The exact approved plan #25 head 0987c84 also has no trusted-acceptance status.",
    "No status, ruleset, code, credential, or bypass mutation has yet been made under issue #24. Issue #22 depends on #24; issue #20 remains blocked."
  ],
  "risks": [
    "Temporarily removing two required contexts reduces protection; retain every other requirement, keep the window under 60 minutes, pause unrelated main merges, and restore immediately on any deviation.",
    "The `evidence` check could incorrectly claim ready_for_acceptance while trusted contexts are intentionally absent; tests and fail-closed report policy must prevent that.",
    "Publisher status on the wrong head/run/plan could satisfy protection incorrectly; bind all immutable identities and verify App creator integration.",
    "The trusted publisher update may not be deployable because the exact PR cannot receive trusted-acceptance before publisher deployment; the preflight may therefore still fail.",
    "A concurrent ruleset edit or unrelated PR merge during the window could invalidate rollback; compare exact snapshots and stop on drift."
  ],
  "rollbackAndEscalation": [
    "Never start the window unless all preflight conditions pass, `evidence` stays required, unrelated main merges are paused and rollback is ready.",
    "On any failure or time pressure, restore both original entries: repository-controls integration 15368 and trusted-acceptance integration 5075466. Re-read all rules and confirm strict mode and empty bypass list.",
    "Never add bypass actors, disable ruleset enforcement, lower strictness, remove `evidence`, expose credentials to PR code, or extend the window.",
    "If exact restoration cannot be verified immediately, stop every other operation and escalate to the repository owner; do not represent acceptance as complete."
  ],
  "planDigest": "c98c8036d7f6160d6f6191c1a818ac1742cd9d3d9c2202944264e0130a0f6b8a"
}
```
<!-- northstar:plan-contract:end -->
