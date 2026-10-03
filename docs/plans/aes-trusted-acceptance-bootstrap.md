# Plan: AES-TRUSTED-ACCEPTANCE-BOOTSTRAP

## Objective
Safely bootstrap trusted-acceptance publication for same-repository stacked PRs without exposing publisher credentials to pull-request code. During ordinary processing, require the PR to be open. For the single approved migration only, permit protected-default-branch workflow_dispatch to process the exact merged migration PR after verifying source run/attempt, repository, workflow/event, original head/base, merge commit, task and plan. After the parent merge, first restore repository-controls to its original Actions integration 15368 and trusted-acceptance to App 5075466, then run the trusted online audit and publish `trusted-acceptance` on the validated original PR head only if the report is ready_for_acceptance. Issue #22 separately owns any later repository-controls rebind.

## Plan
Risk: high. Base: agent/implement/aes-surface-evidence at 2ce3cf8a69439c22246de7d5449ce186e23bd584. Live Issue #24 contract digest: 8763c017e195fc22c2a4b4c3347ad961616eeaa8ee56029a72c2f315e33bf01c. The amended contract requires an exact-base/candidate pinned Zizmor 1.30.0 comparison and no new findings. PR #25's previous approval is bound to 2d25fc79ffff1aecd2fef10787233865a54a06d0e96a8313a87fa46c6ca70936 and is not valid for this revision; fresh independent native approval is required. This proposal authorizes no settings mutation or PR merge by itself.

### Current parent and child status
- Parent PR #18 is at 2ce3cf8a69439c22246de7d5449ce186e23bd584 on base b65c2de5c8224342c72c37eeed7ef9f965ad8a2c; review decision REVIEW_REQUIRED; current failing checks: repository-controls, human-review, evidence.
- Child PR #28 is at cb507e20cd0cb8fdeabfedaece67510a651757b0 on base 2ce3cf8a69439c22246de7d5449ce186e23bd584; draft=true; review decision APPROVED; current failing checks: dependency-review, repository-controls, human-review, evidence. These are blockers, not acceptance.
- PR #25 is at 1c67b1106f9a8f2a94dfe62185ada6e7b679e24b, draft=true, and its current artifact uses the superseded contract digest. Fresh independent approval on the refreshed exact plan head is required.

### Parent bootstrap sequence
- Keep PR #28 stacked on parent branch agent/implement/aes-surface-evidence at exact base 2ce3cf8a69439c22246de7d5449ce186e23bd584; rebind and reapprove if the parent advances. A human integrates reviewed child changes into PR #18 after applicable checks pass; the agent does not merge.
- Issue #24's two-context bootstrap is first, only after the #24 child is integrated and its exact-head preflight passes. Remove exactly repository-controls and trusted-acceptance for at most 60 minutes; preserve evidence, all other checks, strict mode, approvals, CODEOWNERS, environments, and the empty bypass list. Immediately restore repository-controls to integration 15368 and trusted-acceptance to App 5075466, verify both identities, then run the protected audit and publish only truthful status on the validated original head.
- After both contexts are restored, refresh and implement Issue #22 under its own fresh approved plan; keep trusted-acceptance required and allow only its separate repository-controls window. After #22 is accepted, refresh and implement Issue #20. Never overlap the windows.
- AC6 requires no new Zizmor 1.30.0 findings on the #24 candidate. Existing findings remain assigned to #20 and block parent ready_for_acceptance until #20 and required hosted checks pass. No scanner suppressions or severity downgrades are authorized.
- Do not start a settings window unless every task-specific preflight and status gate passes. On any missing, stale, failed, or untruthful evidence, do not start; if active, restore both original contexts and stop.

## Scope and files to change
- `scripts/resolve-workflow-pr.d.mts`
- `scripts/resolve-workflow-run.d.mts`
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
- `scripts/resolve-workflow-pr.d.mts`
- `scripts/resolve-workflow-run.d.mts`
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
- `package.json`
- `package-lock.json`

### Bounded dependency remediation
- Change only the direct `fastify` dependency from `5.12.1` to `5.12.5`.
- Update only the lockfile entries needed for that Fastify update and to resolve `brace-expansion` to `5.0.12` or later, addressing the three advisories listed in Issue #24.
- Do not add dependencies, apply overrides, update unrelated packages, or introduce unrelated lockfile churn. If the lockfile cannot be fixed within this boundary, stop and request a further plan amendment.
- `npm audit --audit-level=high` must exit successfully with zero high or critical advisories; record the exact resolved versions and output.

Prohibited paths and operations:
- `src/**`
- `migrations/**`
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
- AC6 | The Issue #24 candidate passes focused/unit/acceptance tests, typecheck/build, plan and scope checks, dependency audit with zero high/critical findings, secret scan, and agentic:compile. Pinned Zizmor is compared against the exact approved base and the candidate introduces no new findings. Existing findings remain unresolved and assigned to Issue #20; this criterion does not claim parent ready_for_acceptance until Issue #20 and all required hosted checks pass | records task-scoped results, base/candidate Zizmor SARIF digests, and exact hosted status and ruleset evidence

## Evidence
- Exact parent base and fresh plan approval; ruleset 23998987 before/during/after snapshots prove only the two authorized #24 contexts were temporarily absent, every other requirement stayed unchanged, strict mode stayed on, and the bypass list remained empty.
- Parent PR #18 preflight: all remaining checks pass, evidence remains truthful, unrelated main merges are paused, and the protected publisher is ready on the exact source head. Record current failures as blockers, never acceptance.
- Dependency audit evidence: Fastify 5.12.5, brace-expansion 5.0.12 or later, only authorized package changes, and npm audit --audit-level=high exits 0 with zero high/critical advisories.
- Pinned Zizmor 1.30.0 evidence: scanner/image identity, exact approved base and candidate SHAs, both SARIF SHA-256 digests, and finding delta by workflow/rule. Require no new #24 findings; preserve existing #20 findings without suppressions. Non-zero scan is failure, not pass.
- Focused/full validation outputs, exact command results/counts, dependency versions, candidate SHA, and hosted run URLs. Do not claim parent ready_for_acceptance until #20 and all required hosted checks pass.

## Decisions and handoffs
- The owner authorized preparation of the bounded Issue #24 bootstrap plan; settings changes still require fresh independent approval of this exact plan and passing exact-head preflight.
- Live Issue #24 contract digest: 8763c017e195fc22c2a4b4c3347ad961616eeaa8ee56029a72c2f315e33bf01c. The prior PR #25 review is bound to 2d25fc79ffff1aecd2fef10787233865a54a06d0e96a8313a87fa46c6ca70936; it cannot approve this revision.
- PR #28 remains on parent base 2ce3cf8a69439c22246de7d5449ce186e23bd584; do not rebase unless the parent advances, then rebind and reapprove. A human integrates the reviewed child; the agent does not merge.
- Sequence: Issue #24 child integration and its first two-context bootstrap; restore both contexts; then Issue #22 with trusted-acceptance kept required and only repository-controls eligible for its separate window; Issue #20 follows after #22 acceptance. Never overlap settings windows.
- AC6 requires an exact-base/candidate Zizmor comparison with no new findings; existing findings remain #20 work. No parent ready_for_acceptance until #20 and required hosted checks pass.
- Original status identities are repository-controls integration 15368 and trusted-acceptance App 5075466. Issue #22 owns its later repository-controls rebind.

## Risks
- Temporarily removing two required contexts reduces protection; preserve all other contexts, pause unrelated main merges, cap at 60 minutes, and restore immediately on deviation.
- Dependency changes could introduce unrelated lockfile churn; constrain and audit exact package diffs.
- Protected publisher dispatch may receive stale or hostile inputs; validate immutable source run/attempt, PR, base/head, merge, task, plan, and artifact identity before import.
- The online controls audit must observe restored ruleset state.
- Pre-existing Zizmor findings remain assigned to Issue #20; new findings, suppressions, or false acceptance claims block progress.
- A trusted status on the wrong original head/run/plan could satisfy an unintended commit; re-read immutable identities.

## Rollback and escalation
- Never start a window unless every preflight condition passes and the exact prior ruleset snapshot is saved.
- Immediately restore repository-controls 15368 and trusted-acceptance 5075466 on any failure, then verify all other rules and the empty bypass list.
- Any new pinned Zizmor finding, non-zero required scan, stale/failed trusted status, or untruthful evidence means no settings change or success status.
- Never add a bypass actor, disable ruleset enforcement, lower strictness, remove evidence, expose credentials to PR code, or exceed 60 minutes.
- If exact restoration cannot be verified, stop all other work and escalate to the repository owner.

<!-- northstar:plan-contract:start -->
```json
{
  "schema": "northstar/plan/1",
  "taskId": "AES-TRUSTED-ACCEPTANCE-BOOTSTRAP",
  "contractDigest": "8763c017e195fc22c2a4b4c3347ad961616eeaa8ee56029a72c2f315e33bf01c",
  "baseSha": "2ce3cf8a69439c22246de7d5449ce186e23bd584",
  "baseBranch": "agent/implement/aes-surface-evidence",
  "risk": "high",
  "objective": "Safely bootstrap trusted-acceptance publication for same-repository stacked PRs without exposing publisher credentials to pull-request code. During ordinary processing, require the PR to be open. For the single approved migration only, permit protected-default-branch workflow_dispatch to process the exact merged migration PR after verifying source run/attempt, repository, workflow/event, original head/base, merge commit, task and plan. After the parent merge, first restore repository-controls to its original Actions integration 15368 and trusted-acceptance to App 5075466, then run the trusted online audit and publish `trusted-acceptance` on the validated original PR head only if the report is ready_for_acceptance. Issue #22 separately owns any later repository-controls rebind.",
  "scope": {
    "allowed": [
      "scripts/resolve-workflow-pr.d.mts",
      "scripts/resolve-workflow-run.d.mts",
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
      "scripts/resolve-workflow-pr.d.mts",
      "scripts/resolve-workflow-run.d.mts",
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
      "docs/architecture.md",
      "package.json",
      "package-lock.json"
    ],
    "prohibited": [
      "src/**",
      "migrations/**",
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
    "Reconfirm the amended issue digest 8763c017e195fc22c2a4b4c3347ad961616eeaa8ee56029a72c2f315e33bf01c, exact parent base 2ce3cf8a69439c22246de7d5449ce186e23bd584, ruleset 23998987 identities, strict mode, empty bypass list, and protected App/environment identities. Record that PR #28 is exactly approved but its current run still fails dependency-review, repository-controls, and evidence; record trusted Publish Evidence run 37001721147 as failing on the deployed main resolver's stacked-base limitation.",
    "After this amended plan receives a fresh independent native approval, continue PR #28 from its exact approved parent base 2ce3cf8a69439c22246de7d5449ce186e23bd584; do not rebase unless the parent advances. Apply only the permitted dependency updates and rerun focused tests, the full local validation, and hosted checks.",
    "Change only the direct fastify pin from 5.12.1 to 5.12.5. Update package-lock.json only for that Fastify update and to resolve brace-expansion to 5.0.12 or later; make no unrelated dependency changes, additions, overrides, or lockfile churn.",
    "Run npm audit --audit-level=high and require zero high/critical findings; record exact resolved Fastify and brace-expansion versions and the audit output.",
    "Resolve the trusted-publisher blocker without running PR code: the current protected-main Publish Evidence run 37001721147 failed because deployed main at b65c2de only resolves PRs targeting main. Use the approved exact-declared-base resolver change from the candidate only through the reviewed parent/bootstrap path; do not bypass the resolver or dispatch an untrusted workflow.",
    "Normal source-run resolution requires exactly one open same-repository PR for the immutable run head and declared base. Only the single bootstrap workflow_dispatch may process the exact merged parent PR, and it must verify merged=true, merge_commit_sha, original source run/attempt, original head/base, task and plan.",
    "Add workflow_dispatch inputs for source run ID, source run attempt, parent PR number, approved bootstrap plan PR number and immutable plan head. Treat every input as untrusted; resolve and validate all source workflow/event/repository/run/attempt/PR/base/head/merge/task/plan/artifact identities before downloading or importing any artifacts.",
    "For the merged bootstrap, compare the verified merge commit against the immutable base/head snapshot recorded by the source run. Do not treat the mutable closed-PR base SHA as the original plan base. Prove the merge commit contains the source head according to the checked GitHub comparison response.",
    "Keep privileged audit and status publication in protected default-branch code using the existing trusted-publisher environment/App 5075466. Never checkout or execute PR code. Before audit, restore the two original required contexts so the online governance audit observes the true live ruleset.",
    "Preflight parent PR #18: all remaining checks pass, evidence stays required and reports at most ready_for_review while trusted statuses are absent, unrelated main merges are paused, and the protected publisher is proven ready to issue both trusted statuses after the parent merge on the exact original head. Abort the settings window if any preflight fails.",
    "After preflight, start one maximum-60-minute window and remove exactly repository-controls and trusted-acceptance from ruleset 23998987. Keep evidence, every other context, strict mode, human review, CODEOWNERS, environments and the empty bypass list unchanged.",
    "Merge parent PR #18 through the human-reviewed path; the agent does not merge. Immediately restore repository-controls to Actions integration 15368 and trusted-acceptance to App 5075466. Verify all other settings are unchanged before running the protected publisher audit.",
    "After restoration, dispatch the protected publisher from main with the exact source run ID/attempt, parent PR number, and plan PR/head. Revalidate the merged PR, task/approved plan, source artifacts, human review, scope and live controls; publish trusted-acceptance only if the fresh report is ready_for_acceptance. Target the original validated PR head.",
    "Capture exact status creator/context/source-run and final ruleset. If trusted audit/status fails, publish no success, leave the original required contexts intact, block later merges and report the exact blocker.",
    "Add positive and negative tests for bounded dependency changes, open/stacked and merged same-repository PR resolution, original base/head snapshots, merge ancestry, exact source run/attempt/task/plan/artifact binding, trusted App status target, strict restoration, and truthful ready_for_review behavior. Run npm run validate, npm run test:acceptance, npm audit --audit-level=high, npm run security:secrets, npm run agentic:compile, npm run agentic:zizmor, and npm run validate:all; record exact commands, exit codes, counts, dependency versions, and candidate SHA. Compare pinned Zizmor 1.30.0 on the exact approved base and candidate; record both SARIF digests and finding differences by rule and workflow. Require no new Issue #24 findings, suppress none, and treat non-zero scanner results as failures. Existing findings remain Issue #20 work; do not claim parent ready_for_acceptance until Issue #20 and required hosted checks pass."
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
      "statement": "The Issue #24 candidate passes focused/unit/acceptance tests, typecheck/build, plan and scope checks, dependency audit with zero high/critical findings, secret scan, and agentic:compile. Pinned Zizmor is compared against the exact approved base and the candidate introduces no new findings. Existing findings remain unresolved and assigned to Issue #20; this criterion does not claim parent ready_for_acceptance until Issue #20 and all required hosted checks pass",
      "provenBy": "records task-scoped results, base/candidate Zizmor SARIF digests, and exact hosted status and ruleset evidence"
    }
  ],
  "evidence": [
    "Exact parent base and plan approval; ruleset 23998987 before/during/after snapshots prove only the two named contexts were temporarily absent, all other rules unchanged, strict mode true and bypass actors empty.",
    "Preflight record for parent PR #18: all remaining contexts pass, evidence is required and truthful, unrelated main merges are paused, and rollback is ready. The current trusted-acceptance failure is recorded as pre-bootstrap evidence and is never represented as success.",
    "Dependency audit evidence: Fastify resolves to 5.12.5, brace-expansion resolves to at least 5.0.12, only the authorized package files changed, and npm audit --audit-level=high reports zero high/critical findings.",
    "Current child evidence: PR #28 head cb507e20cd0cb8fdeabfedaece67510a651757b0 has exact-head approval review 5391273930; Governed Change run 37001565136 passes human-review but fails dependency-review, repository-controls and evidence. Trusted Publish Evidence run 37001721147 on main b65c2de fails because the deployed resolver cannot resolve the stacked parent base.",
    "Current parent evidence: PR #18 head 2ce3cf8a69439c22246de7d5449ce186e23bd584 has an exact native approval (review 5356731352), but hosted human-review remains failed, repository-controls is unavailable with HTTP 403, and trusted-acceptance is failure at run 36612770691. Report 36610256698 is ready_for_review with AC15 unverified; review-event report 36612195971 is review_required.",
    "Resolver output binds source workflow/event/run/attempt to same-repository parent PR, original head/base, merge commit, task/plan PR/head/digest, artifact/report digest and freshness.",
    "Protected main workflow_dispatch run and API status response prove trusted-acceptance came from App 5075466 and targets the original PR head only after ready_for_acceptance.",
    "Final ruleset state proves repository-controls is 15368 and trusted-acceptance is 5075466; all other fields unchanged and no bypass actor.",
    "Focused/full validation outputs, exact test counts, candidate SHA and hosted workflow URLs; if preflight fails, a blocked report and unchanged settings.",
    "Pinned Zizmor 1.30.0 comparison at the immutable approved base and candidate: record scanner/image identity, both SARIF SHA-256 digests, and finding delta by workflow and rule. Issue #24 must introduce no findings; preserve pre-existing findings as Issue #20 work without suppressions. This is an evidence expectation, not a completed result.",
    "Live blocker snapshot: PR #18 2ce3cf8a69439c22246de7d5449ce186e23bd584, REVIEW_REQUIRED, failures=repository-controls,human-review,evidence; PR #28 cb507e20cd0cb8fdeabfedaece67510a651757b0, APPROVED, failures=dependency-review,repository-controls,human-review,evidence; PR #25 1c67b1106f9a8f2a94dfe62185ada6e7b679e24b, draft=true. Re-read before execution."
  ],
  "decisionsAndHandoffs": [
    "The user authorized the one-time maximum-60-minute removal of exactly repository-controls and trusted-acceptance for planning; any settings change requires this exact independent plan approval and a passing preflight.",
    "Issue #24 was amended on 2026-10-02 to permit only Fastify 5.12.1 to 5.12.5 and the minimum lockfile change for brace-expansion 5.0.12 or later. This changes the task digest; prior plan PR #25 approval is invalid and a fresh approval is required.",
    "PR #28 is already on the approved parent base 2ce3cf8a69439c22246de7d5449ce186e23bd584 and has exact-head review 5391273930. Do not change its base unless the parent advances. A human integrates the reviewed child into parent PR #18 after applicable hosted checks pass; the agent does not merge.",
    "The current trusted-acceptance failure is pre-bootstrap evidence; the publisher must prove it can issue a fresh success on the original validated head after the merged workflow is restored.",
    "The final status identities for issue #24 remain repository-controls 15368 and trusted-acceptance 5075466. Issue #22 owns the later repository-controls rebind.",
    "Issue #24 is a prerequisite for #22, which blocks #20; dependent plans require refresh and approval after shared-base changes.",
    "Live Issue #24 contract digest is 8763c017e195fc22c2a4b4c3347ad961616eeaa8ee56029a72c2f315e33bf01c; prior PR #25 approval is bound to 2d25fc79ffff1aecd2fef10787233865a54a06d0e96a8313a87fa46c6ca70936 and cannot approve this revision.",
    "The required order is Issue #24 child integration and first two-context bootstrap; restore both original contexts; then Issue #22 with trusted-acceptance kept required and only repository-controls eligible for its separate window; after #22 acceptance, refresh and implement Issue #20. Never overlap windows.",
    "AC6 requires an exact-base/candidate Zizmor 1.30.0 comparison with no new findings. Existing findings remain Issue #20 work; this task must not claim parent ready_for_acceptance until Issue #20 and all required hosted checks pass."
  ],
  "risks": [
    "Temporarily removing two required contexts reduces protection; preserve all other contexts, pause unrelated main merges, cap at 60 minutes and restore immediately on deviation.",
    "Fastify or transitive lockfile remediation could introduce unrelated supply-chain changes; constrain and audit the exact package diff.",
    "The post-merge workflow_dispatch could be supplied stale/hostile inputs; re-resolve immutable source run/attempt, PR, base/head, merge, task and plan before artifacts.",
    "The online controls audit must observe restored ruleset state; auditing while contexts are absent would yield untrustworthy evidence.",
    "A trusted status on the wrong original head/run/plan could satisfy an unintended commit; bind and re-read all immutable identities.",
    "If the trusted report is not ready_for_acceptance, no success status is allowed and later merges remain blocked.",
    "The current failed trusted-acceptance status cannot be treated as success; the protected publisher must re-evaluate restored controls after the merge before status publication.",
    "Pre-existing Zizmor findings may block acceptance; do not suppress them, downgrade severity, or describe them as passing."
  ],
  "rollbackAndEscalation": [
    "Never start the window unless every preflight condition passes and the exact prior ruleset snapshot is saved. The current trusted-acceptance failure is not a pass or permission to bypass the stop condition.",
    "Immediately restore repository-controls 15368 and trusted-acceptance 5075466 on any failure, then verify all other rules and the empty bypass list.",
    "Never add a bypass actor, disable ruleset enforcement, lower strictness, remove evidence, expose credentials to PR code, or exceed 60 minutes.",
    "If exact restoration cannot be verified, stop all other work and escalate to the repository owner.",
    "If the Zizmor comparison finds new Issue #24 findings, a required check fails, or evidence cannot truthfully reach its required state, do not start the settings window; restore both original contexts if active and stop."
  ],
  "planDigest": "9739850ef9a9421c38fa4f55cfffde7406aba6a64d9557ead8564da39f8f1217"
}
```
<!-- northstar:plan-contract:end -->
