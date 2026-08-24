import { describe, expect, it } from "vitest";

import {
  PLAN_HEADING,
  extractPlan,
  extractPlanSection,
  planBranch,
  publish,
  renderPlan,
  resolveBase,
} from "../../scripts/publish-plan.mjs";
import { validatePlan } from "../../scripts/check-plan.mjs";

const CONTRACT = { id: "WI-1842", source: { issue: 4 } };

const GOOD_PLAN = [
  "## Assumptions",
  "- ADR-007 is binding",
  "",
  "## Scope",
  "- src/services/postgres-idempotent-order-service.ts",
  "",
  "## Success criteria",
  "- SC-1 proven by tests/acceptance/idempotency.test.ts",
  "",
  "## Rollback",
  "- Revert the branch; the migration is additive",
].join("\n");

describe("the plan is a pull request, not a chat message", () => {
  it("puts the plan in the PR description under the heading the gate reads", () => {
    const body = renderPlan(GOOD_PLAN, { issue: 4, at: "2026-08-24T09:00:00.000Z" });
    expect(body).toContain(PLAN_HEADING);
    expect(body).toContain("Closes #4");
    expect(extractPlanSection(body)).toBe(GOOD_PLAN);
  });

  it("leaves Evidence empty, because a plan-first PR has no commits yet", () => {
    // Learn's Option A: a PR "that contains only the plan (no code changes
    // yet)". Pre-filling evidence would claim proof that cannot exist.
    const body = renderPlan(GOOD_PLAN);
    expect(body).toMatch(/## Evidence\n\n_No commits yet\./);
  });

  it("names the plan branch after the task, not the session", () => {
    expect(planBranch("WI-1842")).toBe("plan/wi-1842");
  });

  it("edits the existing plan PR instead of opening a second one", () => {
    const calls: string[][] = [];
    const run = (args: string[]) => {
      calls.push(args);
      if (args[0] === "pr" && args[1] === "list") {
        return JSON.stringify([{ number: 11, body: "old", url: "https://example/pull/11" }]);
      }
      return "";
    };

    const result = publish(CONTRACT, GOOD_PLAN, { run, at: "now" });

    expect(result).toMatchObject({ updated: true, number: 11 });
    expect(calls.some(([a, b]) => a === "pr" && b === "create")).toBe(false);
  });

  it("opens a plan-first PR as a draft off the branch being planned against", () => {
    const vcs = (args: string[]) => {
      if (args[1] === "--abbrev-ref" && args[2] === "HEAD") return "demo/implement-start\n";
      return "abc123\n";
    };
    const created: string[][] = [];
    const run = (args: string[]) => {
      created.push(args);
      if (args[0] === "pr" && args[1] === "list") return "[]";
      return "https://github.com/o/r/pull/12\n";
    };

    const result = publish(CONTRACT, GOOD_PLAN, { run, vcs, at: "now" });
    expect(result).toMatchObject({ updated: false, number: 12 });

    const create = created.find(([a, b]) => a === "pr" && b === "create")!;
    expect(create[create.indexOf("--base") + 1]).toBe("demo/implement-start");
    expect(create[create.indexOf("--head") + 1]).toBe("plan/wi-1842");
  });
});

describe("the plan branch is cut from the branch you are on", () => {
  // Cutting it from origin/HEAD put the plan branch on a baseline with no
  // agents, prompts or hooks, so /implement could not run there at all.
  it("uses the current branch", () => {
    const vcs = (args: string[]) =>
      args[2] === "HEAD" ? "demo/implement-start\n" : "main\n";
    expect(resolveBase(vcs)).toBe("demo/implement-start");
  });

  it("falls back to the default branch when HEAD is detached", () => {
    const vcs = (args: string[]) => (args[2] === "HEAD" ? "HEAD\n" : "origin/main\n");
    expect(resolveBase(vcs)).toBe("main");
  });

  it("honours an explicit override", () => {
    const vcs = () => {
      throw new Error("git should not be consulted when --base is given");
    };
    expect(resolveBase(vcs, "origin/demo/engineering-system")).toBe(
      "demo/engineering-system",
    );
  });
});

describe("the plan gate reads the description, not the repository", () => {
  it("passes a plan that states scope, success criteria and rollback", () => {
    expect(validatePlan(renderPlan(GOOD_PLAN))).toMatchObject({ ok: true });
  });

  it("fails a PR whose description has no plan section", () => {
    expect(validatePlan("Some changes.").ok).toBe(false);
  });

  it("fails an unfilled template", () => {
    // Learn's own snippet checks that pull_request_template.md exists in the
    // repository. That would pass here, on a PR with an empty plan - it proves
    // the template exists, not that this pull request used it.
    const empty = `${PLAN_HEADING}\n\n- **Goal:** TBD\n\n## Evidence\n`;
    expect(validatePlan(empty).ok).toBe(false);
  });

  it("says which part of a reviewable plan is missing", () => {
    const noRollback = `${PLAN_HEADING}\n\nScope: src/**\nSuccess criteria: SC-1\n\n## Evidence\n`;
    const result = validatePlan(noRollback);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/rollback or escalation/);
  });
});

describe("the plan survives the transcript being unreadable", () => {
  it("returns null rather than persisting a guess", () => {
    expect(extractPlan("not json at all")).toBeNull();
    expect(extractPlan("")).toBeNull();
  });

  it("reads the last assistant message from a JSONL transcript", () => {
    const transcript = [
      JSON.stringify({ role: "user", content: "plan it" }),
      JSON.stringify({ role: "assistant", content: "first pass" }),
      JSON.stringify({ role: "assistant", content: GOOD_PLAN }),
    ].join("\n");
    expect(extractPlan(transcript)).toBe(GOOD_PLAN);
  });
});
