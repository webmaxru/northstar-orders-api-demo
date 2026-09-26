# Plan: AES-REPO-CONTROLS-EVIDENCE

## Objective
Prepare a safe bootstrap and migrate the required `repository-controls` result from an unprivileged pull-request audit to the protected trusted-publisher App. Rebind only the existing required check to that trusted status source, preserve all other protections, and prove a safe rollout/rollback path before changing the rule. Pull-request code must never receive administrator or secret-inventory credentials. The owner has authorized planning one temporary bootstrap exception: remove only the `repository-controls` required context for at most 60 minutes while keeping `trusted-acceptance` and every other required check, strict mode, PR review, CODEOWNERS, and the empty bypass list unchanged. This is planning authorization only; no settings change is authorized until the revised plan itself is independently approved. If the remaining controls cannot safely carry the migration, stop without mutating settings.

## Plan
Risk: high. Base: `agent/implement/aes-surface-evidence` at `2e3cd083399661947b98b420f66ce7a9523ca68b`. This replaces the previous plan because issue #22 now authorizes planning a tightly bounded bootstrap. The previous PR #23 approval is invalid. No implementation or ruleset mutation is authorized until this exact plan revision is independently approved.

### Required bootstrap preflight
- The active ruleset has no bypass actors; preserve that state.
- The sole temporary exception under consideration is removal of only `repository-controls` for at most 60 minutes. `trusted-acceptance` and every other required context remain mandatory.
- Before any setting change, prove the current protected publisher can provide passing `trusted-acceptance` and all other checks for the exact stacked implementation PR while the trusted status producer is deployed. If not, stop before mutation.

### Planned migration
1. Verify exact current ruleset, App identities, protected environment, source-run metadata and stacked-base resolver behavior.
2. Prove a no-bypass bootstrap preflight; if it cannot keep `trusted-acceptance` and all remaining checks passing, leave code/settings unchanged and report the additional decision required.
3. If preflight passes, implement trusted source-run/base resolution, online audit and publisher status from existing App 5075466, with no privileged credentials in PR jobs.
4. During the approved window, remove only `repository-controls`, deploy and verify the trusted producer, then restore that context bound to 5075466. Preserve all other protection fields and the empty bypass list.
5. Roll back the single context to 15368 immediately if any step fails; capture live before/during/after state and validation evidence.

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
- `all hosted settings except (a) the one authorized temporary removal/restoration of only required context `repository-controls` in ruleset 23998987 for at most 60 minutes and (b) its final rebind from integration_id 15368 to existing trusted publisher App integration_id 5075466`
- `any change to other required status contexts, strict mode, pull-request requirements, CODEOWNERS review, bypass actors, force-push/deletion rules, protected environments, or direct-push rules`
- `creating/installing a new GitHub App, changing App installation permissions, generating keys, changing secrets, credentials, or account settings`
- `adding administrator or secret-inventory credentials to any pull_request job or PR-controlled process`
- `broadening pull_request GITHUB_TOKEN beyond minimal read access required to retrieve trusted evidence`
- `removing, renaming, weakening, or suppressing required repository-controls or other security checks outside the exact time-bounded bootstrap exception above`
- `trusting or executing artifacts produced by pull-request-controlled code as proof of external repository controls`
- `scanner suppressions, severity downgrades, or blanket ignore rules`
- `changes to issue #20's approved plan or scanner-remediation implementation`

## Success criteria
- AC1 | PR-triggered code never receives administrator or secret-inventory credentials or privileged write permissions | pull request workflows do not expose privileged governance credentials
- AC2 | The trusted publisher emits repository-controls only for an exact verified source workflow run and PR head | publishes repository controls only after exact source identity validation
- AC3 | Missing, stale, mismatched, malformed, or PR-originated evidence remains unavailable/failing and is never represented as pass | rejects mismatched trusted governance report provenance
- AC4 | The bootstrap changes only repository-controls for no more than 60 minutes, keeps every other required context and the empty bypass list intact, and restores the trusted-App binding | preserves hosted-control and approval boundaries
- AC5 | The no-bypass bootstrap reaches the trusted status producer without disabling required checks or adding a bypass actor | verifies repository-controls no-bypass bootstrap
- AC6 | The approved implementation passes focused and complete local validation and records exact hosted outcomes without overstating acceptance | records complete validation for trusted control evidence

## Evidence
- Live ruleset 23998987 before/during/after snapshots showing only the authorized `repository-controls` entry is removed/rebound, all other contexts and strict mode unchanged, and no bypass actor.
- Preflight evidence that `trusted-acceptance` and every other required check can pass on the exact implementation PR while the temporary window is active; if unavailable, record the stop and make no setting change.
- Exact protected publisher workflow run, source-run/PR/head identities, trusted audit/report digest and resulting repository-controls status creator/integration 5075466.
- Focused positive/negative tests for untrusted PR credential isolation, stacked-base resolver, trusted status identity, report provenance/freshness and bootstrap rollback.
- Exact focused and full validation commands/results, PostgreSQL acceptance when relevant, candidate SHA and hosted run URLs.
- If preflight is impossible, a blocked report naming the exact remaining decision and confirming no ruleset/settings/code changes.

## Decisions and handoffs
- The owner authorized preparation of this bootstrap plan, including consideration of a one-time maximum 60-minute removal of only the `repository-controls` context; this is not authorization to execute the setting change before the plan is independently approved.
- The prior PR #23 plan revision at head 25d4e771b00a24d5e34b2ba5167707c8c98a1f72 is invalid after issue #22 was amended again; this proposal must be reviewed on its new head.
- The active ruleset currently binds repository-controls to 15368 and trusted-acceptance to 5075466. The PR job cannot read administrator controls; the current protected publisher cannot resolve stacked PR bases and its prior online audit was unavailable.
- Issue #20 remains blocked and its previous plan approval does not authorize this migration. If the shared base changes, issue #20 must be refreshed and re-approved.

## Risks
- Temporarily removing one required context may expose the repository to a merge without that check; keep trusted-acceptance and all other checks required, cap the window at 60 minutes, and make rollback immediate.
- The trusted-acceptance producer may not pass on a stacked implementation PR before the publisher is updated; if so, the preflight fails and no setting is changed.
- A wrong or stale status on another head could satisfy an unintended required context; bind exact repository, workflow, run/attempt, PR, base/head and plan.
- A PR-controlled verifier or artifact could misrepresent settings; all privileged audit and status publication must run on trusted default-branch code.
- Ruleset update API responses may omit details or race with another edit; compare exact live before/after fields and abort if the baseline changes.

## Rollback and escalation
- If preflight cannot prove `trusted-acceptance` and remaining checks stay satisfied, make no code or settings change and stop for a further human decision.
- If any mismatch occurs during the window, restore only the original repository-controls binding to integration 15368, confirm all other rules and empty bypass list, and stop.
- Never add a bypass actor, disable strict checks, broaden credentials, or exceed the 60-minute window.
- If rollback cannot be confirmed immediately, stop all further actions and escalate to the repository owner.

<!-- northstar:plan-contract:start -->
```json
{
  "schema": "northstar/plan/1",
  "taskId": "AES-REPO-CONTROLS-EVIDENCE",
  "contractDigest": "21c19189ffda980300d7d2438f6268df172ca281c477dd5c72259dc51855309a",
  "baseSha": "2e3cd083399661947b98b420f66ce7a9523ca68b",
  "baseBranch": "agent/implement/aes-surface-evidence",
  "risk": "high",
  "objective": "Prepare a safe bootstrap and migrate the required `repository-controls` result from an unprivileged pull-request audit to the protected trusted-publisher App. Rebind only the existing required check to that trusted status source, preserve all other protections, and prove a safe rollout/rollback path before changing the rule. Pull-request code must never receive administrator or secret-inventory credentials. The owner has authorized planning one temporary bootstrap exception: remove only the `repository-controls` required context for at most 60 minutes while keeping `trusted-acceptance` and every other required check, strict mode, PR review, CODEOWNERS, and the empty bypass list unchanged. This is planning authorization only; no settings change is authorized until the revised plan itself is independently approved. If the remaining controls cannot safely carry the migration, stop without mutating settings.",
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
      "all hosted settings except (a) the one authorized temporary removal/restoration of only required context `repository-controls` in ruleset 23998987 for at most 60 minutes and (b) its final rebind from integration_id 15368 to existing trusted publisher App integration_id 5075466",
      "any change to other required status contexts, strict mode, pull-request requirements, CODEOWNERS review, bypass actors, force-push/deletion rules, protected environments, or direct-push rules",
      "creating/installing a new GitHub App, changing App installation permissions, generating keys, changing secrets, credentials, or account settings",
      "adding administrator or secret-inventory credentials to any pull_request job or PR-controlled process",
      "broadening pull_request GITHUB_TOKEN beyond minimal read access required to retrieve trusted evidence",
      "removing, renaming, weakening, or suppressing required repository-controls or other security checks outside the exact time-bounded bootstrap exception above",
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
    "Revalidate the amended task digest, exact base, active ruleset 23998987, all required contexts and their integration IDs, strict mode, empty bypass list, existing trusted publisher identity/permissions, and current trusted-acceptance workflow behavior. Do not expose secrets or change settings during preflight.",
    "Before source edits or settings mutation, construct a full no-bypass bootstrap sequence. Prove that `trusted-acceptance` and every check other than the single authorized `repository-controls` context can pass on the exact stacked implementation PR, and that the protected publisher can become live within the authorized maximum 60-minute window. Specifically test the current publisher base resolver and main-only code limitation. If the preflight fails, stop with no code or ruleset change.",
    "If preflight succeeds, use the approved implementation to extend exact source-run and PR resolution for same-repository stacked bases; validate workflow identity, event, run/attempt, PR, base/head, task/plan and artifact identities before any artifact import. Never check out or execute PR code in the trusted publisher.",
    "Run the online governance audit only in the existing protected default-branch publisher using App 5075466 and its existing permissions. Keep privileged credentials exclusively in that trusted job; PR jobs remain read-only and consume only fresh, verified publisher evidence.",
    "Add the protected publisher status step that emits `repository-controls` from App 5075466 to the exact validated PR head, with pass only when the online audit is fully available and ready; publish failure for missing, stale, mismatched or unavailable evidence. Prove the status creator/integration ID matches 5075466.",
    "Only after the trusted producer is ready and all preflight conditions remain satisfied, begin the authorized bootstrap window (maximum 60 minutes) by removing only the `repository-controls` required-context entry from ruleset 23998987. Keep `trusted-acceptance`, every other status, strict mode, PR review, CODEOWNERS and the empty bypass list unchanged.",
    "Deploy/verify the trusted producer, then restore `repository-controls` as a required context bound to integration_id 5075466. Read the ruleset before, during and after; assert no other field changed and close the window within its limit. If any check fails, restore the prior single-context entry (15368) immediately and stop.",
    "Add positive and negative unit tests for no-credential PR boundaries, stacked-base source resolution, trusted status source, exact source-run identity, artifact provenance/freshness, and the bootstrap/rollback guard. Run focused tests, npm run agentic:compile, npm run agentic:zizmor, npm run validate, npm run test:acceptance and npm run validate:all; record exact results and candidate SHA. Do not claim hosted acceptance unless every required context passes."
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
      "statement": "The bootstrap changes only repository-controls for no more than 60 minutes, keeps every other required context and the empty bypass list intact, and restores the trusted-App binding",
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
    "Live ruleset 23998987 before/during/after snapshots showing only the authorized `repository-controls` entry is removed/rebound, all other contexts and strict mode unchanged, and no bypass actor.",
    "Preflight evidence that `trusted-acceptance` and every other required check can pass on the exact implementation PR while the temporary window is active; if unavailable, record the stop and make no setting change.",
    "Exact protected publisher workflow run, source-run/PR/head identities, trusted audit/report digest and resulting repository-controls status creator/integration 5075466.",
    "Focused positive/negative tests for untrusted PR credential isolation, stacked-base resolver, trusted status identity, report provenance/freshness and bootstrap rollback.",
    "Exact focused and full validation commands/results, PostgreSQL acceptance when relevant, candidate SHA and hosted run URLs.",
    "If preflight is impossible, a blocked report naming the exact remaining decision and confirming no ruleset/settings/code changes."
  ],
  "decisionsAndHandoffs": [
    "The owner authorized preparation of this bootstrap plan, including consideration of a one-time maximum 60-minute removal of only the `repository-controls` context; this is not authorization to execute the setting change before the plan is independently approved.",
    "The prior PR #23 plan revision at head 25d4e771b00a24d5e34b2ba5167707c8c98a1f72 is invalid after issue #22 was amended again; this proposal must be reviewed on its new head.",
    "The active ruleset currently binds repository-controls to 15368 and trusted-acceptance to 5075466. The PR job cannot read administrator controls; the current protected publisher cannot resolve stacked PR bases and its prior online audit was unavailable.",
    "Issue #20 remains blocked and its previous plan approval does not authorize this migration. If the shared base changes, issue #20 must be refreshed and re-approved."
  ],
  "risks": [
    "Temporarily removing one required context may expose the repository to a merge without that check; keep trusted-acceptance and all other checks required, cap the window at 60 minutes, and make rollback immediate.",
    "The trusted-acceptance producer may not pass on a stacked implementation PR before the publisher is updated; if so, the preflight fails and no setting is changed.",
    "A wrong or stale status on another head could satisfy an unintended required context; bind exact repository, workflow, run/attempt, PR, base/head and plan.",
    "A PR-controlled verifier or artifact could misrepresent settings; all privileged audit and status publication must run on trusted default-branch code.",
    "Ruleset update API responses may omit details or race with another edit; compare exact live before/after fields and abort if the baseline changes."
  ],
  "rollbackAndEscalation": [
    "If preflight cannot prove `trusted-acceptance` and remaining checks stay satisfied, make no code or settings change and stop for a further human decision.",
    "If any mismatch occurs during the window, restore only the original repository-controls binding to integration 15368, confirm all other rules and empty bypass list, and stop.",
    "Never add a bypass actor, disable strict checks, broaden credentials, or exceed the 60-minute window.",
    "If rollback cannot be confirmed immediately, stop all further actions and escalate to the repository owner."
  ],
  "planDigest": "00b0e5178c6d08aa0e325531bb77794c10969a2ae275b7b9a23991c1f208c60f"
}
```
<!-- northstar:plan-contract:end -->
