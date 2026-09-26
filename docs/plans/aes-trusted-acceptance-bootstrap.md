# Plan: AES-TRUSTED-ACCEPTANCE-BOOTSTRAP

## Objective
Safely bootstrap trusted-acceptance publication for same-repository stacked PRs without exposing publisher credentials to pull-request code. During ordinary processing, require the PR to be open. For the single approved migration only, permit protected-default-branch workflow_dispatch to process the exact merged migration PR after verifying source run/attempt, repository, workflow/event, original head/base, merge commit, task and plan. Publish `trusted-acceptance` on the validated original PR head from App 5075466. Temporarily restore `repository-controls` to its original Actions integration 15368; issue #22 separately owns any later rebind.

## Plan
Risk: high. Base: `agent/implement/aes-surface-evidence` at `2e3cd083399661947b98b420f66ce7a9523ca68b`. The plan-only PR and child implementation PR use the active parent task branch; the temporary main ruleset window applies only to the eventual parent PR #18 after child work is integrated. This replaces the prior main-based proposal. The previous PR #25 approval is invalid. No implementation or setting mutation is authorized until this exact revision is independently approved.

### Parent bootstrap sequence
- Child implementation PR: base `agent/implement/aes-surface-evidence` at the approved SHA; merge into the parent only through human review.
- Main bootstrap PR: parent PR #18 after issue #24 and dependent work are integrated. Preflight all remaining contexts and evidence.
- Temporarily remove only `repository-controls` and `trusted-acceptance` for at most 60 minutes; keep `evidence`, all other checks, strictness, review, CODEOWNERS, environments, and no bypass actors.
- After merge, dispatch the protected publisher from main with exact source run ID/attempt. Validate merged PR metadata and publish trusted-acceptance from App `5075466` to the original PR head.
- Restore repository-controls to Actions `15368` and trusted-acceptance to App `5075466`; issue #22 owns the later repository-controls rebind.

## Scope and files to change
- `scripts/import-evidence-artifacts.mjs`
- `scripts/check-scope.mjs`
- `scripts/publish-evidence.mjs`
- `tests/unit/import-evidence-artifacts.test.ts`
- `tests/unit/combined-workflow.test.ts`
- `tests/unit/execution-report.test.ts`
- `tests/unit/check-scope.test.ts`
- `tests/unit/publish-evidence.test.ts`
- `.github/workflows/governed-change.yml`
- `.github/workflows/publish-evidence.yml`
- `.github/workflows/system-maintenance-approval.yml`
- `scripts/resolve-workflow-pr.mjs`
- `scripts/resolve-workflow-run.mjs`
- `scripts/publish-acceptance-status.mjs`
- `scripts/import-evidence-artifacts.mjs`
- `scripts/check-scope.mjs`
- `scripts/publish-evidence.mjs`
- `tests/unit/import-evidence-artifacts.test.ts`
- `tests/unit/combined-workflow.test.ts`
- `tests/unit/execution-report.test.ts`
- `tests/unit/check-scope.test.ts`
- `tests/unit/publish-evidence.test.ts`
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
- `all hosted settings except the single authorized bootstrap operation on ruleset 23998987: temporarily remove only `repository-controls` and `trusted-acceptance` required-context entries for at most 60 minutes, then restore `repository-controls` to integration 15368 and `trusted-acceptance` to integration 5075466; no other ruleset or environment changes`
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
- AC1 | The publisher resolves exactly one same-repository PR for a stacked base and exact source head; it accepts a closed PR only for the authorized migration when source run and merge commit are validated | resolves stacked and merged same-repository PR bases
- AC2 | `trusted-acceptance` is emitted only by App 5075466 for the exact current PR head after the trusted report is `ready_for_acceptance` | publishes trusted acceptance only for validated head
- AC3 | Missing, stale, failed, or mismatched evidence never produces success and migration evidence never claims acceptance | rejects stale publisher run provenance
- AC4 | The bootstrap removes only the two named contexts for at most 60 minutes, preserves `evidence` and all other requirements, adds no bypass actor, and restores the original integrations 15368 and 5075466 | preserves hosted-control and approval boundaries
- AC5 | PR workflows receive no privileged credentials and the protected publisher never checks out or executes PR code | publisher never executes pull request code
- AC6 | The implementation passes focused/full validation and records exact hosted status identity and ruleset restoration | records complete trusted-acceptance validation

## Evidence
- Exact parent base SHA and plan approval; ruleset 23998987 before/during/after snapshots proving only the two named contexts were temporarily absent, all other rules unchanged, strict mode true and bypass actors empty.
- Preflight record for parent PR #18: all remaining status checks pass, evidence is truthful, unrelated main merges are paused, and publisher/rollback are ready.
- Resolver output binding source workflow/event/run/attempt, same-repository parent PR, original head/base, merge commit, task/plan, report digest and freshness.
- Protected main workflow_dispatch run and commit status proving trusted-acceptance was created by App 5075466 on the exact original PR head only after ready_for_acceptance.
- Post-window state proving repository-controls restored to integration 15368 and trusted-acceptance to integration 5075466; all other fields unchanged and no bypass actor.
- Focused/full validation outputs, exact test counts, candidate SHA and hosted run URLs; if preflight fails, a blocked report and unchanged ruleset.

## Decisions and handoffs
- The owner authorized the one-time maximum-60-minute removal of exactly repository-controls and trusted-acceptance for planning; this proposal is bound to the active parent branch at 2e3cd083399661947b98b420f66ce7a9523ca68b, and the setting window is only for parent PR #18 targeting main.
- The issue #24 child implementation PR targets the parent task branch; a human integrates reviewed child changes into the parent PR. The agent does not merge.
- Current main is b65c2de5c8224342c72c37eeed7ef9f965ad8a2c; parent PR #18 is based on main and currently at head 2e3cd083399661947b98b420f66ce7a9523ca68b. Any move of the parent base/head invalidates this proposal.
- Current final ruleset identities for this task remain repository-controls 15368 and trusted-acceptance 5075466. Issue #22 owns the later repository-controls rebind.
- Issue #24 is a prerequisite for #22, which is a prerequisite for #20; refresh dependent plans after shared-base changes.

## Risks
- Temporarily removing two required contexts reduces protection; retain every other context, pause unrelated main merges, cap the window at 60 minutes and restore immediately on deviation.
- The parent PR #18 may not reach ready_for_review or may have unproven criteria; the preflight must fail closed and the window must not start.
- The post-merge publisher may fail to validate the closed PR, source run or merge commit; no success status may be emitted on any mismatch.
- A trusted status on the wrong head/run/plan could satisfy an unintended commit; bind and re-read all identities.
- Concurrent ruleset edits or unrelated merges could invalidate rollback; abort on any drift.

## Rollback and escalation
- Never start the window unless the parent PR head/base, every remaining passing check, evidence behavior, pause on unrelated merges and rollback are confirmed.
- On any failure, restore repository-controls integration 15368 and trusted-acceptance integration 5075466, verify all other protections and empty bypass list, and stop.
- Never add a bypass actor, disable ruleset enforcement, lower strictness, remove evidence, expose credentials to PR code or exceed 60 minutes.
- If exact restoration cannot be verified immediately, stop all other actions and escalate to the repository owner.

<!-- northstar:plan-contract:start -->
```json
{
  "schema": "northstar/plan/1",
  "taskId": "AES-TRUSTED-ACCEPTANCE-BOOTSTRAP",
  "contractDigest": "6d0c378fd9872693865b3dbefe5b2e23f435dbdbf652a8f0fccc816045c1351e",
  "baseSha": "2e3cd083399661947b98b420f66ce7a9523ca68b",
  "baseBranch": "agent/implement/aes-surface-evidence",
  "risk": "high",
  "objective": "Safely bootstrap trusted-acceptance publication for same-repository stacked PRs without exposing publisher credentials to pull-request code. During ordinary processing, require the PR to be open. For the single approved migration only, permit protected-default-branch workflow_dispatch to process the exact merged migration PR after verifying source run/attempt, repository, workflow/event, original head/base, merge commit, task and plan. Publish `trusted-acceptance` on the validated original PR head from App 5075466. Temporarily restore `repository-controls` to its original Actions integration 15368; issue #22 separately owns any later rebind.",
  "scope": {
    "allowed": [
      "scripts/import-evidence-artifacts.mjs",
      "scripts/check-scope.mjs",
      "scripts/publish-evidence.mjs",
      "tests/unit/import-evidence-artifacts.test.ts",
      "tests/unit/combined-workflow.test.ts",
      "tests/unit/execution-report.test.ts",
      "tests/unit/check-scope.test.ts",
      "tests/unit/publish-evidence.test.ts",
      ".github/workflows/governed-change.yml",
      ".github/workflows/publish-evidence.yml",
      ".github/workflows/system-maintenance-approval.yml",
      "scripts/resolve-workflow-pr.mjs",
      "scripts/resolve-workflow-run.mjs",
      "scripts/publish-acceptance-status.mjs",
      "scripts/import-evidence-artifacts.mjs",
      "scripts/check-scope.mjs",
      "scripts/publish-evidence.mjs",
      "tests/unit/import-evidence-artifacts.test.ts",
      "tests/unit/combined-workflow.test.ts",
      "tests/unit/execution-report.test.ts",
      "tests/unit/check-scope.test.ts",
      "tests/unit/publish-evidence.test.ts",
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
      "all hosted settings except the single authorized bootstrap operation on ruleset 23998987: temporarily remove only `repository-controls` and `trusted-acceptance` required-context entries for at most 60 minutes, then restore `repository-controls` to integration 15368 and `trusted-acceptance` to integration 5075466; no other ruleset or environment changes",
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
    "Reconfirm the live task digest, exact parent base 2e3cd083399661947b98b420f66ce7a9523ca68b, ruleset 23998987 identities, strict mode, empty bypass list and protected App/environment identities. The plan-only PR and child implementation PR must target the active parent branch whose plan-only and task-contract guard is present.",
    "Implement and locally validate the resolver/publisher on an isolated child branch from the approved parent base. Its PR targets `agent/implement/aes-surface-evidence`; the temporary main ruleset window applies only to the main-target parent PR #18 after child code and dependent changes are reviewed and integrated.",
    "Normal source-run resolution requires one open same-repository PR for the exact run head and declared base. The single bootstrap workflow_dispatch may process only the exact merged parent PR and must verify merged=true, merge_commit_sha, source run/attempt, original head/base, task and plan.",
    "Use a protected-default-branch workflow_dispatch with source-run-id and source-run-attempt. Treat all inputs as untrusted; validate source workflow/event/repository/run/attempt/PR/base/head/merge/task/plan/artifact identity before import. Never check out or execute PR code in the publisher.",
    "For merged bootstrap validation, bind evidence to the source-run snapshot of the original base/head and the verified merge commit. Revalidate the committed plan, approval, scope, human review, source artifacts, and trusted online controls without comparing the original plan base to a mutable post-merge base ref.",
    "Keep privileged audit and status publication in the existing trusted-publisher environment using App 5075466. Publish trusted-acceptance on the exact original PR head only after a fresh report is ready_for_acceptance. Do not change repository-controls integration under this task; issue #22 owns its later rebind.",
    "Preflight the parent PR #18 before any rule change: all checks that will remain required must pass, evidence must remain required and truthfully report at most ready_for_review while trusted statuses are absent, unrelated main merges must be paused, and publisher/rollback must be ready. Abort if any condition fails.",
    "Only after preflight, start one maximum-60-minute window on parent PR #18 and remove exactly repository-controls and trusted-acceptance entries from ruleset 23998987. Keep evidence, every other context, strict mode, PR review, CODEOWNERS, environments and the empty bypass list unchanged.",
    "Merge parent PR #18 through the normal human-reviewed path; the agent does not merge. After merge, dispatch the protected publisher from main with the exact source run ID/attempt, validate the merged PR and original source head/base/merge commit, publish trusted-acceptance from App 5075466 on the original PR head, then restore repository-controls to Actions integration 15368 and trusted-acceptance to App 5075466.",
    "Read ruleset 23998987 before/during/after and verify every other field, context, strict setting and empty bypass list is unchanged. If any check fails, evidence is not ready_for_acceptance, source identity is ambiguous, status is wrong, ruleset drifts, or the deadline is at risk, immediately restore both original context identities and stop.",
    "Add positive and negative tests for open/stacked and merged PR resolution, original base/head snapshots, merge-commit ancestry, run/attempt/task/plan/artifact binding, status target and App creator, and ready_for_review versus ready_for_acceptance behavior. Run focused tests, npm run agentic:compile, npm run agentic:zizmor, npm run validate, npm run test:acceptance and npm run validate:all; record exact outcomes, test counts, PostgreSQL result and candidate SHA."
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
      "statement": "The publisher resolves exactly one same-repository PR for a stacked base and exact source head; it accepts a closed PR only for the authorized migration when source run and merge commit are validated",
      "provenBy": "resolves stacked and merged same-repository PR bases"
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
      "statement": "The bootstrap removes only the two named contexts for at most 60 minutes, preserves `evidence` and all other requirements, adds no bypass actor, and restores the original integrations 15368 and 5075466",
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
    "Exact parent base SHA and plan approval; ruleset 23998987 before/during/after snapshots proving only the two named contexts were temporarily absent, all other rules unchanged, strict mode true and bypass actors empty.",
    "Preflight record for parent PR #18: all remaining status checks pass, evidence is truthful, unrelated main merges are paused, and publisher/rollback are ready.",
    "Resolver output binding source workflow/event/run/attempt, same-repository parent PR, original head/base, merge commit, task/plan, report digest and freshness.",
    "Protected main workflow_dispatch run and commit status proving trusted-acceptance was created by App 5075466 on the exact original PR head only after ready_for_acceptance.",
    "Post-window state proving repository-controls restored to integration 15368 and trusted-acceptance to integration 5075466; all other fields unchanged and no bypass actor.",
    "Focused/full validation outputs, exact test counts, candidate SHA and hosted run URLs; if preflight fails, a blocked report and unchanged ruleset."
  ],
  "decisionsAndHandoffs": [
    "The owner authorized the one-time maximum-60-minute removal of exactly repository-controls and trusted-acceptance for planning; this proposal is bound to the active parent branch at 2e3cd083399661947b98b420f66ce7a9523ca68b, and the setting window is only for parent PR #18 targeting main.",
    "The issue #24 child implementation PR targets the parent task branch; a human integrates reviewed child changes into the parent PR. The agent does not merge.",
    "Current main is b65c2de5c8224342c72c37eeed7ef9f965ad8a2c; parent PR #18 is based on main and currently at head 2e3cd083399661947b98b420f66ce7a9523ca68b. Any move of the parent base/head invalidates this proposal.",
    "Current final ruleset identities for this task remain repository-controls 15368 and trusted-acceptance 5075466. Issue #22 owns the later repository-controls rebind.",
    "Issue #24 is a prerequisite for #22, which is a prerequisite for #20; refresh dependent plans after shared-base changes."
  ],
  "risks": [
    "Temporarily removing two required contexts reduces protection; retain every other context, pause unrelated main merges, cap the window at 60 minutes and restore immediately on deviation.",
    "The parent PR #18 may not reach ready_for_review or may have unproven criteria; the preflight must fail closed and the window must not start.",
    "The post-merge publisher may fail to validate the closed PR, source run or merge commit; no success status may be emitted on any mismatch.",
    "A trusted status on the wrong head/run/plan could satisfy an unintended commit; bind and re-read all identities.",
    "Concurrent ruleset edits or unrelated merges could invalidate rollback; abort on any drift."
  ],
  "rollbackAndEscalation": [
    "Never start the window unless the parent PR head/base, every remaining passing check, evidence behavior, pause on unrelated merges and rollback are confirmed.",
    "On any failure, restore repository-controls integration 15368 and trusted-acceptance integration 5075466, verify all other protections and empty bypass list, and stop.",
    "Never add a bypass actor, disable ruleset enforcement, lower strictness, remove evidence, expose credentials to PR code or exceed 60 minutes.",
    "If exact restoration cannot be verified immediately, stop all other actions and escalate to the repository owner."
  ],
  "planDigest": "dd74662a2151dbb66b5fe91c47b2d08145b2652c3812fa70a0fb11aabc4c71be"
}
```
<!-- northstar:plan-contract:end -->
