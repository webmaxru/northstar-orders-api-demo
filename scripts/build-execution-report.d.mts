import type { CheckRecord, EvidenceContext } from "./evidence-record.d.mts";
import type { DeferredCriterion, PlanContract } from "./plan-contract.d.mts";
import type {
  SuccessCriterion,
  TaskContract,
} from "./task-contract.d.mts";

export interface JUnitEvidence {
  present: boolean;
  path: string;
  digest?: string | null;
  tests?: number;
  failures?: number;
  errors?: number;
  skipped?: number;
  passed?: boolean;
  testNames?: string[];
  skippedTestNames?: string[];
  validationErrors?: string[];
}

export interface Issue24ValidationEvidence {
  schema: "northstar/issue24-validation-evidence/2";
  taskId: "AES-TRUSTED-ACCEPTANCE-BOOTSTRAP";
  contractDigest: string;
  planDigest: string | null;
  baseSha: string | null;
  candidateSha: string | null;
  localEvidenceComplete: boolean;
  errors: string[];
  dependencies: {
    fastifyVersion: string | null;
    braceExpansion: Array<{ path: string; version: string | null }>;
    high: number | null;
    critical: number | null;
    auditDigest: string | null;
  };
  agenticCompile: {
    ok: boolean;
    sourceDigest: string | null;
    artifactDigest: string | null;
    findings: number | null;
  } | null;
  zizmor: {
    version: string | null;
    image: string | null;
    baseSarifDigest: string | null;
    candidateSarifDigest: string | null;
    baseFindings: number | null;
    candidateFindings: number | null;
    baseScannerExitCode: number | null;
    candidateScannerExitCode: number | null;
    baseWrapperExitCode: number | null;
    candidateWrapperExitCode: number | null;
    newFindingCount: number | null;
    findingDeltaByWorkflowRule: Array<{
      ruleId: string;
      workflow: string;
      baseCount: number;
      candidateCount: number;
      added: number;
      removed: number;
    }>;
    newFindings: Array<{
      ruleId: string;
      workflow: string;
      level: string;
      messageDigest: string;
      count: number;
    }>;
    noNewFindings: boolean;
  } | null;
  hostedStatuses: Array<{
    id: string;
    present: boolean;
    status: string;
    valid: boolean;
    provenance: Record<string, string> | null;
  }>;
  repositoryControls: {
    check: {
      present: boolean;
      status: string;
      valid: boolean;
      artifactDigest?: string;
      provenance?: Record<string, string>;
    };
    sourceControlsReady: boolean;
    online: {
      available: boolean;
      ready: boolean;
      rulesetCount: number | null;
      checks: Array<{ id: string; ok: boolean; status?: string }>;
      lookups: Array<{ id: string; state: string }>;
      externalControls: Record<string, unknown> | null;
    };
  } | null;
}

export interface ZizmorComparison {
  schema: "northstar/zizmor-comparison/1";
  baseSha: string;
  candidateSha: string;
  tool: { name: "zizmor"; version: string; image: string };
  base: {
    sourceDigest: string | null;
    sarifDigest: string | null;
    scannerExitCode: number | null;
    wrapperExitCode: number | null;
    findingCount: number;
  };
  candidate: {
    sourceDigest: string | null;
    sarifDigest: string | null;
    scannerExitCode: number | null;
    wrapperExitCode: number | null;
    findingCount: number;
  };
  findingDeltaByWorkflowRule: Array<{
    ruleId: string;
    workflow: string;
    baseCount: number;
    candidateCount: number;
    added: number;
    removed: number;
  }>;
  newFindings: Array<{
    ruleId: string;
    workflow: string;
    level: string;
    messageDigest: string;
    count: number;
  }>;
  newFindingCount: number;
  suppressionChanges: Array<{ kind: "added" | "removed"; key: string }>;
  noNewFindings: boolean;
  comparisonPassed: boolean;
  errors: string[];
}

export interface ExecutionReport {
  schema: "northstar/execution-report/4";
  workItem: string;
  contractSource: TaskContract["source"];
  generatedAt: string;
  validationLevel: "local-reference" | "hosted-integration";
  provenance: EvidenceContext;
  contextErrors: string[];
  plan: {
    present: boolean;
    valid: boolean;
    errors: string[];
    schema?: string;
    risk?: string;
    digest?: string;
    contractDigest?: string;
    baseSha?: string;
  };
  tests: { unit: JUnitEvidence; acceptance: JUnitEvidence };
  checks: Array<{
    id: string;
    hostedOnly: boolean;
    present: boolean;
    status: string;
    valid: boolean;
    reasons: string[];
    record: CheckRecord | null;
  }>;
  taskEvidence?: { issue24: Issue24ValidationEvidence };
  successCriteria: Array<SuccessCriterion & { proven: boolean }>;
  failedLocalChecks: string[];
  pendingHostedEvidence: string[];
  unprovenCriteria: string[];
  deferredCriteria: Array<DeferredCriterion & { status: "unverified" | "proven" }>;
  decision: "review_required" | "ready_for_review" | "ready_for_acceptance";
  limits: string[];
}

export declare function parseJUnit(
  xml: string,
  relativePath?: string,
): JUnitEvidence;
export declare function readJUnit(relativePath: string, root?: string): JUnitEvidence;
export declare function criterionCoverage(
  criteria: SuccessCriterion[],
  testNames: string[],
): Array<SuccessCriterion & { proven: boolean }>;
export declare function loadCheckRecords(directory?: string, root?: string): CheckRecord[];
export declare function compareZizmorSarif(input: {
  baseSha: string;
  candidateSha: string;
  baseSarifText: string;
  candidateSarifText: string;
  baseReport: Record<string, unknown>;
  candidateReport: Record<string, unknown>;
}): ZizmorComparison;
export declare function buildIssue24ValidationEvidence(input: {
  contract: TaskContract;
  plan: PlanContract | null;
  checks: ExecutionReport["checks"];
  unit: JUnitEvidence;
  acceptance: JUnitEvidence;
  expected: EvidenceContext;
  root?: string;
}): Issue24ValidationEvidence;
export declare function buildExecutionReport(input: {
  contract: TaskContract;
  plan: PlanContract | null;
  records: CheckRecord[];
  unit: JUnitEvidence;
  acceptance: JUnitEvidence;
  hosted: boolean;
  env?: Record<string, string | undefined>;
  root?: string;
}): ExecutionReport;
