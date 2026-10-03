import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ZIZMOR_IMAGE, ZIZMOR_VERSION } from "../../scripts/check-sarif.mjs";

type Finding = {
  ruleId: string;
  workflow: string;
  message: string;
  line?: number;
};

const moduleUrl = new URL("../../scripts/build-execution-report.mjs", import.meta.url).href;
const baseSha = "b".repeat(40);
const candidateSha = "a".repeat(40);

function sarif(findings: Finding[]) {
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

function scannerReport(sarifText: string, findings: Finding[], sourceDigest: string) {
  return {
    ok: findings.length === 0,
    version: ZIZMOR_VERSION,
    image: ZIZMOR_IMAGE,
    files: [".github/workflows/publish-evidence.yml"],
    sourceDigest,
    artifact: "artifacts/zizmor.sarif",
    artifactDigest: createHash("sha256").update(sarifText).digest("hex"),
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

function compare(input: unknown) {
  const runner = [
    `import { compareZizmorSarif } from ${JSON.stringify(moduleUrl)};`,
    "const input = JSON.parse(process.argv[1]);",
    "process.stdout.write(JSON.stringify(compareZizmorSarif(input)));",
  ].join("\n");
  const result = execFileSync(
    process.execPath,
    ["--input-type=module", "-e", runner, JSON.stringify(input)],
    { encoding: "utf8" },
  );
  return JSON.parse(result);
}

function makeComparison(baseFindings: Finding[], candidateFindings: Finding[]) {
  const baseSarifText = sarif(baseFindings);
  const candidateSarifText = sarif(candidateFindings);
  return compare({
    baseSha,
    candidateSha,
    baseSarifText,
    candidateSarifText,
    baseReport: scannerReport(baseSarifText, baseFindings, "d".repeat(64)),
    candidateReport: scannerReport(candidateSarifText, candidateFindings, "e".repeat(64)),
  });
}

describe("Issue #24 Zizmor comparison", () => {
  it("accepts unchanged baseline findings and records exact SARIF digests", () => {
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
    expect(comparison).toMatchObject({
      base: { sarifDigest: expect.stringMatching(/^[0-9a-f]{64}$/) },
      candidate: { sarifDigest: expect.stringMatching(/^[0-9a-f]{64}$/) },
    });
  });

  it("fails the comparison when the candidate adds a finding", () => {
    const comparison = makeComparison([], [{
      ruleId: "zizmor/unpinned-uses",
      workflow: ".github/workflows/publish-evidence.yml",
      message: "A new unpinned action.",
    }]);

    expect(comparison).toMatchObject({
      comparisonPassed: false,
      noNewFindings: false,
      newFindingCount: 1,
      findingDeltaByWorkflowRule: [
        expect.objectContaining({
          ruleId: "zizmor/unpinned-uses",
          workflow: ".github/workflows/publish-evidence.yml",
          added: 1,
        }),
      ],
    });
  });

  it("rejects scanner, SARIF, suppression, and immutable-base mismatches", () => {
    const finding = {
      ruleId: "zizmor/artipacked",
      workflow: ".github/workflows/governed-change.yml",
      message: "Credential persistence is enabled.",
    };
    const baseSarifText = sarif([finding]);
    const candidateSarifText = sarif([finding]);
    const result = compare({
      baseSha: "not-a-sha",
      candidateSha,
      baseSarifText,
      candidateSarifText,
      baseReport: scannerReport(baseSarifText, [finding], "d".repeat(64)),
      candidateReport: {
        ...scannerReport(candidateSarifText, [finding], "e".repeat(64)),
        image: "ghcr.io/zizmorcore/zizmor:latest",
        suppressionDirectives: [{
          file: ".github/workflows/governed-change.yml",
          line: 1,
          rules: ["unpinned-uses"],
        }],
      },
    });

    expect(result).toMatchObject({
      comparisonPassed: false,
      errors: expect.arrayContaining([
        expect.stringContaining("base SHA"),
        expect.stringContaining("scanner identity"),
      ]),
      suppressionChanges: [expect.objectContaining({ kind: "added" })],
    });
  });
});
