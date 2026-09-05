import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { GOVERNANCE_POLICY } from "./risk-policy.mjs";
import { matchesPattern } from "./task-contract.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");

const REQUIRED_FILES = [
  "AGENTS.md",
  ".gitattributes",
  ".github/CODEOWNERS",
  ".github/ISSUE_TEMPLATE/agent-task.yml",
  ".github/pull_request_template.md",
  ".github/hooks/agent-boundary.json",
  ".github/mcp.json",
  ".github/agents/plan.agent.md",
  ".github/agents/implement.agent.md",
  ".github/agents/risk-reviewer.agent.md",
  ".github/agents/dependency.agent.md",
  ".github/agents/security-reviewer.agent.md",
  ".github/workflows/governed-change.yml",
  ".github/workflows/plan-gate.yml",
  ".github/workflows/publish-evidence.yml",
  ".github/workflows/publish-evidence.yml",
  ".github/workflows/governance-review.yml",
  ".github/workflows/production-gate.yml",
  ".github/workflows/daily-repository-status.md",
  ".github/workflows/daily-repository-status.lock.yml",
  "docs/Developing-in-Agentic-AI-Systems-Learning-Paths.md",
  "docs/architecture.md",
  "docs/AI-ENGINEERING-SYSTEM.md",
  "docs/END-TO-END-DEMO.md",
  "docs/RECOVERY-POLICY.md",
];

const STALE_DOC_PATHS = [
  "docs/SESSION-RUNBOOK.md",
  "docs/LOCAL-VSCODE-FLOW.md",
  "docs/demo-setup",
  "docs/fixtures",
];

function text(path) {
  return readFileSync(resolve(REPO_ROOT, path), "utf8");
}

function check(condition, id, detail) {
  return { id, ok: Boolean(condition), detail };
}

function refPatternMatches(pattern, defaultBranch) {
  const ref = `refs/heads/${defaultBranch}`;
  if (pattern === "~ALL" || pattern === "~DEFAULT_BRANCH") return true;
  if (pattern === defaultBranch || pattern === ref) return true;
  return matchesPattern(ref, pattern) || matchesPattern(defaultBranch, pattern);
}

export function rulesetAppliesToDefaultBranch(ruleset, defaultBranch) {
  if (ruleset.enforcement !== "active" || ruleset.target !== "branch") {
    return false;
  }
  const condition = ruleset.conditions?.ref_name;
  const included = condition?.include ?? [];
  const excluded = condition?.exclude ?? [];
  const includedByRule =
    included.length === 0 ||
    included.some((pattern) => refPatternMatches(pattern, defaultBranch));
  const excludedByRule = excluded.some((pattern) =>
    refPatternMatches(pattern, defaultBranch),
  );
  return includedByRule && !excludedByRule;
}

export function hasRulesetBypass(ruleset) {
  return (ruleset.bypass_actors ?? []).length > 0;
}

export function auditSourceTree() {
  const checks = [];
  const tracked = execFileSync("git", ["ls-files"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter((file) => file && existsSync(resolve(REPO_ROOT, file)));
  for (const file of REQUIRED_FILES) {
    checks.push(check(existsSync(resolve(REPO_ROOT, file)), `required:${file}`, file));
  }
  for (const path of STALE_DOC_PATHS) {
    checks.push(
      check(
        !tracked.some(
          (trackedPath) =>
            trackedPath === path || trackedPath.startsWith(`${path}/`),
        ),
        `removed:${path}`,
        "Stale slide/demo documentation must not remain.",
      ),
    );

    if (existsSync(resolve(REPO_ROOT, ".github/mcp.json"))) {
      const mcp = JSON.parse(text(".github/mcp.json"));
      for (const [name, server] of Object.entries(mcp.mcpServers ?? {})) {
        checks.push(
          check(
            Array.isArray(server.tools) &&
              server.tools.length > 0 &&
              !server.tools.includes("*"),
            `mcp:${name}:named-tools`,
            "MCP servers must expose a non-empty named-tool allow list.",
          ),
        );
      }
    }
  }
  checks.push(
    check(
      !existsSync(resolve(REPO_ROOT, ".github/copilot/mcp-config.json")),
      "mcp:no-fake-repository-config",
      "Repository MCP settings live in GitHub settings; no fake endpoint is committed.",
    ),
  );

  if (existsSync(resolve(REPO_ROOT, ".github/hooks/agent-boundary.json"))) {
    const hook = JSON.parse(text(".github/hooks/agent-boundary.json"));
    const events = Object.keys(hook.hooks ?? {});
    for (const event of [
      "SessionStart",
      "UserPromptSubmit",
      "PreToolUse",
      "PostToolUse",
      "PostToolUseFailure",
      "SessionEnd",
    ]) {
      checks.push(
        check(events.includes(event), `hook:${event}`, "Required lifecycle event."),
      );
    }
    const lower = events.map((event) => event.toLowerCase());
    checks.push(
      check(
        new Set(lower).size === lower.length,
        "hook:no-case-duplicates",
        "Register one compatibility event name so hooks do not fire twice.",
      ),
    );
  }

  if (existsSync(resolve(REPO_ROOT, ".github/workflows/governed-change.yml"))) {
    const workflow = text(".github/workflows/governed-change.yml");
    checks.push(
      check(
        /group:\s*\$\{\{\s*github\.workflow\s*\}\}-/.test(workflow),
        "workflow:concurrency",
        "Concurrency is scoped by workflow and branch.",
      ),
    );
    for (const job of [
      "plan-contract:",
      "plan-approval:",
      "scope-policy:",
      "quality:",
      "acceptance:",
      "dependency-review:",
      "secret-scan:",
      "codeql:",
      "merge-validation:",
      "governance-policy:",
      "repository-controls:",
      "human-review:",
      "evidence:",
    ]) {
      checks.push(
        check(workflow.includes(job), `workflow:job:${job}`, "Required evidence job."),
      );
    }

    if (
      existsSync(
        resolve(REPO_ROOT, ".github/workflows/daily-repository-status.md"),
      )
    ) {
      const agentic = text(".github/workflows/daily-repository-status.md");
      for (const [id, pattern] of [
        ["strict", /\bstrict:\s*true\b/],
        ["budget", /\bmax-ai-credits:\s*\d+/],
        ["staged-safe-output", /\bstaged:\s*true\b/],
        ["read-only-contents", /\bcontents:\s*read\b/],
      ]) {
        checks.push(
          check(pattern.test(agentic), `agentic:${id}`, "Agentic Workflow guardrail."),
        );
      }
    }

    if (existsSync(resolve(REPO_ROOT, ".github/workflows/publish-evidence.yml"))) {
      const publisher = text(".github/workflows/publish-evidence.yml");
      checks.push(
        check(
          /workflow_run:/.test(publisher) &&
            /repository\.default_branch/.test(publisher) &&
            !/ref:\s*\$\{\{\s*github\.event\.workflow_run\.head_sha/.test(publisher),
          "workflow:trusted-publisher",
          "Write-capable evidence publication executes default-branch code.",
        ),
      );
    }

    if (existsSync(resolve(REPO_ROOT, ".github/workflows/production-gate.yml"))) {
      const production = text(".github/workflows/production-gate.yml");
      checks.push(
        check(
          /environment:\s*production/.test(production) &&
            /group:\s*production/.test(production) &&
            /cancel-in-progress:\s*false/.test(production),
          "workflow:production-boundary",
          "Production is environment-gated and non-overlapping.",
        ),
      );
    }
  }

  if (existsSync(resolve(REPO_ROOT, ".github/CODEOWNERS"))) {
    const owners = text(".github/CODEOWNERS");
    for (const path of ["/.github/", "/migrations/", "/src/services/"]) {
      checks.push(
        check(owners.includes(path), `codeowners:${path}`, "Sensitive path owner."),
      );
    }
  }

  const workflowsDir = resolve(REPO_ROOT, ".github/workflows");
  if (existsSync(workflowsDir)) {
    for (const name of readdirSync(workflowsDir).filter((file) =>
      file.endsWith(".yml"),
    )) {
      const workflow = text(`.github/workflows/${name}`);
      checks.push(
        check(
          !/uses:\s*[^@\s]+@(main|master)\b/.test(workflow),
          `workflow:pinned:${name}`,
          "Actions must not use mutable main or master refs.",
        ),
      );
    }
  }

  return {
    schema: "northstar/governance-report/1",
    generatedAt: new Date().toISOString(),
    policySchema: GOVERNANCE_POLICY.schema,
    reviewCadence: GOVERNANCE_POLICY.reviewCadence,
    ownership: GOVERNANCE_POLICY.ownership,
    checks,
    sourceControlsReady: checks.every(({ ok }) => ok),
    externalControls: Object.fromEntries(
      Object.keys(GOVERNANCE_POLICY.externalControls).map((name) => [
        name,
        "not-verified",
      ]),
    ),
  };
}

function onlineControls() {
  try {
    const api = (path) =>
      JSON.parse(
        execFileSync("gh", ["api", path], {
          cwd: REPO_ROOT,
          encoding: "utf8",
        }),
      );
    const rulesetSummaries = api("repos/{owner}/{repo}/rulesets");
    const rulesets = rulesetSummaries.map(({ id }) =>
      api(`repos/{owner}/{repo}/rulesets/${id}`),
    );
    const repository = api("repos/{owner}/{repo}");
    const defaultBranch = repository.default_branch;
    const protection = api(
      `repos/{owner}/{repo}/branches/${encodeURIComponent(defaultBranch)}/protection`,
    );
    const production = api("repos/{owner}/{repo}/environments/production");
    const applicableRulesets = rulesets.filter((ruleset) =>
      rulesetAppliesToDefaultBranch(ruleset, defaultBranch),
    );
    const ruleTypes = new Set(
      applicableRulesets.flatMap((ruleset) =>
        (ruleset.rules ?? []).map(({ type }) => type),
      ),
    );
    const requiredContexts = new Set([
      ...(protection.required_status_checks?.contexts ?? []),
      ...(protection.required_status_checks?.checks ?? []).map(
        ({ context }) => context,
      ),
      ...applicableRulesets.flatMap((ruleset) =>
        (ruleset.rules ?? [])
          .filter(({ type }) => type === "required_status_checks")
          .flatMap(
            ({ parameters }) =>
              parameters?.required_status_checks?.map(
                ({ context }) => context,
              ) ?? [],
          ),
      ),
    ]);
    const expectedContexts = GOVERNANCE_POLICY.requiredStatusChecks;
    const checks = [
      check(
        applicableRulesets.length > 0,
        "hosted:ruleset",
        "An active branch ruleset targets the default branch.",
      ),
      check(
        ruleTypes.has("pull_request"),
        "hosted:pull-request-required",
        "The applicable ruleset requires pull requests.",
      ),
      check(
        ruleTypes.has("required_status_checks") ||
          Boolean(protection.required_status_checks),
        "hosted:status-check-rule",
        "The default branch requires status checks.",
      ),
      check(
        expectedContexts.every((context) => requiredContexts.has(context)),
        "hosted:required-check-names",
        "Every high-risk required check name is protected.",
      ),
      check(
        protection.required_pull_request_reviews?.require_code_owner_reviews === true,
        "hosted:code-owner-review",
        "Branch protection requires CODEOWNERS review.",
      ),
      check(
        protection.allow_force_pushes?.enabled === false ||
          ruleTypes.has("non_fast_forward"),
        "hosted:block-force-push",
        "Force pushes are blocked.",
      ),
      check(
        protection.allow_deletions?.enabled === false ||
          ruleTypes.has("deletion"),
        "hosted:block-deletion",
        "Branch deletion is blocked.",
      ),
      check(
        Boolean(protection.required_pull_request_reviews) ||
          ruleTypes.has("pull_request"),
        "hosted:restrict-direct-push",
        "Default-branch updates require the pull-request path.",
      ),
      check(
        protection.enforce_admins?.enabled === true,
        "hosted:enforce-admins",
        "Administrators cannot bypass default-branch protection.",
      ),
      check(
        [
          ...(protection.required_pull_request_reviews
            ?.bypass_pull_request_allowances?.users ?? []),
          ...(protection.required_pull_request_reviews
            ?.bypass_pull_request_allowances?.teams ?? []),
          ...(protection.required_pull_request_reviews
            ?.bypass_pull_request_allowances?.apps ?? []),
        ].length === 0,
        "hosted:no-pr-bypass",
        "No branch-protection actor can bypass the pull-request requirement.",
      ),
      check(
        applicableRulesets.every(
          (ruleset) => !hasRulesetBypass(ruleset),
        ),
        "hosted:no-always-bypass",
        "Applicable rulesets have no bypass actor or bypass mode.",
      ),
      check(
        repository.security_and_analysis?.secret_scanning?.status === "enabled",
        "hosted:secret-scanning",
        "GitHub secret scanning is enabled.",
      ),
      check(
        repository.security_and_analysis?.secret_scanning_push_protection?.status ===
          "enabled",
        "hosted:push-protection",
        "GitHub push protection is enabled.",
      ),
      check(
        (production.protection_rules ?? []).some(
          ({ type }) => type === "required_reviewers",
        ),
        "hosted:production-reviewers",
        "The production environment has required reviewers.",
      ),
    ];
    return {
      available: true,
      rulesetCount: rulesets.length,
      checks,
      ready: checks.every(({ ok }) => ok),
      note: "Repository settings APIs were available and evaluated.",
    };
  } catch (error) {
    return {
      available: false,
      rulesetCount: 0,
      checks: [],
      ready: false,
      note:
        `${error.stderr ?? error.message}`.trim().split("\n")[0] ||
        "Repository settings API unavailable.",
    };
  }

}

function valueOf(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function main() {
  const report = auditSourceTree();
  if (!process.argv.includes("--offline")) {
    report.online = onlineControls();
  }
  const target = resolve(
    REPO_ROOT,
    valueOf("--out") ?? "artifacts/governance-report.json",
  );
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const ready = report.sourceControlsReady && report.online?.ready !== false;
  process.stdout.write(
    `governance=${ready ? "pass" : "fail"} checks=${report.checks.length}\n${target}\n`,
  );
  if (!ready) {
    process.exitCode = 1;
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main();
}
