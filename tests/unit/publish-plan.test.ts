import { describe, expect, it } from "vitest";
import { extractPlan, renderPlan } from "../../scripts/publish-plan.mjs";

/**
 * A plan that lives only in a chat thread is not "an inspectable plan": nobody
 * outside the session can review, resume, or implement from it. Microsoft Learn
 * puts planning in "a PR description, an issue comment, or a
 * .github/pull_request_template.md artifact".
 */
describe("the durable plan comment", () => {
  const body = renderPlan("1. Assumptions\n2. Design", { at: "2026-08-24T09:00:00.000Z" });

  it("carries a marker so re-planning updates one comment", () => {
    expect(body).toContain("<!-- northstar:plan -->");
  });

  it("says the plan is not yet approved", () => {
    expect(body).toContain("Not yet approved");
  });

  it("tells the reader implementation reads from here, not from a chat", () => {
    expect(body).toMatch(/reads\s+it from here rather than from a chat thread/);
    expect(body).toContain("fresh session");
  });

  it("preserves the plan body", () => {
    expect(body).toContain("1. Assumptions");
  });
});

describe("extracting a plan from a session transcript", () => {
  // VS Code documents transcript_path but warns the format "is not a stable
  // hook API and may change", so the extractor accepts the shapes we know and
  // returns null rather than guessing.
  it("reads JSON Lines transcripts and takes the last assistant turn", () => {
    const jsonl = [
      JSON.stringify({ role: "user", content: "plan WI-1842" }),
      JSON.stringify({ role: "assistant", content: "first draft" }),
      JSON.stringify({ role: "user", content: "revise" }),
      JSON.stringify({ role: "assistant", content: "final plan" }),
    ].join("\n");

    expect(extractPlan(jsonl)).toBe("final plan");
  });

  it("reads a single document with a messages array", () => {
    const doc = JSON.stringify({
      messages: [
        { role: "user", content: "plan" },
        { role: "assistant", content: "the plan" },
      ],
    });

    expect(extractPlan(doc)).toBe("the plan");
  });

  it("joins structured content parts", () => {
    const doc = JSON.stringify([
      { role: "assistant", content: [{ text: "part one " }, { text: "part two" }] },
    ]);

    expect(extractPlan(doc)).toBe("part one part two");
  });

  it("accepts alternative role names", () => {
    expect(extractPlan(JSON.stringify([{ role: "model", content: "plan text" }]))).toBe("plan text");
  });

  it("returns null on an unknown format rather than guessing", () => {
    expect(extractPlan("just some prose, not a transcript")).toBeNull();
    expect(extractPlan("")).toBeNull();
    expect(extractPlan(JSON.stringify([{ role: "user", content: "no assistant turn" }]))).toBeNull();
  });
});
