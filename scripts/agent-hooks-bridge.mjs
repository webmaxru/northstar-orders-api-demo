import { createHash, randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  AgentContextBuilder,
  canonicalJson,
  Composition,
  EnforcementMode,
  InterceptionBlocked,
  InterceptionEmitter,
  isLiftable,
  Verdict,
} from "@responsibleai/agent-hooks";
import {
  evaluateToolCall,
  loadAuthorizationContext,
  normalizeToolCall,
  parsePayload,
  renderDecision,
} from "./authorize-tool.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const RECORDS_PATH = "artifacts/agent-hooks-records.jsonl";
const READ_ONLY_ROLES = new Set(["plan", "risk-reviewer"]);

function toJsonValue(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function reportDecision() {
  try {
    return JSON.parse(
      readFileSync(resolve(REPO_ROOT, "artifacts/report.json"), "utf8"),
    ).decision;
  } catch {
    return null;
  }
}

function identity(ctx) {
  const projection = {
    spec: ctx.spec,
    interception_point: ctx.interception_point,
    agent: ctx.agent,
    session: { id: ctx.session.id },
    tool_call: ctx.tool_call ?? null,
    target: ctx.target,
    extensions: ctx.extensions ?? null,
  };
  return `sha256:${createHash("sha256").update(canonicalJson(projection)).digest("hex")}`;
}

function taskContractInterceptor(
  normalized,
  authorization,
  nativeDecision,
) {
  return {
    intercept() {
      if (normalized.kind === "read") return Verdict.allow();
      if (
        normalized.kind === "shell" &&
        nativeDecision.permissionDecision === "allow"
      ) {
        return Verdict.allow();
      }
      if (!authorization.taskId) {
        return Verdict.deny(
          "northstar:no_task_contract",
          "No task contract is active.",
        );
      }
      if (!authorization.trustedContract) {
        return Verdict.deny(
          "northstar:untrusted_contract",
          "The task contract is not trusted GitHub issue authority.",
        );
      }
      if (!authorization.approvedPlan) {
        return Verdict.deny(
          "northstar:plan_not_approved",
          "No human-approved machine-readable plan authorizes execution.",
        );
      }
      if (!authorization.branchAuthorized) {
        return Verdict.deny(
          "northstar:wrong_branch",
          "Execution is outside the approved implementation branch.",
        );
      }
      return Verdict.allow();
    },
  };
}

function roleInterceptor(normalized, role) {
  return {
    intercept() {
      if (!role || role === "unknown") {
        return Verdict.warn(
          "northstar:role_unavailable",
          "This Copilot host does not expose a trusted active-role identity; custom-agent tool lists remain the role boundary.",
        );
      }
      if (
        READ_ONLY_ROLES.has(role) &&
        ["edit", "shell"].includes(normalized.kind)
      ) {
        return Verdict.deny(
          "northstar:role_read_only",
          `${role} is a read-only workflow role.`,
        );
      }
      if (role === "security-reviewer" && normalized.kind === "edit") {
        return Verdict.deny(
          "northstar:security_reviewer_read_only",
          "The security reviewer validates evidence and does not edit.",
        );
      }
      if (
        role === "dependency" &&
        normalized.kind === "edit" &&
        normalized.paths.some(
          (path) => !["package.json", "package-lock.json"].includes(path),
        )
      ) {
        return Verdict.deny(
          "northstar:dependency_scope",
          "The dependency agent may edit only dependency manifests and lockfiles.",
        );
      }
      return Verdict.allow();
    },
  };
}

function humanBoundaryInterceptor(normalized) {
  return {
    intercept() {
      const highImpact =
        /\bgit\s+push\b|\bgh\s+(?:pr\s+merge|release)\b|\bnpm\s+(?:install|add)\b|\bproduction\b|\bsecret\b/i;
      if (
        highImpact.test(normalized.command) ||
        /deploy|release|merge/i.test(normalized.rawName)
      ) {
        return Verdict.escalate(
          "northstar:human_authorization",
          "Publishing, merging, production, dependency expansion, and secret access require human authorization.",
        );
      }
      return Verdict.allow();
    },
  };
}

function evidenceOutputInterceptor(normalized, decision) {
  return {
    intercept() {
      if (
        /task[_-]?complete|mark.*complete/i.test(normalized.rawName) &&
        !["ready_for_review", "ready_for_acceptance"].includes(decision)
      ) {
        return Verdict.deny(
          "northstar:evidence_incomplete",
          "Completion is blocked until the execution report supports it.",
        );
      }
      return Verdict.allow();
    },
  };
}

function nativePolicyInterceptor(nativeDecision) {
  return {
    intercept() {
      if (nativeDecision.permissionDecision === "allow") return Verdict.allow();
      if (nativeDecision.permissionDecision === "ask") {
        return Verdict.escalate(
          "northstar:native_approval_required",
          nativeDecision.permissionDecisionReason,
        );
      }
      return Verdict.deny(
        "northstar:native_policy_denied",
        nativeDecision.permissionDecisionReason,
      );
    },
  };
}

export function payloadFreeRecord(record) {
  return {
    ...record,
    verdict: {
      ...record.verdict,
      message: undefined,
      warnings: record.verdict.warnings?.map((warning) => ({
        reason: warning.reason,
      })),
      approval: record.verdict.approval ? {} : undefined,
    },
  };
}

export async function evaluateAgentHooksToolCall(
  call,
  authorization,
  options = {},
) {
  const normalized = normalizeToolCall(call);
  const role = options.role ?? "unknown";
  const cloud = options.cloud === true;
  const nativeDecision = evaluateToolCall(call, authorization);
  const builder = new AgentContextBuilder({
    agentId: role,
    agentName: role,
    framework: "github-copilot-command-hook-bridge",
    sessionId: options.sessionId ?? "copilot-session",
  });
  const emitter = new InterceptionEmitter(EnforcementMode.Enforce);
  emitter.setComposition(Composition.runAll());
  emitter.setIdentityProvider({ name: "northstar-sha256", fn: identity });
  emitter.setMaxRecords(1);
  if (options.recordSink) {
    emitter.setRecordSink((record) =>
      options.recordSink(payloadFreeRecord(record)),
    );
  }
  emitter
    .register(
      taskContractInterceptor(normalized, authorization, nativeDecision),
      "task-contract-gate",
    )
    .register(roleInterceptor(normalized, role), "role-gate")
    .register(humanBoundaryInterceptor(normalized), "human-boundary")
    .register(
      evidenceOutputInterceptor(
        normalized,
        options.reportDecision ?? null,
      ),
      "evidence-output-gate",
    )
    .register(
      nativePolicyInterceptor(nativeDecision),
      "native-policy-compatibility",
    );

  const context = builder.preToolCall(
    options.callId ?? randomUUID(),
    normalized.rawName || "unknown",
    toJsonValue(call.toolArgs ?? call.tool_input ?? {}),
  );
  context.extensions = {
    northstar: {
      contract_id: authorization.taskId ?? null,
      contract_digest: authorization.contractDigest ?? null,
      plan_digest: authorization.planDigest ?? null,
      repository_sha: authorization.repositorySha ?? null,
      role,
      host_adapter: "copilot-pre-tool-only",
      conformance: "nonconformant-partial-adapter",
    },
  };

  let rawRecord;
  let target = context.target;
  try {
    const outcome = await emitter.emit(context);
    rawRecord = outcome.record;
    target = outcome.target;
  } catch (error) {
    if (!(error instanceof InterceptionBlocked)) throw error;
    rawRecord = error.result;
  }

  const reason =
    rawRecord.verdict.message ??
    rawRecord.verdict.reason ??
    "Agent Hooks policy decision";
  const liftable = isLiftable(rawRecord.verdict);
  const permissionDecision =
    rawRecord.verdict.decision === "deny"
      ? liftable && !cloud
        ? "ask"
        : "deny"
      : "allow";
  const modifiedArgs =
    rawRecord.verdict.decision === "transform" &&
    target &&
    typeof target === "object" &&
    !Array.isArray(target)
      ? target
      : undefined;
  const record = payloadFreeRecord(rawRecord);

  return {
    decision: {
      permissionDecision,
      permissionDecisionReason: reason,
      ...(modifiedArgs ? { modifiedArgs } : {}),
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision,
        permissionDecisionReason: reason,
        ...(modifiedArgs ? { updatedInput: modifiedArgs } : {}),
      },
    },
    record,
  };
}

function writeRecord(record, path = RECORDS_PATH) {
  const target = resolve(REPO_ROOT, path);
  mkdirSync(dirname(target), { recursive: true });
  appendFileSync(target, `${JSON.stringify(record)}\n`, "utf8");
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function valueOf(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const parsed = parsePayload(await readStdin());
  if (!parsed.ok) {
    process.stdout.write(
      `${JSON.stringify(renderDecision(parsed.decision), null, 2)}\n`,
    );
    return;
  }
  try {
    const call = parsed.value;
    const sessionId =
      call.sessionId ?? call.session_id ?? process.env.COPILOT_SESSION_ID;
    const result = await evaluateAgentHooksToolCall(
      call,
      loadAuthorizationContext(),
      {
        role: valueOf("--role") ?? "unknown",
        sessionId,
        callId: call.toolUseId ?? call.tool_use_id,
        cloud: Boolean(
          process.env.GITHUB_COPILOT_API_TOKEN &&
            process.env.GITHUB_COPILOT_GIT_TOKEN,
        ),
        reportDecision: reportDecision(),
        recordSink: writeRecord,
      },
    );
    process.stdout.write(`${JSON.stringify(result.decision, null, 2)}\n`);
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify(
        {
          permissionDecision: "deny",
          permissionDecisionReason:
            `Agent Hooks bridge failed closed: ${/** @type {Error} */ (error).message}`,
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason:
              `Agent Hooks bridge failed closed: ${/** @type {Error} */ (error).message}`,
          },
        },
        null,
        2,
      )}\n`,
    );
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  await main();
}
