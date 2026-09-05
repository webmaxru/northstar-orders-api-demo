import { describe, expect, it } from "vitest";
import {
  evaluateToolCall,
  type AuthorizationContext,
  type ToolCall,
} from "../../scripts/authorize-tool.mjs";
import { evaluateAgentHooksToolCall } from "../../scripts/agent-hooks-bridge.mjs";

const authorization: AuthorizationContext & {
  contractDigest: string;
  planDigest: string;
  repositorySha: string;
} = {
  scope: {
    allowed: ["src/**", "tests/**"],
    prohibited: [".github/**"],
  },
  planScope: {
    allowed: ["src/**"],
    prohibited: [],
  },
  taskId: "TASK-1",
  trustedContract: true,
  approvedPlan: true,
  branchAuthorized: true,
  contractDigest: "a".repeat(64),
  planDigest: "b".repeat(64),
  repositorySha: "c".repeat(40),
};

async function bridge(call: ToolCall, options: Record<string, unknown> = {}) {
  return evaluateAgentHooksToolCall(call, authorization, {
    role: "implement",
    sessionId: "test-session",
    callId: "test-call",
    ...options,
  });
}

describe("Responsible AI Agent Hooks pre-tool bridge", () => {
  it.each([
    [{ toolName: "read", toolArgs: { path: "src/app.ts" } }, "allow"],
    [
      {
        toolName: "edit",
        toolArgs: { path: ".github/workflows/pwn.yml" },
      },
      "deny",
    ],
    [
      { toolName: "bash", toolArgs: { command: "printenv" } },
      "deny",
    ],
    [{ toolName: "somethingNovel", toolArgs: {} }, "ask"],
  ] as Array<[ToolCall, "allow" | "deny" | "ask"]>)(
    "preserves the native policy decision for %s",
    async (call, expected) => {
      expect(evaluateToolCall(call, authorization).permissionDecision).toBe(
        expected,
      );
      expect((await bridge(call)).decision.permissionDecision).toBe(expected);
    },
  );

  it("maps a liftable deny to deny in the non-interactive cloud host", async () => {
    expect(
      (
        await bridge(
          { toolName: "somethingNovel", toolArgs: {} },
          { cloud: true },
        )
      ).decision.permissionDecision,
    ).toBe("deny");
  });

  it("composes named controls and records a custom content identity", async () => {
    const result = await bridge({
      toolName: "read",
      toolArgs: { path: "src/app.ts" },
    });

    expect(result.record).toMatchObject({
      interception_point: "pre_tool_call",
      mode: "enforce",
      identity_provider: "northstar-sha256",
      interceptors_registered: 5,
      composition: { profile: "sequential/run_all" },
    });
    expect(result.record.verdicts?.map(({ name }) => name)).toEqual([
      "task-contract-gate",
      "role-gate",
      "human-boundary",
      "evidence-output-gate",
      "native-policy-compatibility",
    ]);
  });

  it("binds the custom identity to the tool name as well as arguments", async () => {
    const args = { value: "same" };
    const read = await bridge({ toolName: "read", toolArgs: args });
    const search = await bridge({ toolName: "search", toolArgs: args });
    expect(read.record.input_identity).not.toBe(search.record.input_identity);
  });

  it("keeps raw tool arguments out of the interception record", async () => {
    const raw = ".github/workflows/private-secret.yml";
    const result = await bridge({
      toolName: "edit",
      toolArgs: { path: raw },
    });

    expect(JSON.stringify(result.record)).not.toContain(raw);
    expect(result.record.input_identity).toMatch(/^sha256:/);
  });

  it("preserves native read-only bootstrap commands before approval", async () => {
    const unresolved: AuthorizationContext = {
      scope: { allowed: [], prohibited: [] },
      trustedContract: false,
      approvedPlan: false,
      branchAuthorized: false,
    };
    for (const command of [
      "git status --short",
      "npm run contract:fetch -- --issue 4",
    ]) {
      const call = { toolName: "bash", toolArgs: { command } };
      expect(evaluateToolCall(call, unresolved).permissionDecision).toBe(
        "allow",
      );
      expect(
        (
          await evaluateAgentHooksToolCall(call, unresolved, {
            role: "unknown",
            sessionId: "s",
            callId: command,
          })
        ).decision.permissionDecision,
      ).toBe("allow");
    }
  });

  it("does not invent an implementer role when the host exposes none", async () => {
    const result = await evaluateAgentHooksToolCall(
      { toolName: "edit", toolArgs: { path: "src/app.ts" } },
      authorization,
      { role: "unknown", sessionId: "s", callId: "c" },
    );
    expect(result.decision.permissionDecision).toBe("allow");
    expect(result.record.verdict.warnings).toEqual([
      { reason: "northstar:role_unavailable" },
    ]);
  });

  it("enforces role and completion boundaries in addition to native policy", async () => {
    expect(
      (
        await evaluateAgentHooksToolCall(
          { toolName: "edit", toolArgs: { path: "src/app.ts" } },
          authorization,
          { role: "plan", sessionId: "s", callId: "c" },
        )
      ).decision.permissionDecision,
    ).toBe("deny");
    expect(
      (
        await evaluateAgentHooksToolCall(
          { toolName: "task_complete", toolArgs: { summary: "done" } },
          authorization,
          {
            role: "implement",
            sessionId: "s",
            callId: "c",
            reportDecision: "review_required",
          },
        )
      ).decision.permissionDecision,
    ).toBe("deny");
  });
});
