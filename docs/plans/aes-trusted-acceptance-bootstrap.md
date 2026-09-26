# Plan: AES-TRUSTED-ACCEPTANCE-BOOTSTRAP

## Objective
Safely bootstrap trusted-acceptance publication for same-repository stacked PRs without exposing publisher credentials to pull-request code. During ordinary processing, require the PR to be open. For the single approved migration only, permit protected-default-branch workflow_dispatch to process the exact merged migration PR after verifying source run/attempt, repository, workflow/event, original head/base, merge commit, task and plan. Publish `trusted-acceptance` on the validated original PR head from App 5075466. Temporarily restore `repository-controls` to its original Actions integration 15368; issue #22 separately owns any later rebind.

## Plan
Risk: high. Base: `agent/implement/aes-surface-evidence` at `2e3cd083399661947b98b420f66ce7a9523ca68b`. The plan-only PR and child implementation PR use the active parent task branch; the temporary main-ruleset window applies only to parent PR #18 after child work is integrated. This replaces the prior main-based proposal. The previous PR #25 approval is invalid. No implementation or setting mutation is authorized until this exact revision is independently approved.

### Parent bootstrap sequence
- Child implementation PR: base `agent/implement/aes-surface-evidence` at the approved SHA; merge into the parent only through human review.
- Main bootstrap PR: parent PR #18 after issue #24 and dependent work are integrated. Preflight all remaining contexts and evidence.
- Temporarily remove only repository-controls and trusted-acceptance for at most 60 minutes; keep evidence, all other checks, strictness, review, CODEOWNERS, environments, and no-bypass policy.
- After the parent PR merges, dispatch the protected publisher on main with exact source run/attempt. Validate merged PR metadata and publish trusted-acceptance from App 5075466 to the original PR head.
- Restore repository-controls to Actions 15368 and trusted-acceptance to App 5075466; issue #22 owns the later repository-controls rebind.

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
- Exact parent base SHA and plan approval; ruleset 23998987 before/during/after snapshots proving only the two named contexts were temporarily absent, all other requirements unchanged, strict mode true, and no bypass actors.
- Preflight record for parent PR #18: all remaining status checks pass, evidence is truthful, unrelated main merges are paused, and rollback is ready.
- Resolver output binding source workflow/event/run/attempt, same-repository parent PR, original head/base, merge commit, task/plan, report digest and freshness.
- Protected main workflow_dispatch run and API status records proving trusted-acceptance was written by App 5075466 to the exact original PR head after ready_for_acceptance.
- Post-window state proving repository-controls restored to 15368 and trusted-acceptance restored to 5075466 with all other rules unchanged and no bypass actor.
- Focused/full validation command outputs, exit codes, test counts, PostgreSQL result when relevant, candidate SHA and hosted URLs; if preflight fails, a blocked report and unchanged ruleset.

## Decisions and handoffs
- The owner authorized a one-time maximum-60-minute removal of exactly repository-controls and trusted-acceptance for planning. This plan is bound to the parent task branch at 2e3cd083399661947b98b420f66ce7a9523ca68b; the eventual settings window applies to parent PR #18, not the child implementation PR.
- Issue #24 has a separate implementation branch/PR targeting the parent task branch; a human must integrate the reviewed child change into the parent PR. The agent does not merge.
- Current main is b65c2de5c8224342c72c37eeed7ef9f965ad8a2c; current parent PR #18 head is 2e3cd083399661947b98b420f66ce7a9523ca68b. Any move of the parent base/head invalidates this plan.
- Current ruleset identity remains repository-controls 15368 and trusted-acceptance 5075466 at the end of this task. Issue #22 owns any later repository-controls rebind.
- Issue #24 is a prerequisite for #22 and #20; refresh dependent plans and obtain new approvals after shared-base changes.

## Risks
- Temporarily removing two required contexts reduces protection; keep all remaining gates enforced, pause unrelated main merges, cap the window at 60 minutes and restore immediately on deviation.
- The main-target parent PR may not reach ready_for_review or may have other unproven criteria; preflight must fail closed and the window must not start.
- A post-merge source run may not match the live merged PR/base/merge commit; reject any mismatch and do not publish success.
- A trusted status on the wrong original head/run/plan could satisfy an unintended commit; bind and re-read all identities.
- Acceptance tests have previously collided on a shared PostgreSQL type/schema; resolve only within approved scope or treat as a validation blocker, never relabel as pass.

## Rollback and escalation
- Never start the window unless the exact parent PR #18 head/base, all remaining passing checks, evidence behavior, unrelated-merge pause and rollback procedure are confirmed.
- On any failure, restore repository-controls integration 15368 and trusted-acceptance integration 5075466, confirm all other protections and empty bypass list, and stop.
- Never add bypass actors, disable ruleset enforcement, lower strictness, remove evidence, expose credentials to PR code or exceed 60 minutes.
- If exact restoration cannot be verified immediately, stop all other operations and escalate to the repository owner.

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
    "Reconfirm the live issue digest, exact parent base 2e3cd083399661947b98b420f66ce7a9523ca68b, ruleset 23998987 identities, strict mode, empty bypass list, and protected environment/App identities. The plan PR and child implementation PR must target the parent task branch so its plan-only guard and task controls are active.",
    "Implement and locally validate the resolver/publisher on an isolated child branch from the approved parent base. Its PR targets `agent/implement/aes-surface-evidence`; the eventual 60-minute ruleset window applies only to the parent control-plane PR #18 targeting main after child code and dependent changes are human-reviewed and integrated.",
    "Normal source-run resolution requires one open same-repository PR for the exact run head and declared base. The single bootstrap workflow_dispatch may process only the exact merged parent PR, and must verify merged=true, merge_commit_sha, source run/attempt, original head/base, task, plan and artifacts.",
    "Keep trusted publisher code on protected default-branch execution. Use workflow_dispatch on main with untrusted source-run-id/attempt inputs, validate all provenance before artifact download/import, and never check out or execute PR code in the privileged publisher.",
    "For a merged bootstrap PR, use source-run metadata captured before merge as the immutable original base/head, verify the live merged PR and merge commit ancestry, and target status at the original validated PR head. Revalidate task/plan approval, scope, human review, source artifacts, governance report and `ready_for_acceptance` before emitting trusted-acceptance from App 5075466.",
    "Preflight the parent PR #18 before any rule change: all checks that remain required must pass, evidence must be required and truthfully report at most `ready_for_review` while trusted contexts are absent, no unrelated main merge may be in flight, and publisher/rollback must be ready.",
    "Only after preflight, use one maximum-60-minute window on ruleset 23998987 for parent PR #18: remove exactly repository-controls and trusted-acceptance entries, preserving evidence, all other contexts, strict mode, PR review, CODEOWNERS, environments, and the empty bypass list.",
    "Merge parent PR #18 through the normal human-reviewed path; the agent does not merge. After merge, dispatch the protected publisher from main with the exact source run ID/attempt, validate the merged parent PR and original source head/base/merge commit, publish trusted-acceptance from App 5075466 on the original head, then restore repository-controls to Actions integration 15368 and trusted-acceptance to App 5075466.",
    "Read ruleset 23998987 before/during/after and verify every other rule, context, integration, strict flag, and empty bypass list is unchanged. If any publisher or evidence step fails or the deadline is at risk, restore both original context identities immediately and stop.",
    "Add positive and negative tests for open/stacked and merged PR source resolution, original base/head snapshots, merge-commit ancestry, run/attempt/task/plan/artifact binding, status target and App creator, and ready_for_review vs ready_for_acceptance behavior. Run focused tests, npm run agentic:compile, npm run agentic:zizmor, npm run validate, npm run test:acceptance and npm run validate:all; record exact outcomes, test counts, PostgreSQL result and candidate SHA."
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
    "Exact parent base SHA and plan approval; ruleset 23998987 before/during/after snapshots proving only the two named contexts were temporarily absent, all other requirements unchanged, strict mode true, and no bypass actors.",
    "Preflight record for parent PR #18: all remaining status checks pass, evidence is truthful, unrelated main merges are paused, and rollback is ready.",
    "Resolver output binding source workflow/event/run/attempt, same-repository parent PR, original head/base, merge commit, task/plan, report digest and freshness.",
    "Protected main workflow_dispatch run and API status records proving trusted-acceptance was written by App 5075466 to the exact original PR head after ready_for_acceptance.",
    "Post-window state proving repository-controls restored to 15368 and trusted-acceptance restored to 5075466 with all other rules unchanged and no bypass actor.",
    "Focused/full validation command outputs, exit codes, test counts, PostgreSQL result when relevant, candidate SHA and hosted URLs; if preflight fails, a blocked report and unchanged ruleset."
  ],
  "decisionsAndHandoffs": [
    "The owner authorized a one-time maximum-60-minute removal of exactly repository-controls and trusted-acceptance for planning. This plan is bound to the parent task branch at 2e3cd083399661947b98b420f66ce7a9523ca68b; the eventual settings window applies to parent PR #18, not the child implementation PR.",
    "Issue #24 has a separate implementation branch/PR targeting the parent task branch; a human must integrate the reviewed child change into the parent PR. The agent does not merge.",
    "Current main is b65c2de5c8224342c72c37eeed7ef9f965ad8a2c; current parent PR #18 head is 2e3cd083399661947b98b420f66ce7a9523ca68b. Any move of the parent base/head invalidates this plan.",
    "Current ruleset identity remains repository-controls 15368 and trusted-acceptance 5075466 at the end of this task. Issue #22 owns any later repository-controls rebind.",
    "Issue #24 is a prerequisite for #22 and #20; refresh dependent plans and obtain new approvals after shared-base changes."
  ],
  "risks": [
    "Temporarily removing two required contexts reduces protection; keep all remaining gates enforced, pause unrelated main merges, cap the window at 60 minutes and restore immediately on deviation.",
    "The main-target parent PR may not reach ready_for_review or may have other unproven criteria; preflight must fail closed and the window must not start.",
    "A post-merge source run may not match the live merged PR/base/merge commit; reject any mismatch and do not publish success.",
    "A trusted status on the wrong original head/run/plan could satisfy an unintended commit; bind and re-read all identities.",
    "Acceptance tests have previously collided on a shared PostgreSQL type/schema; resolve only within approved scope or treat as a validation blocker, never relabel as pass."
  ],
  "rollbackAndEscalation": [
    "Never start the window unless the exact parent PR #18 head/base, all remaining passing checks, evidence behavior, unrelated-merge pause and rollback procedure are confirmed.",
    "On any failure, restore repository-controls integration 15368 and trusted-acceptance integration 5075466, confirm all other protections and empty bypass list, and stop.",
    "Never add bypass actors, disable ruleset enforcement, lower strictness, remove evidence, expose credentials to PR code or exceed 60 minutes.",
    "If exact restoration cannot be verified immediately, stop all other operations and escalate to the repository owner."
  ],
  "planDigest": "38d09e0a687612cc2e52743a70d4cc4bb750ccfe34d7e34206ddf35bd5b1e8f4"
}
```
<!-- northstar:plan-contract:end -->
