# Work items

> **These files are not task contracts.** They are the text you paste when
> creating the issue during demo setup.

Microsoft Learn puts the task contract in the issue:

> "In GitHub workflows, success criteria should be defined in the issue or pull
> request... Write acceptance criteria directly in the issue, reference those
> criteria in the pull request, and use them as the basis for validation."
>
> — [Evaluate agent output using GitHub checks](https://learn.microsoft.com/en-us/training/modules/design-agent-architecture-integration/3-inputs-outputs-success-criteria)

So the contract lives in the issue and only there. A live issue cannot be
cloned, version-controlled, or rehearsed offline, which is the one thing a demo
repository needs, so these seed files exist to recreate the issue exactly.

## Creating the issue

```bash
gh issue create --template agent-task.yml
```

Then paste the matching section values, or create it directly from the seed:

```bash
gh issue create --title "[Agent task] WI-1842 Stop duplicate orders after client retries" --label agent-task --body-file docs/work-items/WI-1842.issue.md
```

## Using it

```bash
npm run contract:fetch -- --issue <number>    # reads the live issue
npm run contract:fetch -- --file docs/work-items/WI-1842.issue.md   # offline
```

Either way the parsed contract is cached to `artifacts/task-contract.json`,
which `scripts/authorize-tool.mjs` and `scripts/build-execution-report.mjs`
read. The cache is gitignored: the repository never becomes the source of
truth.

The seed files double as parser fixtures in
`tests/unit/task-contract.test.ts`, so a change to the issue template that the
parser cannot read fails CI.
