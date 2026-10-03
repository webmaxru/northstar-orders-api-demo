/**
 * Build the machine-readable execution report used by the final evidence gate.
 *
 * Every producer emits a northstar/check-evidence/1 envelope bound to the
 * task, plan, source, and exact run attempt. Local validation can reach
 * ready_for_review, including when a validated plan explicitly defers a
 * criterion to post-acceptance. Deferred criteria remain unverified and block
 * ready_for_acceptance.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { Buffer } from "node:buffer";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  evidenceContext,
  evidencePath,
  hasLiveTaskIdentity,
  readEvidenceJson,
  validateCheckRecord,
} from "./evidence-record.mjs";
import {
  planDigest,
  validatePlanContract,
} from "./plan-contract.mjs";
import { loadTaskContract } from "./task-contract.mjs";
import { validateSarif, ZIZMOR_IMAGE, ZIZMOR_VERSION } from "./check-sarif.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const ISSUE24_TASK_ID = "AES-TRUSTED-ACCEPTANCE-BOOTSTRAP";
const ISSUE24_COMPARISON_SCHEMA = "northstar/zizmor-comparison/1";
const SHA = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const HOSTED_ONLY_CHECKS = new Set([
  "plan-approval",
  "codeql",
  "human-review",
  "production-environment",
  "repository-controls",
  "validation-authority",
  "browser-plan-canary",
]);
function decodeXml(value) {
  return String(value)
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) =>
      String.fromCodePoint(code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code)))
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function xmlTree(xml) {
  const root = { name: "", children: [] };
  const stack = [root];
  const tokens = /<!--[\s\S]*?-->|<\?xml\b[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<\/?[A-Za-z_][^<>]*>|[^<]+/g;
  let offset = 0;
  for (const token of xml.matchAll(tokens)) {
    if (token.index !== offset) throw new Error("Malformed XML token.");
    offset += token[0].length;
    const text = token[0];
    if (/^(<!--|<\?xml|<!\[CDATA\[)/.test(text)) continue;
    if (!text.startsWith("<")) {
      if ((stack.length === 1 && text.trim()) || /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i.test(text)) {
        throw new Error("Malformed XML text.");
      }
      continue;
    }
    if (text.startsWith("</")) {
      const close = /^<\/([A-Za-z_][\w:.-]*)\s*>$/.exec(text);
      if (stack.length === 1 || close?.[1] !== stack.at(-1).name) {
        throw new Error("Mismatched XML closing tag.");
      }
      stack.pop();
      continue;
    }
    const open = /^<([A-Za-z_][\w:.-]*)([\s\S]*?)(\/?)>$/.exec(text);
    if (!open) throw new Error("Malformed XML opening tag.");
    const attributes = {};
    const attributesText = open[2];
    const pattern = /\s+([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let consumed = 0;
    for (const attribute of attributesText.matchAll(pattern)) {
      const value = attribute[2] ?? attribute[3];
      if (attribute.index !== consumed || Object.hasOwn(attributes, attribute[1]) ||
        /<|&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i.test(value)) {
        throw new Error("Malformed XML attribute.");
      }
      consumed += attribute[0].length;
      attributes[attribute[1]] = decodeXml(value);
    }
    if (attributesText.slice(consumed).trim()) throw new Error("Malformed XML attributes.");
    const node = { name: open[1], attributes, children: [] };
    stack.at(-1).children.push(node);
    if (!open[3]) stack.push(node);
  }
  if (offset !== xml.length || stack.length !== 1 || root.children.length !== 1) {
    throw new Error("Incomplete XML document.");
  }
  return root.children[0];
}

function descendants(node, name) {
  return node.children.flatMap((child) => [
    ...(child.name === name ? [child] : []), ...descendants(child, name),
  ]);
}

export function parseJUnit(xml, relativePath = "<memory>") {
  try {
    const tree = xmlTree(xml);
    if (!["testsuites", "testsuite"].includes(tree.name)) throw new Error("JUnit root is not a test suite.");
    const children = {
      testsuites: ["testsuite"],
      testsuite: ["testsuite", "testcase", "properties", "system-out", "system-err"],
      testcase: ["failure", "error", "skipped", "properties", "system-out", "system-err"],
      properties: ["property"], property: [],
      failure: [], error: [], skipped: [], "system-out": [], "system-err": [],
    };
    const validateChildren = (node) => {
      if (!children[node.name] || node.children.some((child) => !children[node.name].includes(child.name))) {
        throw new Error("Invalid JUnit element nesting.");
      }
      node.children.forEach(validateChildren);
    };
    validateChildren(tree);
    const suites = tree.name === "testsuite" ? [tree, ...descendants(tree, "testsuite")] : descendants(tree, "testsuite");
    if (suites.length === 0) throw new Error("JUnit has no test suites.");
    const cases = descendants(tree, "testcase");
    if (cases.some((node) => typeof node.attributes.name !== "string" || !node.attributes.name.trim())) {
      throw new Error("JUnit testcase name is missing.");
    }
    const count = (nodes, tag) => nodes.filter((node) => node.children.some(({ name }) => name === tag)).length;
    const counters = (nodes) => ({
      tests: nodes.length, failures: count(nodes, "failure"), errors: count(nodes, "error"), skipped: count(nodes, "skipped"),
    });
    for (const suite of [...suites, ...(tree.name === "testsuites" ? [tree] : [])]) {
      const actual = counters(descendants(suite, "testcase"));
      for (const [attribute, value] of Object.entries(actual)) {
        const declared = suite.attributes[attribute];
        if (declared === undefined && (suite.name === "testsuites" || attribute === "skipped")) continue;
        if (!/^\d+$/.test(declared ?? "") || Number(declared) !== value) {
          throw new Error(`JUnit ${attribute} count does not match its testcases.`);
        }
      }
    }
    const counts = counters(cases);
    const passed = counts.failures + counts.errors === 0 && counts.tests > counts.skipped;
    return {
      present: true,
      path: relativePath,
      ...counts,
      passed,
      validationErrors: [],
      testNames: cases.filter((node) => !node.children.some(({ name }) =>
        ["failure", "error", "skipped"].includes(name))).map(({ attributes }) => attributes.name),
      skippedTestNames: cases.filter((node) => node.children.some(({ name }) =>
        name === "skipped")).map(({ attributes }) => attributes.name),
    };
  } catch (error) {
    return {
      present: true, path: relativePath, passed: false,
      tests: 0, failures: 0, errors: 0, skipped: 0, testNames: [], skippedTestNames: [],
      validationErrors: [`Malformed JUnit: ${error.message}`],
    };
  }
}

export function readJUnit(relativePath, root = REPO_ROOT) {
  try {
    const bytes = readFileSync(evidencePath(relativePath, root));
    return {
      ...parseJUnit(bytes.toString("utf8"), relativePath),
      digest: createHash("sha256").update(bytes).digest("hex"),
    };
  } catch (error) {
    return {
      present: false, path: relativePath, passed: false,
      validationErrors: [`JUnit unavailable: ${error.message}`],
    };
  }
}

export function criterionCoverage(criteria, testNames) {
  const leafNames = new Set(
    testNames.map((name) => name.split(" > ").at(-1)?.trim().toLowerCase()),
  );
  return criteria.map((criterion) => ({
    id: criterion.id,
    statement: criterion.statement,
    proven: leafNames.has(String(criterion.provenBy).trim().toLowerCase()),
    provenBy: criterion.provenBy,
  }));
}

export function loadCheckRecords(directory = "artifacts/checks", root = REPO_ROOT) {
  const absolute = evidencePath(directory, root);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute)
    .filter((name) => name.endsWith(".json") && !name.startsWith(".") && name !== "source-run.json")
    .sort()
    .map((name) => readEvidenceJson(resolve(absolute, name), root));
}

function readRegularArtifact(relativePath, root) {
  const path = evidencePath(relativePath, root);
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`${relativePath} must be a regular file.`);
  }
  const bytes = readFileSync(path);
  if (bytes.length === 0) throw new Error(`${relativePath} is empty.`);
  return bytes;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function findingRows(sarif, label, errors) {
  const validation = validateSarif(sarif, label);
  errors.push(...validation.errors);
  return (sarif.runs ?? []).flatMap((run) => (run.results ?? []).map((result) => {
    const location = result.locations?.find(({ physicalLocation }) =>
      typeof physicalLocation?.artifactLocation?.uri === "string");
    const workflow = location?.physicalLocation?.artifactLocation?.uri?.replace(/^\.\/+/, "");
    const ruleId = result.ruleId ?? run.tool?.driver?.rules?.[result.ruleIndex]?.id;
    const message = result.message?.text ?? result.message?.markdown ?? result.message?.id;
    const level = result.level ?? "warning";
    if (
      typeof workflow !== "string" || !workflow.startsWith(".github/workflows/") ||
      typeof ruleId !== "string" || !ruleId.trim() ||
      typeof message !== "string" || !message.trim()
    ) {
      errors.push(`${label}: every Zizmor finding must bind a workflow, rule, and message.`);
    }
    return {
      ruleId: typeof ruleId === "string" ? ruleId : "<invalid-rule>",
      workflow: typeof workflow === "string" ? workflow : "<invalid-workflow>",
      level,
      message,
      messageDigest: sha256(Buffer.from(String(message ?? ""), "utf8")),
      suppressed: Array.isArray(result.suppressions) && result.suppressions.length > 0,
    };
  }));
}

function scannerSummaryFindings(report) {
  return (report.findings ?? []).map((finding) => ({
    ruleId: finding.ruleId,
    workflow: String(finding.uri ?? "").replace(/^\.\/+/, ""),
    level: finding.level ?? "warning",
    suppressed: finding.suppressed === true,
    line: Number.isSafeInteger(finding.line) ? finding.line : null,
  }));
}

function sarifSummaryFindings(sarif, label, errors) {
  const validation = validateSarif(sarif, label);
  errors.push(...validation.errors);
  return validation.findings.map((finding) => ({
    ruleId: finding.ruleId,
    workflow: String(finding.uri ?? "").replace(/^\.\/+/, ""),
    level: finding.level ?? "warning",
    suppressed: finding.suppressed === true,
    line: Number.isSafeInteger(finding.line) ? finding.line : null,
  }));
}

function sameRows(left, right) {
  const canonical = (rows) => rows
    .map(({ ruleId, workflow, level, suppressed, line }) =>
      JSON.stringify([ruleId, workflow, level, suppressed, line]))
    .sort();
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function suppressionKeys(report, label, errors) {
  if (!Array.isArray(report.suppressionDirectives)) {
    errors.push(`${label}: suppression directive inventory is missing.`);
    return [];
  }
  const keys = [];
  for (const directive of report.suppressionDirectives) {
    if (
      typeof directive?.file !== "string" ||
      !Number.isSafeInteger(directive.line) || directive.line < 1 ||
      !Array.isArray(directive.rules) ||
      directive.rules.some((rule) => typeof rule !== "string" || !rule.trim())
    ) {
      errors.push(`${label}: malformed suppression directive inventory.`);
      continue;
    }
    keys.push(JSON.stringify([
      directive.file.replace(/\\/g, "/"),
      [...directive.rules].sort(),
    ]));
  }
  return keys.sort();
}

function validateZizmorScan(report, label, bytes, sarif, errors) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    errors.push(`${label}: scanner report is missing or malformed.`);
    return;
  }
  if (report.version !== ZIZMOR_VERSION || report.image !== ZIZMOR_IMAGE) {
    errors.push(`${label}: scanner identity does not match pinned Zizmor ${ZIZMOR_VERSION}.`);
  }
  if (!SHA256.test(report.sourceDigest ?? "")) errors.push(`${label}: source digest is missing.`);
  if (report.artifact !== "artifacts/zizmor.sarif") errors.push(`${label}: SARIF artifact path is unexpected.`);
  if (!SHA256.test(report.artifactDigest ?? "") || report.artifactDigest !== sha256(bytes)) {
    errors.push(`${label}: SARIF digest does not match the scanner report.`);
  }
  if (report.scannerExitCode !== 0) errors.push(`${label}: Zizmor did not complete successfully.`);
  if (!Array.isArray(report.errors) || report.errors.length > 0) errors.push(`${label}: scanner reported errors.`);
  if (!Array.isArray(report.findings) || !Array.isArray(report.files) || report.files.length === 0) {
    errors.push(`${label}: scanner file or finding inventory is missing.`);
  }
  if (
    !Array.isArray(sarif.runs) || sarif.runs.length === 0 ||
    sarif.runs.some((run) =>
      !Array.isArray(run.invocations) ||
      run.invocations.length === 0 ||
      run.invocations.some((invocation) => invocation.executionSuccessful !== true))
  ) {
    errors.push(`${label}: SARIF does not attest successful scanner execution.`);
  }
  if (
    !Number.isSafeInteger(report.exitCode) ||
    report.exitCode !== (report.findings?.length > 0 || report.errors?.length > 0 ? 1 : 0) ||
    !Number.isSafeInteger(report.findings?.length) ||
    report.ok !== (report.findings?.length === 0 && report.errors?.length === 0) ||
    report.exitCode !== (report.ok ? 0 : 1)
  ) {
    errors.push(`${label}: scanner result summary is malformed.`);
  }
  const sarifRows = sarifSummaryFindings(sarif, label, errors);
  const summaryRows = scannerSummaryFindings(report);
  if (!sameRows(summaryRows, sarifRows)) errors.push(`${label}: finding summary does not match its SARIF.`);
  if (report.findings?.some(({ suppressed }) => suppressed === true)) {
    errors.push(`${label}: SARIF contains suppressed findings.`);
  }
}

/**
 * Compare immutable-base and candidate Zizmor evidence. The raw scan may have
 * pre-existing findings; this records that scanner outcome separately from
 * whether the candidate introduced any findings.
 */
export function compareZizmorSarif({
  baseSha,
  candidateSha,
  baseSarifText,
  candidateSarifText,
  baseReport,
  candidateReport,
}) {
  const errors = [];
  if (!SHA.test(baseSha ?? "")) errors.push("Approved base SHA is missing or invalid.");
  if (!SHA.test(candidateSha ?? "")) errors.push("Candidate SHA is missing or invalid.");

  let baseSarif;
  let candidateSarif;
  try {
    baseSarif = JSON.parse(baseSarifText);
  } catch {
    errors.push("Base Zizmor SARIF is invalid JSON.");
  }
  try {
    candidateSarif = JSON.parse(candidateSarifText);
  } catch {
    errors.push("Candidate Zizmor SARIF is invalid JSON.");
  }

  const baseBytes = Buffer.from(String(baseSarifText ?? ""), "utf8");
  const candidateBytes = Buffer.from(String(candidateSarifText ?? ""), "utf8");
  if (baseSarif) validateZizmorScan(baseReport, "Base scan", baseBytes, baseSarif, errors);
  if (candidateSarif) validateZizmorScan(candidateReport, "Candidate scan", candidateBytes, candidateSarif, errors);

  const baseFindings = baseSarif
    ? findingRows(baseSarif, "Base scan", errors)
    : [];
  const candidateFindings = candidateSarif
    ? findingRows(candidateSarif, "Candidate scan", errors)
    : [];
  const signature = ({ ruleId, workflow, level, message }) =>
    JSON.stringify([ruleId, workflow, level, message]);
  const signatureMap = (rows) => {
    const map = new Map();
    for (const row of rows) {
      const key = signature(row);
      const count = map.get(key) ?? 0;
      map.set(key, count + 1);
    }
    return map;
  };
  const sarifFindings = (sarif, rows) => {
    let index = 0;
    return (sarif?.runs ?? []).flatMap((run) => (run.results ?? []).map(() => {
      const row = rows[index++];
      return row;
    }));
  };
  const baseRows = sarifFindings(baseSarif, baseFindings);
  const candidateRows = sarifFindings(candidateSarif, candidateFindings);
  const baseSignatures = signatureMap(baseRows);
  const candidateSignatures = signatureMap(candidateRows);
  const newFindingSignatures = [];
  for (const [key, count] of candidateSignatures) {
    const extra = count - (baseSignatures.get(key) ?? 0);
    if (extra > 0) {
      const [ruleId, workflow, level, message] = JSON.parse(key);
      newFindingSignatures.push({
        ruleId,
        workflow,
        level,
        messageDigest: sha256(Buffer.from(String(message), "utf8")),
        count: extra,
      });
    }
  }

  const groupCounts = (rows) => {
    const counts = new Map();
    for (const row of rows) {
      const key = JSON.stringify([row.ruleId, row.workflow]);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  };
  const baseGroups = groupCounts(baseFindings);
  const candidateGroups = groupCounts(candidateFindings);
  const findingDeltaByWorkflowRule = [...new Set([...baseGroups.keys(), ...candidateGroups.keys()])]
    .sort()
    .map((key) => {
      const [ruleId, workflow] = JSON.parse(key);
      const baseCount = baseGroups.get(key) ?? 0;
      const candidateCount = candidateGroups.get(key) ?? 0;
      return {
        ruleId,
        workflow,
        baseCount,
        candidateCount,
        added: Math.max(0, candidateCount - baseCount),
        removed: Math.max(0, baseCount - candidateCount),
      };
    })
    .filter(({ added, removed }) => added > 0 || removed > 0);

  const baseSuppressions = suppressionKeys(baseReport ?? {}, "Base scan", errors);
  const candidateSuppressions = suppressionKeys(candidateReport ?? {}, "Candidate scan", errors);
  const suppressionChanges = [
    ...baseSuppressions.filter((key) => !candidateSuppressions.includes(key)).map((key) => ({ kind: "removed", key })),
    ...candidateSuppressions.filter((key) => !baseSuppressions.includes(key)).map((key) => ({ kind: "added", key })),
  ];
  const newFindingCount = newFindingSignatures.reduce((sum, finding) => sum + finding.count, 0);
  const noNewFindings = newFindingCount === 0 && suppressionChanges.length === 0;
  return {
    schema: "northstar/zizmor-comparison/1",
    baseSha,
    candidateSha,
    tool: { name: "zizmor", version: ZIZMOR_VERSION, image: ZIZMOR_IMAGE },
    base: {
      sourceDigest: baseReport?.sourceDigest ?? null,
      sarifDigest: baseReport?.artifactDigest ?? null,
      scannerExitCode: baseReport?.scannerExitCode ?? null,
      wrapperExitCode: baseReport?.exitCode ?? null,
      findingCount: baseFindings.length,
    },
    candidate: {
      sourceDigest: candidateReport?.sourceDigest ?? null,
      sarifDigest: candidateReport?.artifactDigest ?? null,
      scannerExitCode: candidateReport?.scannerExitCode ?? null,
      wrapperExitCode: candidateReport?.exitCode ?? null,
      findingCount: candidateFindings.length,
    },
    findingDeltaByWorkflowRule,
    newFindings: newFindingSignatures,
    newFindingCount,
    suppressionChanges,
    noNewFindings,
    comparisonPassed: errors.length === 0 && noNewFindings,
    errors,
  };
}

function compareZizmorArtifacts() {
  const baseSha = valueOf("--base-sha") ?? process.env.BASE_SHA;
  const candidateSha = valueOf("--candidate-sha") ?? process.env.NORTHSTAR_HEAD_SHA;
  const git = (args) => execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  if (git(["status", "--porcelain"])) {
    throw new Error("Zizmor comparison requires a clean, commit-bound candidate worktree.");
  }
  if (!SHA.test(baseSha ?? "") || git(["rev-parse", "--verify", `${baseSha}^{commit}`]) !== baseSha) {
    throw new Error("The Zizmor comparison base is not the exact local commit.");
  }
  if (git(["rev-parse", "HEAD"]) !== candidateSha) {
    throw new Error("The Zizmor comparison candidate is not the checked-out HEAD.");
  }
  const baseSarif = readRegularArtifact("artifacts/zizmor-base.sarif", REPO_ROOT);
  const candidateSarif = readRegularArtifact("artifacts/zizmor.sarif", REPO_ROOT);
  const comparison = compareZizmorSarif({
    baseSha,
    candidateSha,
    baseSarifText: baseSarif.toString("utf8"),
    candidateSarifText: candidateSarif.toString("utf8"),
    baseReport: readEvidenceJson("artifacts/zizmor-base-report.json", REPO_ROOT),
    candidateReport: readEvidenceJson("artifacts/zizmor-candidate-report.json", REPO_ROOT),
  });
  const output = evidencePath("artifacts/zizmor-comparison.json", REPO_ROOT);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(comparison, null, 2)}\n`, "utf8");
  process.stdout.write(
    `zizmor base=${comparison.baseSha} candidate=${comparison.candidateSha} ` +
    `baseFindings=${comparison.base.findingCount} candidateFindings=${comparison.candidate.findingCount} ` +
    `newFindings=${comparison.newFindingCount} comparison=${comparison.comparisonPassed ? "pass" : "fail"}\n`,
  );
  if (!comparison.comparisonPassed) process.exitCode = 1;
}

export function buildIssue24ValidationEvidence({
  contract,
  plan,
  checks,
  unit,
  acceptance,
  expected,
  root = REPO_ROOT,
}) {
  const errors = [];
  if (!plan || !SHA.test(plan.baseSha ?? "")) {
    errors.push("The approved Issue #24 plan base is missing or invalid.");
  }
  if (expected?.baseSha !== plan?.baseSha) {
    errors.push("The Issue #24 evidence base does not match the approved plan.");
  }
  if (!SHA.test(expected?.source?.headSha ?? "")) {
    errors.push("The Issue #24 candidate head is missing or invalid.");
  }
  const checkById = new Map(checks.map((check) => [check.id, check]));
  const passed = (id) => {
    const check = checkById.get(id);
    return Boolean(check?.present && check.valid && check.status === "pass");
  };
  const localCheckIds = [
    "plan-contract", "scope-policy", "quality", "acceptance",
    "dependency-review", "secret-scan", "merge-validation", "governance-policy",
  ];
  for (const id of localCheckIds) {
    if (!passed(id)) errors.push(`Required Issue #24 local check is not passing: ${id}.`);
  }
  if (!unit.present || !unit.passed || Number(unit.tests ?? 0) < 1) {
    errors.push("Issue #24 unit test evidence is missing or failed.");
  }
  if (!acceptance.present || !acceptance.passed || Number(acceptance.tests ?? 0) < 1) {
    errors.push("Issue #24 acceptance evidence is missing or failed.");
  }

  let comparison = null;
  try {
    comparison = readEvidenceJson("artifacts/zizmor-comparison.json", root);
  } catch (error) {
    errors.push(`Issue #24 Zizmor comparison is unavailable (${error.code ?? error.message}).`);
  }
  const validScanOutcome = (scan) =>
    scan?.scannerExitCode === 0 &&
    Number.isSafeInteger(scan.wrapperExitCode) &&
    [0, 1].includes(scan.wrapperExitCode) &&
    Number.isSafeInteger(scan.findingCount) &&
    scan.findingCount >= 0 &&
    scan.wrapperExitCode === (scan.findingCount > 0 ? 1 : 0);
  if (
    comparison?.schema !== ISSUE24_COMPARISON_SCHEMA ||
    comparison.baseSha !== plan?.baseSha ||
    comparison.candidateSha !== expected?.source?.headSha ||
    comparison.tool?.name !== "zizmor" ||
    comparison.tool?.version !== ZIZMOR_VERSION ||
    comparison.tool?.image !== ZIZMOR_IMAGE ||
    !Array.isArray(comparison.errors) || comparison.errors.length !== 0 ||
    !Array.isArray(comparison.newFindings) || comparison.newFindings.length !== 0 ||
    !Array.isArray(comparison.suppressionChanges) || comparison.suppressionChanges.length !== 0 ||
    !validScanOutcome(comparison.base) ||
    !validScanOutcome(comparison.candidate) ||
    comparison.comparisonPassed !== true ||
    comparison.noNewFindings !== true ||
    comparison.newFindingCount !== 0 ||
    !SHA256.test(comparison.base?.sarifDigest ?? "") ||
    !SHA256.test(comparison.candidate?.sarifDigest ?? "") ||
    !SHA256.test(comparison.base?.sourceDigest ?? "") ||
    !SHA256.test(comparison.candidate?.sourceDigest ?? "")
  ) {
    errors.push("Issue #24 Zizmor comparison is missing, stale, or contains new findings.");
  }

  let compile = null;
  try {
    compile = readEvidenceJson("artifacts/poutine-report.json", root);
  } catch (error) {
    errors.push(`Issue #24 agentic:compile evidence is unavailable (${error.code ?? error.message}).`);
  }
  let poutineSarifDigest = null;
  if (
    compile?.ok !== true ||
    !Array.isArray(compile.errors) || compile.errors.length > 0 ||
    !Array.isArray(compile.findings) || compile.findings.length > 0 ||
    !Array.isArray(compile.tools) ||
    !compile.tools.some(({ name }) => typeof name === "string" && /poutine/i.test(name)) ||
    compile.artifact !== "artifacts/poutine.sarif" ||
    compile.exitCode !== 0 ||
    !SHA256.test(compile.sourceDigest ?? "")
  ) {
    errors.push("Issue #24 agentic:compile evidence is invalid or failed.");
  }
  try {
    const poutineSarif = readRegularArtifact("artifacts/poutine.sarif", root);
    poutineSarifDigest = sha256(poutineSarif);
    const poutineValidation = validateSarif(
      JSON.parse(poutineSarif.toString("utf8")),
      "artifacts/poutine.sarif",
    );
    if (
      !poutineValidation.ok ||
      !poutineValidation.tools.some(({ name }) => /poutine/i.test(name)) ||
      poutineValidation.tools.length !== compile?.tools?.length ||
      JSON.stringify(poutineValidation.tools) !== JSON.stringify(compile?.tools) ||
      poutineValidation.findings.length !== compile?.findings?.length
    ) {
      errors.push("Issue #24 agentic:compile SARIF does not match its scanner report.");
    }
    if (compile?.artifactDigest && compile.artifactDigest !== poutineSarifDigest) {
      errors.push("Issue #24 agentic:compile SARIF digest does not match its report.");
    }
  } catch (error) {
    errors.push(`Issue #24 agentic:compile SARIF is unavailable (${error.code ?? error.message}).`);
  }

  let packageLock = null;
  let audit = null;
  const auditCheck = checkById.get("dependency-review");
  try {
    packageLock = readEvidenceJson("package-lock.json", root);
  } catch (error) {
    errors.push(`Issue #24 package-lock evidence is unavailable (${error.code ?? error.message}).`);
  }
  try {
    if (!auditCheck?.record?.artifact) throw new Error("dependency audit artifact is missing");
    audit = readEvidenceJson(auditCheck.record.artifact, root);
  } catch (error) {
    errors.push(`Issue #24 dependency audit evidence is unavailable (${error.code ?? error.message}).`);
  }
  const fastifyVersion = packageLock?.packages?.["node_modules/fastify"]?.version ?? null;
  const braceExpansion = Object.entries(packageLock?.packages ?? {})
    .filter(([path]) => path === "node_modules/brace-expansion" || path.endsWith("/node_modules/brace-expansion"))
    .map(([path, entry]) => ({ path, version: entry?.version ?? null }));
  const versionAtLeast = (version, minimum) => {
    const parse = (value) => /^(\d+)\.(\d+)\.(\d+)$/.exec(value ?? "")?.slice(1).map(Number) ?? null;
    const actual = parse(version);
    const required = parse(minimum);
    if (!actual || !required) return false;
    for (let index = 0; index < 3; index += 1) {
      if (actual[index] > required[index]) return true;
      if (actual[index] < required[index]) return false;
    }
    return true;
  };
  const vulnerabilities = audit?.metadata?.vulnerabilities;
  if (fastifyVersion !== "5.12.5") errors.push("Fastify is not pinned to the Issue #24 version 5.12.5.");
  if (
    braceExpansion.length === 0 ||
    braceExpansion.some(({ version }) => !versionAtLeast(version, "5.0.12"))
  ) {
    errors.push("A locked brace-expansion version is below the Issue #24 minimum 5.0.12.");
  }
  if (vulnerabilities?.high !== 0 || vulnerabilities?.critical !== 0) {
    errors.push("The Issue #24 dependency audit does not prove zero high or critical advisories.");
  }

  let repositoryControls = null;
  const controlsCheck = checkById.get("repository-controls");
  try {
    if (!controlsCheck?.record?.artifact) throw new Error("repository-controls artifact is missing");
    const report = readEvidenceJson(controlsCheck.record.artifact, root);
    const provenance = controlsCheck.record.provenance;
    if (
      !Array.isArray(report.checks) ||
      !Array.isArray(report.online?.checks) ||
      !Array.isArray(report.online?.lookups) ||
      !report.externalControls ||
      typeof report.sourceControlsReady !== "boolean" ||
      provenance?.repository !== expected.repository ||
      provenance?.taskId !== contract.id ||
      provenance?.contractDigest !== contract.source.bodyDigest ||
      provenance?.planDigest !== (plan ? planDigest(plan) : null) ||
      provenance?.headSha !== expected.source.headSha ||
      provenance?.baseSha !== expected.baseSha ||
      provenance?.runId !== expected.runId ||
      provenance?.runAttempt !== expected.runAttempt
    ) {
      throw new Error("repository-controls report is malformed");
    }
    if (!report.online.lookups.some(({ id }) => id === "ruleset:23998987")) {
      throw new Error("repository-controls report does not record ruleset 23998987.");
    }
    repositoryControls = {
      check: {
        present: controlsCheck.present,
        status: controlsCheck.status,
        valid: controlsCheck.valid,
        artifactDigest: controlsCheck.record.artifactDigest,
        provenance: {
          repository: controlsCheck.record.provenance.repository,
          taskId: controlsCheck.record.provenance.taskId,
          headSha: controlsCheck.record.provenance.headSha,
          baseSha: controlsCheck.record.provenance.baseSha,
          runId: controlsCheck.record.provenance.runId,
          runAttempt: controlsCheck.record.provenance.runAttempt,
          job: controlsCheck.record.provenance.job,
        },
      },
      sourceControlsReady: report.sourceControlsReady,
      online: {
        available: report.online.available === true,
        ready: report.online.ready === true,
        rulesetCount: Number.isSafeInteger(report.online.rulesetCount) ? report.online.rulesetCount : null,
        checks: (report.online.checks ?? []).map(({ id, ok, status }) => ({
          id, ok: ok === true, status,
        })),
        lookups: (report.online.lookups ?? []).map(({ id, state }) => ({ id, state })),
        externalControls: report.externalControls ?? null,
      },
    };
    if (report.sourceControlsReady !== true) {
      errors.push("Northstar source-level repository controls are not ready.");
    }
  } catch (error) {
    errors.push(`Issue #24 hosted-control status evidence is unavailable (${error.code ?? error.message}).`);
  }

  const hostedStatuses = checks
    .filter(({ hostedOnly }) => hostedOnly)
    .map(({ id, present, status, valid, record }) => ({
      id,
      present,
      status,
      valid,
      provenance: record?.provenance ? {
        repository: record.provenance.repository,
        taskId: record.provenance.taskId,
        headSha: record.provenance.headSha,
        baseSha: record.provenance.baseSha,
        runId: record.provenance.runId,
        runAttempt: record.provenance.runAttempt,
        job: record.provenance.job,
      } : null,
    }));
  return {
    schema: "northstar/issue24-validation-evidence/2",
    taskId: contract.id,
    contractDigest: contract.source.bodyDigest,
    planDigest: plan ? planDigest(plan) : null,
    baseSha: plan?.baseSha ?? null,
    candidateSha: expected?.source?.headSha ?? null,
    localEvidenceComplete: errors.length === 0,
    errors,
    dependencies: {
      fastifyVersion,
      braceExpansion,
      high: vulnerabilities?.high ?? null,
      critical: vulnerabilities?.critical ?? null,
      auditDigest: auditCheck?.record?.artifactDigest ?? null,
    },
    agenticCompile: compile ? {
      ok: compile.ok === true,
      sourceDigest: compile.sourceDigest ?? null,
      artifactDigest: poutineSarifDigest ?? compile.artifactDigest ?? null,
      findings: compile.findings?.length ?? null,
    } : null,
    zizmor: comparison ? {
      version: comparison.tool?.version ?? null,
      image: comparison.tool?.image ?? null,
      baseSarifDigest: comparison.base?.sarifDigest ?? null,
      candidateSarifDigest: comparison.candidate?.sarifDigest ?? null,
      baseFindings: comparison.base?.findingCount ?? null,
      candidateFindings: comparison.candidate?.findingCount ?? null,
      baseScannerExitCode: comparison.base?.scannerExitCode ?? null,
      candidateScannerExitCode: comparison.candidate?.scannerExitCode ?? null,
      baseWrapperExitCode: comparison.base?.wrapperExitCode ?? null,
      candidateWrapperExitCode: comparison.candidate?.wrapperExitCode ?? null,
      newFindingCount: comparison.newFindingCount ?? null,
      findingDeltaByWorkflowRule: comparison.findingDeltaByWorkflowRule ?? [],
      newFindings: comparison.newFindings ?? [],
      noNewFindings: comparison.noNewFindings === true,
    } : null,
    hostedStatuses,
    repositoryControls,
  };
}

export function buildExecutionReport({
  contract,
  plan,
  records,
  unit,
  acceptance,
  hosted,
  env = process.env,
  root = REPO_ROOT,
}) {
  if (!contract?.id || !/^[0-9a-f]{64}$/.test(contract.source?.bodyDigest ?? "") ||
    !Array.isArray(contract.successCriteria) || contract.successCriteria.length === 0 ||
    contract.successCriteria.some((criterion) => !criterion?.id || !criterion?.provenBy)) {
    throw new Error("A complete task contract is required for execution evidence.");
  }
  let planValidation;
  try {
    planValidation = validatePlanContract(plan, contract);
  } catch (error) {
    planValidation = { ok: false, errors: [`Malformed plan: ${error.message}`] };
  }
  const expected = evidenceContext(env, { root, contract, plan });
  const contextErrors = [];
  if (expected.source.dirty) contextErrors.push("Source worktree is dirty; evidence is not commit-bound.");
  if (expected.baseSha !== plan?.baseSha) contextErrors.push("Expected base does not match the plan.");
  if (!hosted && expected.source.headSha !== expected.headSha) contextErrors.push("Source HEAD does not match the requested HEAD.");
  if (!expected.runId || !/^[1-9]\d*$/.test(expected.runAttempt ?? "")) contextErrors.push("Exact validation run and attempt are required.");
  if (hosted && (!env.GITHUB_RUN_ID || !env.GITHUB_RUN_ATTEMPT ||
    !/^[^/\s]+\/[^/\s]+$/.test(expected.repository) ||
    !Number.isSafeInteger(expected.pullRequest) || expected.pullRequest < 1)) {
    contextErrors.push("Hosted execution identity is incomplete.");
  }
  const currentJUnit = (input, path) => {
    const current = readJUnit(path, root);
    if (input?.path !== path || !current.digest || input?.digest !== current.digest) {
      current.passed = false;
      current.validationErrors = [...(current.validationErrors ?? []), "JUnit input is missing, changed, or not the required artifact."];
    }
    return current;
  };
  unit = currentJUnit(unit, "artifacts/unit-junit.xml");
  acceptance = currentJUnit(acceptance, "artifacts/acceptance-junit.xml");
  const requiredChecks = [
    ...new Set([
      ...(Array.isArray(plan?.requiredChecks) ? plan.requiredChecks.filter((id) => typeof id === "string") : []),
      ...(hosted ? ["validation-authority"] : []),
    ]),
  ]
    .filter((id) => id !== "evidence");
  const checks = requiredChecks.map((id) => {
    const candidates = records.filter((candidate) => candidate?.id === id);
    const record = candidates.length === 1 ? candidates[0] : null;
    const validation = record
      ? validateCheckRecord(record, expected, { root, hosted })
      : {
          valid: false,
          reasons: [candidates.length > 1 ? "duplicate evidence" : "missing"],
        };
    return {
      id,
      hostedOnly: HOSTED_ONLY_CHECKS.has(id),
      present: Boolean(record),
      status: record?.status ?? "not-run",
      valid: validation.valid,
      reasons: validation.reasons,
      record: record ?? null,
    };
  });

  const deferredCriteria = planValidation.ok && Array.isArray(plan?.deferredCriteria)
    ? plan.deferredCriteria
    : [];
  const deferredIds = new Set(deferredCriteria.map(({ id }) => id));
  const canaryCheck = checks.find(({ id }) => id === "browser-plan-canary");
  const canaryEvidence = canaryCheck?.present && canaryCheck.valid &&
    canaryCheck.status === "pass" && typeof canaryCheck.record?.artifact === "string"
    ? readEvidenceJson(canaryCheck.record.artifact, root)
    : null;
  const canaryProven = new Set(Array.isArray(canaryEvidence?.criterionIds)
    ? canaryEvidence.criterionIds : []);
  let successCriteria = criterionCoverage(contract.successCriteria, [
    ...(unit.testNames ?? []),
    ...(acceptance.testNames ?? []),
  ]).map((criterion) => deferredIds.has(criterion.id)
    ? { ...criterion, proven: canaryProven.has(criterion.id) }
    : criterion);

  const localChecks = checks.filter(({ hostedOnly }) => !hostedOnly);
  const hostedChecks = checks.filter(({ hostedOnly }) => hostedOnly);
  const failedLocalChecks = localChecks
    .filter(({ present, status, valid }) => !present || status !== "pass" || !valid)
    .map(({ id }) => id);
  const failedHostedChecks = hostedChecks
    .filter(({ present, status, valid }) => !present || status !== "pass" || !valid)
    .map(({ id }) => id);

  const taskEvidence = contract.id === ISSUE24_TASK_ID
    ? buildIssue24ValidationEvidence({
        contract, plan, checks, unit, acceptance, expected, root,
      })
    : null;
  const issue20ZizmorPending =
    (taskEvidence?.zizmor?.candidateWrapperExitCode ?? 0) > 0;
  if (taskEvidence?.localEvidenceComplete) {
    successCriteria = successCriteria.map((criterion) =>
      criterion.id === "AC6" ? { ...criterion, proven: true } : criterion);
  }
  const unprovenCriteria = successCriteria
    .filter(({ proven }) => !proven)
    .map(({ id }) => id);
  const blockingUnprovenCriteria = unprovenCriteria.filter(
    (id) => !deferredIds.has(id),
  );
  const deferredCriteriaReport = deferredCriteria.map((criterion) => ({
    ...criterion,
    status: canaryProven.has(criterion.id) ? "proven" : "unverified",
  }));

  const localReady =
    Boolean(plan) &&
    planValidation.ok &&
    contextErrors.length === 0 &&
    unit.present &&
    unit.passed &&
    Number(unit.tests ?? 0) > 0 &&
    acceptance.present &&
    acceptance.passed &&
    Number(acceptance.tests ?? 0) > 0 &&
    failedLocalChecks.length === 0 &&
    blockingUnprovenCriteria.length === 0;
  const hostedReady =
    localReady &&
    hasLiveTaskIdentity(contract, expected.repository) &&
    failedHostedChecks.length === 0 &&
    unprovenCriteria.length === 0 &&
    !issue20ZizmorPending;
  const decision = !localReady
    ? "review_required"
    : hosted && hostedReady
      ? "ready_for_acceptance"
      : "ready_for_review";

  return {
    schema: "northstar/execution-report/4",
    workItem: contract.id,
    contractSource: contract.source,
    generatedAt: new Date().toISOString(),
    validationLevel: hosted ? "hosted-integration" : "local-reference",
    provenance: expected,
    contextErrors,
    plan: plan
      ? {
          present: true,
          schema: plan.schema,
          risk: plan.risk,
          digest: planDigest(plan),
          contractDigest: plan.contractDigest,
          baseSha: plan.baseSha,
          valid: planValidation.ok,
          errors: planValidation.errors,
        }
      : { present: false, valid: false, errors: planValidation.errors },
    tests: { unit, acceptance },
    checks,
    successCriteria,
    ...(taskEvidence ? { taskEvidence: { issue24: taskEvidence } } : {}),
    failedLocalChecks,
    pendingHostedEvidence: failedHostedChecks,
    unprovenCriteria,
    deferredCriteria: deferredCriteriaReport,
    decision,
    limits: [
      ...deferredCriteriaReport.filter(({ status }) => status === "unverified").map(({ id, reason }) =>
        `${id} remains unverified until its trusted post-bootstrap canary is verified: ${reason}`,
      ),
      ...(!contract.source.trusted
        ? [
            "The task contract came from an offline fixture, not a live trusted GitHub issue.",
          ]
        : []),
      ...(!hosted
        ? [
            "Hosted PR reviews, workflow runs, rulesets, secret scanning, push protection, and environment approvals were not exercised locally.",
          ]
        : []),
      ...(issue20ZizmorPending
        ? [
            `Pinned Zizmor reported ${taskEvidence.zizmor.candidateFindings} existing candidate findings; ` +
              "the exact-base comparison introduced none, but Issue #20 must resolve the baseline before acceptance.",
          ]
        : []),
      ...(taskEvidence && taskEvidence.repositoryControls?.online.available !== true
        ? [
            "Repository-control settings remain unverified in this PR context; the protected publisher must audit them before acceptance.",
          ]
        : []),
    ],
  };
}

/**
 * Emit stable failure labels rather than arbitrary producer-supplied text.
 * @param {Array<{id: string, status: string, reasons: string[]}>} checks
 * @param {string[]} failedIds
 */
export function checkFailureDiagnostics(checks, failedIds) {
  const selected = new Set(failedIds);
  return checks
    .filter(({ id }) => selected.has(id))
    .map(({ id, status, reasons }) => {
      const codes = reasons
        .map((reason) => String(reason).split(":")[0]
          .replace(/[^A-Za-z0-9._ -]/g, "")
          .replace(/\s+/g, " ")
          .trim())
        .filter(Boolean);
      return `${id}: ${codes.length > 0 ? codes.join(", ") : `status ${status}`}`;
    });
}

function valueOf(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function main() {
  if (process.argv.includes("--compare-zizmor")) {
    compareZizmorArtifacts();
    return;
  }
  const out = valueOf("--out") ?? "artifacts/report.json";
  const target = evidencePath(out);
  rmSync(target, { force: true });
  const contract = loadTaskContract();
  if (!contract) {
    process.stderr.write(
      "No task contract resolved. Run npm run contract:fetch -- --issue <number>.\n",
    );
    process.exit(2);
  }

  const report = buildExecutionReport({
    contract,
    plan: readEvidenceJson(valueOf("--plan") ?? "artifacts/plan.json"),
    records: loadCheckRecords(valueOf("--checks")),
    unit: readJUnit("artifacts/unit-junit.xml"),
    acceptance: readJUnit("artifacts/acceptance-junit.xml"),
    hosted: process.argv.includes("--hosted") || process.env.GITHUB_ACTIONS === "true",
  });

  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  process.stdout.write(
    [
      `task=${report.workItem}`,
      `level=${report.validationLevel}`,
      `decision=${report.decision}`,
      `unit=${report.tests.unit.present ? `${report.tests.unit.tests} tests, ${report.tests.unit.failures + report.tests.unit.errors} failed` : "absent"}`,
      `acceptance=${report.tests.acceptance.present ? `${report.tests.acceptance.tests} tests, ${report.tests.acceptance.failures + report.tests.acceptance.errors} failed` : "absent"}`,
      `criteriaProven=${report.successCriteria.filter(({ proven }) => proven).length}/${report.successCriteria.length}`,
    ].join("  ") + `\n${target}\n`,
  );

  if (report.deferredCriteria.some(({ status }) => status === "unverified")) {
    process.stdout.write(
      `deferred criteria: ${report.deferredCriteria.filter(({ status }) => status === "unverified").map(({ id }) => id).join(", ")} (unverified)\n`,
    );
  }

  if (report.decision === "review_required") {
    const failedIds = [...report.failedLocalChecks, ...report.pendingHostedEvidence];
    const diagnostics = checkFailureDiagnostics(report.checks, failedIds);
    process.stdout.write(
      `failed local checks: ${report.failedLocalChecks.join(", ") || "none"}; ` +
        `check diagnostics: ${diagnostics.join("; ") || "none"}; ` +
        `unproven criteria: ${report.unprovenCriteria.join(", ") || "none"}\n`,
    );
    process.exitCode = 1;
  } else if (report.pendingHostedEvidence.length > 0) {
    process.stdout.write(
      `pending hosted evidence: ${report.pendingHostedEvidence.join(", ")}\n`,
    );
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`Execution evidence failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
