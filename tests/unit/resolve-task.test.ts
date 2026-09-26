import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  decide,
  extractIssue,
  isTaskInvocation,
  resolveTask,
  clearTaskState,
} from "../../scripts/resolve-task.mjs";
import { contractFromFile } from "../../scripts/task-contract.mjs";
import { resolveIssueNumber } from "../../scripts/session-start.mjs";

describe("the issue number is an argument, not a guess", () => {
  it("recognizes the raw slash invocation", () => {
    expect(isTaskInvocation("/plan 4")).toBe(true);
    expect(isTaskInvocation("/implement 4")).toBe(true);
  });

  describe("fresh task authority", () => {
    it("clears stale authority when task resolution fails", () => {
      const root = mkdtempSync(join(tmpdir(), "northstar-resolution-test-"));
      const files = ["task-contract.json", "task-plan.md", "plan.json", "approved-plan.json", "task-session.json", "execution-context.json"];
      const stale = () => {
        mkdirSync(join(root, "artifacts"), { recursive: true });
        for (const file of files) writeFileSync(join(root, "artifacts", file), "stale");
      };
      try {
        stale();
        expect(() => resolveTask(14, {
          root, cloud: false,
          readContract: () => { throw new Error("Repository read denied."); },
        })).toThrow(/denied/);
        for (const file of files) expect(existsSync(join(root, "artifacts", file))).toBe(false);

        const fixture = contractFromFile("tests/fixtures/WI-1842.issue.md");
        const contract = { ...fixture, source: { ...fixture.source, trusted: true, issue: 14 } };
        stale();
        expect(() => resolveTask(14, {
          root, cloud: false, readContract: () => contract,
          readApprovedPlan: () => { throw new Error("Approval lookup failed."); },
        })).toThrow(/Approval lookup/);
        for (const file of files) expect(existsSync(join(root, "artifacts", file))).toBe(false);

        resolveTask(14, {
          root, cloud: false, readContract: () => contract, readApprovedPlan: () => null,
          role: "plan", sessionId: "new-session",
        });
        expect(JSON.parse(readFileSync(join(root, "artifacts", "task-contract.json"), "utf8")).source.issue).toBe(14);
        expect(JSON.parse(readFileSync(join(root, "artifacts", "task-session.json"), "utf8")).sessionId).toBe("new-session");
        expect(existsSync(join(root, "artifacts", "approved-plan.json"))).toBe(false);
        clearTaskState(root);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it("uses documented initial prompts and cloud prompt without branch inference", () => {
      expect(resolveIssueNumber({ env: {}, payload: { initial_prompt: "/plan 14" } })).toEqual({
        number: 14, how: "initial_prompt",
      });
      expect(resolveIssueNumber({ env: {}, payload: { initialPrompt: "/implement 14" } }).number).toBe(14);
      expect(resolveIssueNumber({ env: { COPILOT_AGENT_PROMPT: "Task issue: #14\nTask role: implement" } }).number).toBe(14);
      expect(() => resolveIssueNumber({
        env: { AGENT_TASK_ISSUE: "4", COPILOT_AGENT_PROMPT: "/implement 14" },
      })).toThrow(/Conflicting/);
      expect(() => resolveIssueNumber({ env: { AGENT_TASK_ISSUE: "-1" } })).toThrow(/positive/);
      expect(resolveIssueNumber({ env: { COPILOT_AGENT_PROMPT: "Explain this example:\n```\n/plan 4\n```" } }).number).toBeNull();
      expect(resolveIssueNumber({ env: { COPILOT_AGENT_PROMPT: "> /plan 4" } }).number).toBeNull();
    });
  });

  it("recognizes the expanded prompt body", () => {
    // It is not documented whether UserPromptSubmit receives the typed text or
    // the expanded prompt file. Both forms are matched so the hook behaves the
    // same either way rather than silently doing nothing in one of them.
    expect(
      isTaskInvocation("Task issue: #4\n\nThat number is the only thing..."),
    ).toBe(true);
  });

  it("ignores an ordinary chat turn", () => {
    // A workspace hook fires on every prompt. Anything else here would put a
    // GitHub round trip in front of every unrelated question.
    expect(isTaskInvocation("why does the retry policy back off?")).toBe(false);
    expect(decide("why does the retry policy back off?")).toEqual({
      action: "ignore",
    });
  });

  it("reads the number from every form a human might type", () => {
    expect(extractIssue("/plan 4")).toBe(4);
    expect(extractIssue("/implement #12")).toBe(12);
    expect(extractIssue("Task issue: #7")).toBe(7);
    expect(extractIssue("please plan issue #31 today")).toBe(31);
    expect(extractIssue("npm run contract:fetch -- --issue 9")).toBe(9);
  });

  it("stops the turn when a task agent is invoked with no number", () => {
    const decision = decide("/plan");
    expect(decision).toMatchObject({ action: "stop" });
    expect(decision.action === "stop" && decision.reason).toMatch(
      /issue as an argument/,
    );
  });

  it("stops rather than resolving an unsubstituted placeholder", () => {
    // If the input variable is not filled in, the body still looks like an
    // invocation. Guessing which issue was meant is the failure mode this whole
    // change removes.
    expect(decide("Task issue: #${input:issue}").action).toBe("stop");
  });

  it("resolves when the number is given", () => {
    expect(decide("/implement 4")).toEqual({ action: "resolve", issue: 4 });
  });
});
