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
change, and all local checks can reach `ready_for_review`. The remaining
acceptance decision must come from a trust anchor outside the changed code, for
example:

- a platform owner performing an explicit bootstrap review;
- a separate governance repository or immutable reusable workflow;
- a temporary, audited administrative merge procedure approved by the
  repository owner.

After the control-plane change is merged, the new default-branch controls
become the trust anchor for subsequent work.

The proof of concept deliberately does not provide a silent bypass flag or an
environment variable that disables policy. Such a switch would be a permanent
policy-escape path.

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
