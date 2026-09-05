# Developing the AI engineering system itself

The repository guardrails govern application work and changes to the
engineering system. They do not make the system immutable.

## What the hooks block

The native Copilot `PreToolUse` hook blocks agent writes when any required
authority is missing:

- no trusted GitHub issue task contract;
- no human-approved `northstar/plan/1`;
- the current branch is not `agent/implement/<task-id>`;
- the branch does not descend from the approved base SHA;
- the requested file is outside the issue or plan scope;
- the command is not an exact allowlisted validation command.

This means an informal prompt such as "change the workflow" from `main` is
denied. That is intentional. Human terminal commands are not intercepted by
Copilot hooks, so an accountable maintainer always retains recovery authority.

## Safe maintenance workflow

Use the normal high-risk path for changes to `.github/**`, `scripts/**`,
validation configuration, package manifests, migrations, or governance policy.

1. Create an **Agent task** issue with the exact control-plane paths allowed.
2. Include validation and rollout expectations plus a rollback path.
3. Run `/plan <issue>` with the read-only planner.
4. Inspect and explicitly publish the plan-only pull request.
5. Approve the plan, then record that approval:

   ```powershell
   $review = gh api repos/{owner}/{repo}/pulls/<plan-pr>/reviews `
     --jq '[.[] | select(.state == "APPROVED")][-1].id'
   npm run plan:record-approval -- --pr <plan-pr> --review $review
   ```

6. Create the implementation branch from the approved base:

   ```powershell
   git switch -c agent/implement/<task-id-lowercase> <approved-base-sha>
   ```

7. Start a fresh session and run `/implement <issue>`.
8. Run the local gates and obtain `ready_for_review`.
9. Use an independent human/platform review for the control-plane change.

With the contract, approval, branch, base, and path scope in place, the hook
allows the agent to modify the engineering system itself.

## The bootstrap boundary

A pull request that changes its own validation authority cannot safely declare
itself trustworthy. The `validation-authority` check therefore prevents changes
to these paths from self-certifying `ready_for_acceptance`:

- `.github/workflows/**`
- `.github/governance/**`
- `.github/hooks/**`
- `.github/agents/**`
- `.github/instructions/**`
- `scripts/**`
- `package.json` and `package-lock.json`
- ESLint, TypeScript, build, and Vitest configuration

This is not a local-development block. The agent can implement the approved
change, and all local checks can reach `ready_for_review`.

The repository implements the external trust anchor as a separately dispatched
default-branch workflow:

1. The first trusted job evaluates the immutable pull-request SHA and records
   `validation-authority: fail` when control-plane files changed.
2. It publishes a failing `trusted-acceptance` status and uploads a restricted
   evidence bundle.
3. `Publish Evidence` runs in the default-branch-only `trusted-publisher`
   environment. It mints a trusted-publisher App token for evidence/status
   operations and a separate dispatcher App token that starts
   `System Maintenance Approval`.
4. That workflow waits on the protected `system-maintenance` GitHub
   environment.
5. A configured platform reviewer—different from the automation identity—
   approves that environment deployment.
6. The job re-resolves the exact PR/SHA, reloads only allowlisted evidence,
   verifies that a control-plane change is actually pending, and records
   `validation-authority: pass` as environment-approved.
7. It mints a fresh trusted-publisher App token from the private key exposed
   only after environment approval, then verifies rulesets, branch protection,
   environments, security features, variables, and secret names.
8. It rebuilds the hosted execution report and may replace the failed
   `trusted-acceptance` status with success for the same commit.

Configure these external controls before using this path:

- repository variables `TRUSTED_PUBLISHER_APP_ID`,
  `TRUSTED_PUBLISHER_APP_LOGIN`, `SYSTEM_MAINTENANCE_DISPATCH_APP_ID`, and
  `SYSTEM_MAINTENANCE_DISPATCH_APP_LOGIN`;
- a trusted-publisher GitHub App installed only on this repository, with
  Administration, environment, and secret-metadata read plus pull-request and
  commit-status write permissions;
- a separate maintenance-dispatch GitHub App with only Actions write access;
- a `trusted-publisher` environment using selected-branch deployment policy
  with exactly the default branch allowed, administrator bypass disabled, and
  environment secrets
  `TRUSTED_PUBLISHER_APP_PRIVATE_KEY` and
  `SYSTEM_MAINTENANCE_DISPATCH_APP_PRIVATE_KEY`;
- protected `system-maintenance` environment with the exact reviewers listed
  in `.github/governance/policy.json`, selected-branch policy allowing only the
  default branch, self-review prevention, and administrator bypass disabled;
- the same `TRUSTED_PUBLISHER_APP_PRIVATE_KEY` secret scoped separately to the
  `system-maintenance` environment.

Neither App identity may be an environment reviewer, and the two Apps must be
different. Branch protection must bind the `trusted-acceptance` context to the
trusted-publisher App's integration ID. Without these controls,
`repository-controls` remains failed and the workflow cannot produce
`ready_for_acceptance`.

The workflows request an explicit permission subset when minting each
installation token. The publisher token has Actions read, not workflow-dispatch
authority; the dispatcher token has only Actions write.

Do not define either private-key name as a repository or organization Actions
secret, or in any environment outside the allowlists above. Environment scope
and exact selected-branch policies are what keep PR-controlled workflows from
reading the credentials.

After the control-plane change is merged, the new default-branch controls
become the trust anchor for subsequent work.

The proof of concept deliberately does not provide a silent bypass flag,
environment variable, or unreviewed ruleset bypass. The protected environment
is the explicit, auditable human authorization boundary.

## One-time installation bootstrap

The first commit that introduces the `system-maintenance-approval` job cannot
be approved by that job because `workflow_run` always executes the workflow
definition already present on the default branch.

Installing this mechanism therefore requires one explicit bootstrap decision:

1. validate the commit locally with the complete evidence bundle;
2. obtain independent platform-owner review of the workflow and governance
   changes;
3. install the trusted publisher GitHub App and configure both protected
   environments and variables exactly as listed above;
   configure required status checks to require the branch to be up to date
   with the default branch before merge;
4. merge or push the installation commit through an audited owner action;
5. verify the new default branch, workflow, environment, and
   `trusted-acceptance` status before accepting later maintenance changes.

This one-time action is not a reusable bypass. After the workflow is on the
default branch, subsequent control-plane changes use the protected environment
path above.

## Local iteration

For local experimentation:

```powershell
npm run validate:all
npm run demo:system
```

The expected result is `ready_for_review`. Hosted `ready_for_acceptance`
requires published branches, real reviews, protected repository settings, and
the trusted default-branch `trusted-acceptance` status.

## Emergency recovery

If a broken hook prevents an agent session from starting, use an accountable
human terminal outside the agent to repair or revert the hook commit. Do not
rename or delete `.github/hooks/` as a routine development workflow. Record the
recovery in the issue or pull request and rerun all governance checks.
