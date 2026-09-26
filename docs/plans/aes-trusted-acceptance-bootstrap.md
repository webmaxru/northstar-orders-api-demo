# Plan: AES-TRUSTED-ACCEPTANCE-BOOTSTRAP

## Objective
Make the protected trusted publisher resolve and publish `trusted-acceptance` for an exact same-repository implementation PR whose declared base may be a stacked branch, without checking out or executing pull-request code and without exposing App credentials to PR workflows. If this cannot be achieved without a bypass, settings change, or privileged PR credential, stop and report the exact remaining bootstrap decision; never create a success-shaped acceptance status.

## Plan
Risk: high. Base: `agent/implement/aes-surface-evidence` at `2e3cd083399661947b98b420f66ce7a9523ca68b`. This is a separate plan-only proposal. No implementation is authorized until an eligible independent human approves this exact plan commit.

### Failure evidence
- Protected publisher run `36236293245` failed with `Expected exactly one open same-repository pull request ... targeting main; found 0` for PR #23 head `dd85407e838ce702cb9896f7eef8a34ec99baf97`, whose declared base is `agent/implement/aes-surface-evidence`.
- The required `trusted-acceptance` status was not published for that head.

### Planned approach
1. Prove a no-bypass path to deploy the trusted publisher update while current required checks remain enforced; otherwise stop before source edits.
2. Resolve source run, attempt, PR, stacked base, task, plan and head from trusted default-branch code before artifacts are imported.
3. Keep the existing publisher App key inside the protected environment and never execute PR code.
4. Publish `trusted-acceptance` from App `5075466` only after all trusted evidence is revalidated and the report is `ready_for_acceptance`.
5. If deployment cannot occur under current controls without external settings changes or bypass, report the exact decision required and leave this task blocked.

## Scope and files to change
- `.github/workflows/publish-evidence.yml`
- `.github/workflows/system-maintenance-approval.yml`
- `scripts/resolve-workflow-pr.mjs`
- `scripts/resolve-workflow-run.mjs`
- `scripts/publish-acceptance-status.mjs`
- `scripts/select-execution-plan.mjs`
- `tests/unit/resolve-workflow-pr.test.ts`
- `tests/unit/resolve-workflow-run.test.ts`
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
- `hosted repository settings, rulesets, branch protection, bypass actors, App installation/permissions, secrets, environment rules, credentials, or account settings`
- `adding administrator, secret-inventory, or publisher App credentials to any pull_request job or PR-controlled process`
- `checking out, executing, or trusting artifacts from the PR branch in the privileged publisher`
- `broadening pull_request GITHUB_TOKEN beyond minimal read access required to resolve trusted run metadata`
- `changing the `trusted-acceptance` integration identity, removing/renaming/weakening its required status, or altering any other required check`
- `scanner suppressions, severity downgrades, or blanket ignore rules`
- `changes to issue #20's approved plan or scanner-remediation implementation`
- `changes to issue #22's amended scope or its ruleset/bootstrap plan`
- `merging or approving this implementation PR or any other PR`

## Success criteria
- AC1 | The publisher resolves exactly one open same-repository PR for an approved stacked base and exact source head without hard-coding `main` | resolves stacked same-repository PR bases
- AC2 | The publisher accepts only exact source workflow, event, run/attempt, PR, base/head, task, and plan identities | rejects mismatched trusted source run identity
- AC3 | `trusted-acceptance` is emitted only from App 5075466 on the exact current PR head after the report reaches `ready_for_acceptance` | publishes trusted acceptance only for validated head
- AC4 | Missing, stale, failed, or PR-originated evidence never produces success | rejects stale publisher run provenance
- AC5 | The trusted publisher continues to run only protected default-branch code and never exposes App credentials to PR-controlled execution | publisher never executes pull request code
- AC6 | The approved implementation passes focused and full validation and records exact hosted status identity without overstating acceptance | records complete trusted-acceptance validation

## Evidence
- Exact sanitized failure log from protected publisher run 36236293245 tied to source head dd85407e838ce702cb9896f7eef8a34ec99baf97; the logged resolver required base main and found no matching PR.
- Positive and negative source-run resolver tests covering repository, workflow, event, attempt, PR, base/head, task/plan and artifact identity.
- Protected publisher evidence for exact run/attempt and PR metadata, report digest and `ready_for_acceptance` decision, with no PR code execution.
- Commit status response proving `trusted-acceptance` was emitted by existing App 5075466 on the exact current PR head.
- Focused and full local validation results, exact test counts, candidate SHA, and hosted workflow URLs.
- If no compliant deployment path exists, a blocked report naming the precise external bootstrap decision; no hosted settings or credentials changed.

## Decisions and handoffs
- This is a new high-risk prerequisite task. It does not amend issue #22 or authorize its temporary ruleset bootstrap; issue #22 remains blocked until its own approved preflight passes.
- The repository owner authorized preparing a separate scope/plan for trusted-acceptance bootstrap on 2026-09-26. This authorization does not authorize bypasses, rule changes, secrets, App permission changes, or implementation before independent plan approval.
- PR #23 plan head dd85407e838ce702cb9896f7eef8a34ec99baf97 is independently approved, but its protected publisher run 36236293245 failed before publishing status because the current resolver only accepts main-based PRs.
- Issue #24 is a prerequisite to issue #22. Any base change while implementing this task invalidates dependent plans; refresh and re-approve issue #22 before proceeding.

## Risks
- A same-repository stacked PR can be mistaken for a default-branch PR unless source and base are resolved from immutable run and PR metadata.
- A successful status on the wrong head, run attempt, or plan could satisfy a required context incorrectly.
- Exposing the publisher App key/token to PR code could permit status forgery or credential theft; the privileged job must use trusted default-branch code only.
- The existing publisher implementation on main may not support the stacked base, and the PR that fixes it may itself be unable to satisfy trusted-acceptance before merge.
- If a no-bypass bootstrap is impossible, scope completion requires a further human decision; do not weaken or bypass the ruleset.

## Rollback and escalation
- If source identity, task/plan, or candidate PR changes during resolution, stop and publish no success status.
- If any required evidence is unavailable or `ready_for_acceptance` is false, publish failure or no status; never provide a success-shaped fallback.
- Rollback only the in-scope resolver, status publisher and directly coupled workflow/test/docs changes on the isolated branch; do not alter hosted settings or bypass protections.
- After two identical required security/policy failures or any trust-boundary violation, stop and escalate under docs/RECOVERY-POLICY.md.

<!-- northstar:plan-contract:start -->
```json
{
  "schema": "northstar/plan/1",
  "taskId": "AES-TRUSTED-ACCEPTANCE-BOOTSTRAP",
  "contractDigest": "9bb0c567e511d942995f1142805ff51189212a9a2d5c7a6e602100d3a83d2e9c",
  "baseSha": "2e3cd083399661947b98b420f66ce7a9523ca68b",
  "baseBranch": "agent/implement/aes-surface-evidence",
  "risk": "high",
  "objective": "Make the protected trusted publisher resolve and publish `trusted-acceptance` for an exact same-repository implementation PR whose declared base may be a stacked branch, without checking out or executing pull-request code and without exposing App credentials to PR workflows. If this cannot be achieved without a bypass, settings change, or privileged PR credential, stop and report the exact remaining bootstrap decision; never create a success-shaped acceptance status.",
  "scope": {
    "allowed": [
      ".github/workflows/publish-evidence.yml",
      ".github/workflows/system-maintenance-approval.yml",
      "scripts/resolve-workflow-pr.mjs",
      "scripts/resolve-workflow-run.mjs",
      "scripts/publish-acceptance-status.mjs",
      "scripts/select-execution-plan.mjs",
      "tests/unit/resolve-workflow-pr.test.ts",
      "tests/unit/resolve-workflow-run.test.ts",
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
      "hosted repository settings, rulesets, branch protection, bypass actors, App installation/permissions, secrets, environment rules, credentials, or account settings",
      "adding administrator, secret-inventory, or publisher App credentials to any pull_request job or PR-controlled process",
      "checking out, executing, or trusting artifacts from the PR branch in the privileged publisher",
      "broadening pull_request GITHUB_TOKEN beyond minimal read access required to resolve trusted run metadata",
      "changing the `trusted-acceptance` integration identity, removing/renaming/weakening its required status, or altering any other required check",
      "scanner suppressions, severity downgrades, or blanket ignore rules",
      "changes to issue #20's approved plan or scanner-remediation implementation",
      "changes to issue #22's amended scope or its ruleset/bootstrap plan",
      "merging or approving this implementation PR or any other PR"
    ]
  },
  "operations": [
    "workflow-change",
    "security-change"
  ],
  "steps": [
    "Reconfirm issue #24 body digest, exact base SHA, current ruleset status identities, existing trusted publisher App, protected environments, and the exact failure from publisher run 36236293245. Do not change hosted settings or expose credentials.",
    "Model a no-bypass deployment path for the publisher change. Prove how the updated trusted publisher can be deployed and produce a current status while all existing required contexts remain enforced. If it cannot be deployed or trusted-acceptance cannot pass without changes to prohibited settings, stop before source edits and report the exact human decision required.",
    "Extend source-run/PR resolution to accept only a completed Governed Change run from the same repository with an allowed event and exact run attempt, uniquely associated open PR, current head, declared base branch/SHA, task contract and plan identity. Support the plan-declared stacked base; reject default-branch assumptions, forks, ambiguity and stale metadata.",
    "Keep all publisher code on the protected default branch and use only the existing trusted-publisher environment/App. Never check out or execute PR code, and download no source artifacts until exact run/PR identity has been verified.",
    "Publish trusted-acceptance only after revalidating current task, approved plan, human review, scope, trusted execution evidence and ready_for_acceptance report. Attribute the status to App 5075466 and bind it to the exact validated PR head. Publish failure or no success status for any missing or mismatched evidence.",
    "Add focused positive and negative tests for stacked-base resolution, exact source-run attempt, task/plan/base/head binding, duplicate/fork/stale inputs, readiness gating, App identity, status target SHA, and the no-PR-code execution boundary.",
    "Run the approved focused tests, npm run agentic:compile, npm run agentic:zizmor, npm run validate, npm run test:acceptance and npm run validate:all; record exact commands, exits, counts and candidate SHA. Run hosted Plan Gate/Governed Change and verify the trusted status creator and target commit.",
    "If this implementation cannot be deployed under the current ruleset without a prohibited setting change or bypass, stop. Do not alter ruleset 23998987, `repository-controls`, `trusted-acceptance`, App permissions, secrets, or environment rules under this task."
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
      "statement": "The publisher resolves exactly one open same-repository PR for an approved stacked base and exact source head without hard-coding `main`",
      "provenBy": "resolves stacked same-repository PR bases"
    },
    {
      "id": "AC2",
      "statement": "The publisher accepts only exact source workflow, event, run/attempt, PR, base/head, task, and plan identities",
      "provenBy": "rejects mismatched trusted source run identity"
    },
    {
      "id": "AC3",
      "statement": "`trusted-acceptance` is emitted only from App 5075466 on the exact current PR head after the report reaches `ready_for_acceptance`",
      "provenBy": "publishes trusted acceptance only for validated head"
    },
    {
      "id": "AC4",
      "statement": "Missing, stale, failed, or PR-originated evidence never produces success",
      "provenBy": "rejects stale publisher run provenance"
    },
    {
      "id": "AC5",
      "statement": "The trusted publisher continues to run only protected default-branch code and never exposes App credentials to PR-controlled execution",
      "provenBy": "publisher never executes pull request code"
    },
    {
      "id": "AC6",
      "statement": "The approved implementation passes focused and full validation and records exact hosted status identity without overstating acceptance",
      "provenBy": "records complete trusted-acceptance validation"
    }
  ],
  "evidence": [
    "Exact sanitized failure log from protected publisher run 36236293245 tied to source head dd85407e838ce702cb9896f7eef8a34ec99baf97; the logged resolver required base main and found no matching PR.",
    "Positive and negative source-run resolver tests covering repository, workflow, event, attempt, PR, base/head, task/plan and artifact identity.",
    "Protected publisher evidence for exact run/attempt and PR metadata, report digest and `ready_for_acceptance` decision, with no PR code execution.",
    "Commit status response proving `trusted-acceptance` was emitted by existing App 5075466 on the exact current PR head.",
    "Focused and full local validation results, exact test counts, candidate SHA, and hosted workflow URLs.",
    "If no compliant deployment path exists, a blocked report naming the precise external bootstrap decision; no hosted settings or credentials changed."
  ],
  "decisionsAndHandoffs": [
    "This is a new high-risk prerequisite task. It does not amend issue #22 or authorize its temporary ruleset bootstrap; issue #22 remains blocked until its own approved preflight passes.",
    "The repository owner authorized preparing a separate scope/plan for trusted-acceptance bootstrap on 2026-09-26. This authorization does not authorize bypasses, rule changes, secrets, App permission changes, or implementation before independent plan approval.",
    "PR #23 plan head dd85407e838ce702cb9896f7eef8a34ec99baf97 is independently approved, but its protected publisher run 36236293245 failed before publishing status because the current resolver only accepts main-based PRs.",
    "Issue #24 is a prerequisite to issue #22. Any base change while implementing this task invalidates dependent plans; refresh and re-approve issue #22 before proceeding."
  ],
  "risks": [
    "A same-repository stacked PR can be mistaken for a default-branch PR unless source and base are resolved from immutable run and PR metadata.",
    "A successful status on the wrong head, run attempt, or plan could satisfy a required context incorrectly.",
    "Exposing the publisher App key/token to PR code could permit status forgery or credential theft; the privileged job must use trusted default-branch code only.",
    "The existing publisher implementation on main may not support the stacked base, and the PR that fixes it may itself be unable to satisfy trusted-acceptance before merge.",
    "If a no-bypass bootstrap is impossible, scope completion requires a further human decision; do not weaken or bypass the ruleset."
  ],
  "rollbackAndEscalation": [
    "If source identity, task/plan, or candidate PR changes during resolution, stop and publish no success status.",
    "If any required evidence is unavailable or `ready_for_acceptance` is false, publish failure or no status; never provide a success-shaped fallback.",
    "Rollback only the in-scope resolver, status publisher and directly coupled workflow/test/docs changes on the isolated branch; do not alter hosted settings or bypass protections.",
    "After two identical required security/policy failures or any trust-boundary violation, stop and escalate under docs/RECOVERY-POLICY.md."
  ],
  "planDigest": "882047039514ebcee2f408d8736392c28f3203afcd66ed3964d0d79fb8d53e50"
}
```
<!-- northstar:plan-contract:end -->
