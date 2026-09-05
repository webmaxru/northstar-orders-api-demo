import { evaluateAgentHooksToolCall } from "./agent-hooks-bridge.mjs";

const authorization = {
  scope: { allowed: ["src/**"], prohibited: [".github/**"] },
  planScope: { allowed: ["src/**"], prohibited: [] },
  taskId: "SMOKE-1",
  trustedContract: true,
  approvedPlan: true,
  branchAuthorized: true,
  contractDigest: "a".repeat(64),
  planDigest: "b".repeat(64),
  repositorySha: "c".repeat(40),
};

const allow = await evaluateAgentHooksToolCall(
  { toolName: "read", toolArgs: { path: "src/app.ts" } },
  authorization,
  { role: "implement", sessionId: "smoke", callId: "allow" },
);
const deny = await evaluateAgentHooksToolCall(
  { toolName: "edit", toolArgs: { path: ".github/workflows/pwn.yml" } },
  authorization,
  { role: "implement", sessionId: "smoke", callId: "deny" },
);

if (
  allow.decision.permissionDecision !== "allow" ||
  deny.decision.permissionDecision !== "deny" ||
  allow.record.interception_point !== "pre_tool_call" ||
  allow.record.interceptors_registered !== 5
) {
  throw new Error("Agent Hooks bridge smoke test failed.");
}

process.stdout.write(
  `agent-hooks=${allow.record.mode} point=${allow.record.interception_point} interceptors=${allow.record.interceptors_registered} allow=${allow.decision.permissionDecision} deny=${deny.decision.permissionDecision}\n`,
);
