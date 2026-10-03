import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildIssue24ValidationEvidence,
  compareZizmorSarif,
} from "../../scripts/build-execution-report.mjs";
import type { CheckRecord, EvidenceContext } from "../../scripts/evidence-record.mjs";
import { ZIZMOR_IMAGE, ZIZMOR_VERSION } from "../../scripts/check-sarif.mjs";
import { planDigest } from "../../scripts/plan-contract.mjs";
import type { PlanContract } from "../../scripts/plan-contract.mjs";
import { contractFromFile } from "../../scripts/task-contract.mjs";
import type { TaskContract } from "../../scripts/task-contract.mjs";

const temporary: string[] = [];
const taskId = "AES-TRUSTED-ACCEPTANCE-BOOTSTRAP";
const contractDigest = "c".repeat(64);
const baseSha = "b".repeat(40);
const candidateSha = "a".repeat(40);

afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

function temp() {
  const path = mkdtempSync(join(tmpdir(), "northstar-issue24-report-"));
  temporary.push(path);
  return path;
}

function writeJson(root: string, relativePath: string, value: unknown) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function sarif(findings: Array<{
  ruleId: string;
  workflow: string;
  message: string;
  line?: number;
}>) {
  return JSON.stringify({
    version: "2.1.0",
    runs: [{
      tool: { driver: { name: "zizmor", semanticVersion: ZIZMOR_VERSION, rules: [] } },
      invocations: [{ executionSuccessful: true }],
      results: findings.map((finding) => ({
        ruleId: finding.ruleId,
        level: "warning",
        message: { text: finding.message },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: finding.workflow },
            region: { startLine: finding.line ?? 1 },
          },
        }],
      })),
    }],
  });
}

function scannerReport(sarifText: string, findings: Array<{
  ruleId: string;
  workflow: string;
  message: string;
  line?: number;
}>) {
  const bytes = Buffer.from(sarifText, "utf8");
  return {
    ok: findings.length === 0,
    version: ZIZMOR_VERSION,
    image: ZIZMOR_IMAGE,
    files: [".github/workflows/publish-evidence.yml"],
    sourceDigest: "d".repeat(64),
    artifact: "artifacts/zizmor.sarif",
    artifactDigest: createHash("sha256").update(bytes).digest("hex"),
    scannerExitCode: 0,
    exitCode: findings.length === 0 ? 0 : 1,
    errors: [],
    suppressionDirectives: [],
    findings: findings.map((finding) => ({
      file: "artifacts/zizmor.sarif",
      ruleId: finding.ruleId,
      level: "warning",
      suppressed: false,
      uri: finding.workflow,
      line: finding.line ?? 1,
    })),
  };
}

function makeComparison(
  baseFindings: Array<{ ruleId: string; workflow: string; message: string; line?: number }>,
  candidateFindings: Array<{ ruleId: string; workflow: string; message: string; line?: number }>,
) {
  const baseSarifText = sarif(baseFindings);
  const candidateSarifText = sarif(candidateFindings);
  return compareZizmorSarif({
    baseSha,
    candidateSha,
    baseSarifText,
    candidateSarifText,
    baseReport: scannerReport(baseSarifText, baseFindings),
    candidateReport: scannerReport(candidateSarifText, candidateFindings),
  });
}

describe("Issue #24 Zizmor comparison", () => {
  it("records exact SARIF digests and accepts unchanged baseline findings", () => {
    const finding = {
      ruleId: "zizmor/unpinned-uses",
      workflow: ".github/workflows/publish-evidence.yml",
      message: "The action is not pinned to an immutable reference.",
      line: 12,
    };
    const comparison = makeComparison([finding], [{ ...finding, line: 30 }]);

    expect(comparison).toMatchObject({
      schema: "northstar/zizmor-comparison/1",
      baseSha,
      candidateSha,
      base: { findingCount: 1, wrapperExitCode: 1 },
      candidate: { findingCount: 1, wrapperExitCode: 1 },
      noNewFindings: true,
      comparisonPassed: true,
      newFindingCount: 0,
    });
    expect(comparison.base.sarifDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(comparison.candidate.sarifDigest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("fails the comparison when the candidate adds a finding", () => {
    const comparison = makeComparison(
      [],
      [{
        ruleId: "zizmor/unpinned-uses",
        workflow: ".github/workflows/publish-evidence.yml",
        message: "A new unpinned action.",
      }],
    );

    expect(comparison.comparisonPassed).toBe(false);
    expect(comparison.noNewFindings).toBe(false);
    expect(comparison.newFindingCount).toBe(1);
    expect(comparison.findingDeltaByWorkflowRule).toEqual([
      expect.objectContaining({
        ruleId: "zizmor/unpinned-uses",
        workflow: ".github/workflows/publish-evidence.yml",
        added: 1,
      }),
    ]);
  });

  it("rejects scanner, SARIF, suppression, and immutable-base mismatches", () => {
    const baseFindings = [{
      ruleId: "zizmor/artipacked",
      workflow: ".github/workflows/governed-change.yml",
      message: "Credential persistence is enabled.",
    }];
    const candidateFindings = [...baseFindings];
    const baseSarifText = sarif(baseFindings);
    const candidateSarifText = sarif(candidateFindings);
    const baseReport = scannerReport(baseSarifText, baseFindings);
    const candidateReport = {
      ...scannerReport(candidateSarifText, candidateFindings),
      image: "ghcr.io/zizmorcore/zizmor:latest",
      suppressionDirectives: [{
        file: ".github/workflows/governed-change.yml",
        line: 1,
        rules: ["unpinned-uses"],
      }],
    };
    const result = compareZizmorSarif({
      baseSha: "not-a-sha",
      candidateSha,
      baseSarifText,
      candidateSarifText,
      baseReport,
      candidateReport,
    });

    expect(result.comparisonPassed).toBe(false);
    expect(result.errors.join("\n")).toMatch(/base SHA|scanner identity/);
    expect(result.suppressionChanges).toHaveLength(1);
  });
});

describe("Issue #24 task evidence", () => {
  it("proves AC6 only from bound local checks and the exact-base no-new-findings comparison", () => {
    const root = temp();
    const comparison = makeComparison(
      [{
        ruleId: "zizmor/unpinned-uses",
        workflow: ".github/workflows/publish-evidence.yml",
        message: "Existing unpinned action.",
      }],
      [{
        ruleId: "zizmor/unpinned-uses",
        workflow: ".github/workflows/publish-evidence.yml",
        message: "Existing unpinned action.",
        line: 9,
      }],
    );
    writeJson(root, "artifacts/zizmor-comparison.json", comparison);
    const poutineSarif = Buffer.from('{"version":"2.1.0","runs":[]}', "utf8");
    mkdirSync(join(root, "artifacts"), { recursive: true });
    writeFileSync(join(root, "artifacts", "poutine.sarif"), poutineSarif);
    writeJson(root, "artifacts/poutine-report.json", {
      ok: true,
      sourceDigest: "e".repeat(64),
      artifact: "artifacts/poutine.sarif",
      artifactDigest: createHash("sha256").update(poutineSarif).digest("hex"),
      errors: [],
      findings: [],
      exitCode: 0,
    });
    writeJson(root, "package-lock.json", {
      packages: {
        "": { dependencies: { fastify: "5.12.5" } },
        "node_modules/fastify": { version: "5.12.5" },
        "node_modules/brace-expansion": { version: "5.0.12" },
      },
    });
    const audit = {
      metadata: { vulnerabilities: { high: 0, critical: 0 } },
    };
    writeJson(root, "artifacts/dependency-audit.json", audit);
    const controls = {
      schema: "northstar/repository-controls/1",
      sourceControlsReady: true,
      checks: [{ id: "source", ok: true }],
      online: {
        available: false,
        ready: false,
        rulesetCount: 0,
        checks: [{ id: "hosted:branch-controls", ok: false, status: "unavailable" }],
        lookups: [{ id: "ruleset:23998987", state: "unavailable" }],
      },
      externalControls: { requiredStatusChecks: "not-verified" },
    };
    writeJson(root, "artifacts/repository-controls-report.json", controls);

    const fixtureContract = contractFromFile("tests/fixtures/WI-1842.issue.md");
    const contract: TaskContract = {
      ...fixtureContract,
      id: taskId,
      source: {
        ...fixtureContract.source,
        kind: "issue #24",
        issue: 24,
        url: "https://github.com/webmaxru/northstar-orders-api-demo/issues/24",
        trusted: true,
        bodyDigest: contractDigest,
      },
      successCriteria: [{
        id: "AC6",
        statement: "Record exact Issue #24 validation evidence.",
        provenBy: "records task evidence",
      }],
    };
    const plan: PlanContract = {
      schema: "northstar/plan/1",
      taskId,
      contractDigest,
      baseBranch: "agent/implement/aes-surface-evidence",
      baseSha,
      risk: "high",
      objective: "Prove the bootstrap safely.",
      scope: { allowed: ["scripts/**"], prohibited: [] },
      steps: ["Validate the exact source."],
      requiredChecks: ["quality", "acceptance", "dependency-review", "secret-scan"],
      successCriteria: [{ id: "AC6", provenBy: "records task evidence" }],
      evidence: ["Bound report evidence."],
      decisionsAndHandoffs: ["Stop on missing evidence."],
      risks: ["Untrusted artifact."],
      rollbackAndEscalation: ["Fail closed."],
    };
    const checkRecord = (
      id: string,
      artifact?: string,
      recordStatus: CheckRecord["status"] = "pass",
    ) => {
      const bytes = artifact ? readFileSync(join(root, artifact)) : null;
      const record: CheckRecord = {
        schema: "northstar/check-evidence/1",
        id,
        category: id === "dependency-review" || id === "secret-scan" ? "security" : "policy",
        status: recordStatus,
        required: true,
        summary: "Issue #24 fixture evidence.",
        artifact: artifact ?? null,
        artifactDigest: bytes ? createHash("sha256").update(bytes).digest("hex") : null,
        producedAt: "2026-10-03T12:00:00.000Z",
        provenance: {
          repository: "webmaxru/northstar-orders-api-demo",
          taskId,
          contractDigest,
          planDigest: planDigest(plan),
          headSha: candidateSha,
          baseSha,
          runId: "42",
          runAttempt: "1",
          pullRequest: 28,
          executionRunId: "42",
          executionRunAttempt: "1",
          workflow: "Governed Change",
          event: "pull_request",
          actor: "webmaxru",
          source: { headSha: candidateSha, dirty: false },
          validationStartedAt: null,
          job: id,
        },
      };
      return {
        id,
        hostedOnly: id === "repository-controls",
        present: true,
        status: recordStatus,
        valid: id !== "repository-controls",
        reasons: [],
        record,
      };
    };
    const checks = [
      "plan-contract", "scope-policy", "quality", "acceptance", "dependency-review",
      "secret-scan", "merge-validation", "governance-policy",
    ].map((id) => checkRecord(id, id === "dependency-review" ? "artifacts/dependency-audit.json" : undefined));
    checks.push(checkRecord("repository-controls", "artifacts/repository-controls-report.json", "fail"));
    const evidence = buildIssue24ValidationEvidence({
      contract,
      plan,
      checks,
      unit: { present: true, path: "artifacts/unit-junit.xml", tests: 1, passed: true },
      acceptance: { present: true, path: "artifacts/acceptance-junit.xml", tests: 1, passed: true },
      expected: {
        repository: "webmaxru/northstar-orders-api-demo",
        taskId,
        contractDigest,
        planDigest: planDigest(plan),
        headSha: candidateSha,
        baseSha,
        runId: "42",
        runAttempt: "1",
        pullRequest: 28,
        source: { headSha: candidateSha, dirty: false },
        executionRunId: "42",
        executionRunAttempt: "1",
        workflow: "Governed Change",
        event: "pull_request",
        actor: "webmaxru",
        validationStartedAt: null,
      } satisfies EvidenceContext,
      root,
    });

    expect(evidence.localEvidenceComplete).toBe(true);
    expect(evidence.zizmor).toMatchObject({
      noNewFindings: true,
      baseSarifDigest: comparison.base.sarifDigest,
      candidateSarifDigest: comparison.candidate.sarifDigest,
    });
    expect(evidence.repositoryControls?.online.available).toBe(false);

    writeJson(root, "artifacts/zizmor-comparison.json", {
      ...comparison,
      baseSha: "f".repeat(40),
    });
    const stale = buildIssue24ValidationEvidence({
      contract,
      plan,
      checks,
      unit: { present: true, path: "artifacts/unit-junit.xml", tests: 1, passed: true },
      acceptance: { present: true, path: "artifacts/acceptance-junit.xml", tests: 1, passed: true },
      expected: {
        repository: "webmaxru/northstar-orders-api-demo",
        taskId,
        contractDigest,
        planDigest: planDigest(plan),
        headSha: candidateSha,
        baseSha,
        runId: "42",
        runAttempt: "1",
        pullRequest: 28,
        source: { headSha: candidateSha, dirty: false },
        executionRunId: "42",
        executionRunAttempt: "1",
        workflow: "Governed Change",
        event: "pull_request",
        actor: "webmaxru",
        validationStartedAt: null,
      } satisfies EvidenceContext,
      root,
    });
    expect(stale.localEvidenceComplete).toBe(false);
    expect(stale.errors).toContain("Issue #24 Zizmor comparison is missing, stale, or contains new findings.");
  });
});
