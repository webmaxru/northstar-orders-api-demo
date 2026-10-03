import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  isResolvedPullRequest,
  loadResolvedWorkflowRun,
} from "./resolve-workflow-run.mjs";

export function selectWorkflowPullRequest({
  pulls,
  sha,
  repository,
  defaultBranch,
  expectedNumber,
  allowMerged = false,
  expectedBaseSha,
  expectedBaseRef,
}) {
  if (!/^[0-9a-f]{40}$/.test(sha ?? "")) {
    throw new Error("Pull request resolution requires an immutable commit SHA.");
  }
  if (!/^[^/\s]+\/[^/\s]+$/.test(repository ?? "")) {
    throw new Error("Pull request resolution requires an exact repository name.");
  }
  if (
    expectedNumber !== undefined &&
    (!Number.isSafeInteger(Number(expectedNumber)) || Number(expectedNumber) < 1)
  ) {
    throw new Error("Expected pull request number must be a positive integer.");
  }
  const matchesState = (pull) => pull.state === "open" ||
    (allowMerged && pull.state === "closed" && pull.merged === true &&
      typeof pull.merged_at === "string" && /^[0-9a-f]{40}$/i.test(pull.merge_commit_sha ?? ""));
  const matches = (pulls ?? []).filter(
    (pull) =>
      matchesState(pull) &&
      pull.head?.sha === sha &&
      pull.head?.repo?.full_name === repository &&
      pull.base?.repo?.full_name === repository &&
      (defaultBranch === undefined || pull.base?.ref === defaultBranch) &&
      (expectedBaseSha === undefined || pull.base?.sha === expectedBaseSha) &&
      (expectedBaseRef === undefined || pull.base?.ref === expectedBaseRef) &&
      (expectedNumber === undefined ||
        Number(pull.number) === Number(expectedNumber)),
  );
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one open same-repository pull request for ${sha} and the declared base; found ${matches.length}.`,
    );
  }
  return matches[0];
}

function gh(args) {
  return JSON.parse(
    execFileSync("gh", ["api", ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
}

function valueOf(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function main() {
  const sha = valueOf("--sha");
  const repository = process.env.GITHUB_REPOSITORY;
  if (!sha || !repository) {
    process.stderr.write("--sha and GITHUB_REPOSITORY are required.\n");
    process.exit(2);
  }
  try {
    const migrationMode = process.env.NORTHSTAR_MIGRATION_MODE === "bootstrap-migration";
    const resolved = migrationMode ? loadResolvedWorkflowRun() : null;
    if (migrationMode && (
      process.env.GITHUB_ACTIONS !== "true" ||
      process.env.GITHUB_WORKFLOW !== "System Maintenance Approval" ||
      process.env.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
      process.env.GITHUB_ACTOR !== process.env.NORTHSTAR_DISPATCH_APP_LOGIN
    )) {
      throw new Error("Merged pull-request resolution is restricted to validated protected maintenance.");
    }
    const pages = JSON.parse(gh([
      "api",
      "--paginate",
      "--slurp",
      `repos/${repository}/commits/${sha}/pulls?per_page=100`,
    ]));
    if (!Array.isArray(pages) || !pages.every(Array.isArray)) {
      throw new Error("Pull request pagination did not return complete pages.");
    }
    const pulls = pages.flat();
    const pull = selectWorkflowPullRequest({
      pulls,
      sha,
      repository,
      expectedNumber: process.env.PR_NUMBER,
      allowMerged: Boolean(resolved),
      expectedBaseSha: resolved ? undefined : process.env.BASE_SHA || undefined,
      expectedBaseRef: process.env.BASE_BRANCH || process.env.GITHUB_BASE_REF || undefined,
    });
    if (resolved && !isResolvedPullRequest(resolved, pull)) {
      throw new Error("The merged pull request differs from its exact protected resolution.");
    }
    if (process.env.GITHUB_ENV) {
      appendFileSync(
        process.env.GITHUB_ENV,
        `PR_NUMBER=${pull.number}\nBASE_BRANCH=${pull.base.ref}\n`,
        "utf8",
      );
    }
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `pull_request=${pull.number}\nbase_branch=${pull.base.ref}\n`,
        "utf8",
      );
    }
    process.stdout.write(
      `pull_request=${pull.number} head=${pull.head.sha} base=${pull.base.ref}\n`,
    );
  } catch (error) {
    process.stderr.write(`${/** @type {Error} */ (error).message}\n`);
    process.exit(1);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main();
}
