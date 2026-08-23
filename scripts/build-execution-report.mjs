/**
 * Build the machine-readable execution report that the pull request links as
 * evidence.
 *
 * The report does not replace GitHub's native artifacts. Commits, workflow
 * runs, JUnit output, and CodeQL SARIF are the evidence. This file is the index
 * that tells a reviewer which of them exist for this run, so "missing evidence"
 * becomes a value a gate can read instead of something a reviewer has to notice.
 *
 * Success criteria are not hardcoded here. They come from the task contract,
 * because this script outlives every work item.
 *
 * Usage: node scripts/build-execution-report.mjs --task <ID> [--out artifacts/report.json]
 * Exit code 1 when a required evidence item is missing or a criterion is unproven.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadTaskContract } from "./task-contract.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");

/** Evidence the report indexes, named after the Microsoft Learn observability model. */
const EVIDENCE = [
  { id: "unit-tests", category: "execution results", path: "artifacts/unit-junit.xml", requiredByDefault: true },
  { id: "acceptance-tests", category: "execution results", path: "artifacts/acceptance-junit.xml", requiredByDefault: true },
  { id: "security-scan", category: "uploaded artifacts", path: "artifacts/codeql", requiredByDefault: false },
];

function readJUnit(relativePath) {
  const absolute = resolve(REPO_ROOT, relativePath);
  if (!existsSync(absolute)) {
    return { present: false };
  }
  const xml = readFileSync(absolute, "utf8");
  const sum = (attribute) =>
    [...xml.matchAll(new RegExp(`<testsuite\\b[^>]*\\b${attribute}="(\\d+)"`, "g"))]
      .reduce((total, match) => total + Number(match[1]), 0);

  const tests = sum("tests");
  const failures = sum("failures");
  const errors = sum("errors");
  const skipped = sum("skipped");
  const names = [...xml.matchAll(/<testcase\b[^>]*\bname="([^"]*)"/g)].map((match) => match[1]);

  return { present: true, tests, failures, errors, skipped, passed: failures + errors === 0, testNames: names };
}

function coverage(criteria, testNames) {
  const haystack = testNames.join(" | ").toLowerCase();
  return criteria.map((criterion) => ({
    id: criterion.id,
    statement: criterion.statement,
    proven: haystack.includes(String(criterion.provenBy).toLowerCase()),
    provenBy: criterion.provenBy,
  }));
}

function parseArgs(argv) {
  const valueOf = (flag) => {
    const index = argv.indexOf(flag);
    return index === -1 ? undefined : argv[index + 1];
  };
  return {
    out: valueOf("--out") ?? "artifacts/report.json",
    task: valueOf("--task"),
    alsoRequire: String(valueOf("--require") ?? "").split(",").filter(Boolean),
  };
}

function build({ alsoRequire, contract }) {
  const unit = readJUnit("artifacts/unit-junit.xml");
  const acceptance = readJUnit("artifacts/acceptance-junit.xml");

  const evidence = EVIDENCE.map((item) => ({
    id: item.id,
    category: item.category,
    path: item.path,
    required: item.requiredByDefault || alsoRequire.includes(item.id),
    present: existsSync(resolve(REPO_ROOT, item.path)),
  }));

  const criteria = coverage(contract.successCriteria, [
    ...(unit.testNames ?? []),
    ...(acceptance.testNames ?? []),
  ]);
  const missingEvidence = evidence.filter((item) => item.required && !item.present).map((item) => item.id);
  const unprovenCriteria = criteria.filter((item) => !item.proven).map((item) => item.id);

  const decision =
    missingEvidence.length > 0 || unprovenCriteria.length > 0
      ? "review_required"
      : unit.passed && acceptance.passed
        ? "ready_for_review"
        : "review_required";

  return {
    schema: "northstar/execution-report/1",
    workItem: contract.id,
    generatedAt: new Date().toISOString(),
    run: {
      repository: process.env.GITHUB_REPOSITORY ?? "local",
      runId: process.env.GITHUB_RUN_ID ?? null,
      sha: process.env.GITHUB_SHA ?? null,
      actor: process.env.GITHUB_ACTOR ?? null,
      workflow: process.env.GITHUB_WORKFLOW ?? null,
    },
    checks: { unit, acceptance },
    successCriteria: criteria,
    evidence,
    missingEvidence,
    unprovenCriteria,
    decision,
  };
}

const { out, alsoRequire, task } = parseArgs(process.argv.slice(2));

const contract = loadTaskContract(task);
if (!contract) {
  process.stderr.write(
    "No task in scope. Pass --task <ID> or set AGENT_TASK. See docs/CONTEXT-ARCHITECTURE.md.\n",
  );
  process.exit(2);
}

const report = build({ alsoRequire, contract });
const target = resolve(REPO_ROOT, out);
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, "utf8");

const summary = [
  `task=${report.workItem}`,
  `decision=${report.decision}`,
  `unit=${report.checks.unit.present ? `${report.checks.unit.tests} tests, ${report.checks.unit.failures + report.checks.unit.errors} failed` : "absent"}`,
  `acceptance=${report.checks.acceptance.present ? `${report.checks.acceptance.tests} tests, ${report.checks.acceptance.failures + report.checks.acceptance.errors} failed` : "absent"}`,
  `criteriaProven=${report.successCriteria.filter((c) => c.proven).length}/${report.successCriteria.length}`,
].join("  ");

process.stdout.write(`${summary}\n${target}\n`);

if (report.decision !== "ready_for_review") {
  process.stdout.write(
    `missing evidence: ${report.missingEvidence.join(", ") || "none"}; unproven criteria: ${report.unprovenCriteria.join(", ") || "none"}\n`,
  );
  process.exitCode = 1;
}
