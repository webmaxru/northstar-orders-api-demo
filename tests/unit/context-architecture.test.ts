import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Durable context is loaded for every task. If any of it names a work item,
 * every future task starts by reading something irrelevant to it - and does so
 * silently. See docs/CONTEXT-ARCHITECTURE.md.
 *
 * Task identity belongs in Layer 2: docs/work-items/<ID>.* and the prompt file
 * that invokes a task, both of which are deliberately excluded here.
 */
const DURABLE_CONTEXT = [
  "AGENTS.md",
  ".github/copilot-instructions.md",
  ...globSync(".github/agents/*.agent.md"),
  ...globSync(".github/instructions/*.instructions.md"),
];

const WORK_ITEM_PATTERN = /\bWI-\d+\b/;

describe("durable context is task-agnostic", () => {
  it("covers every durable context file", () => {
    expect(DURABLE_CONTEXT.length).toBeGreaterThanOrEqual(7);
  });

  it.each(DURABLE_CONTEXT)("%s names no work item", (file) => {
    const offending = readFileSync(file, "utf8")
      .split("\n")
      .map((line, index) => ({ line: line.trim(), number: index + 1 }))
      .filter((entry) => WORK_ITEM_PATTERN.test(entry.line));

    expect(
      offending,
      `${file} names a work item. Move task-specific detail into docs/work-items/<ID>.contract.json.`,
    ).toEqual([]);
  });

  it("keeps enforcement scripts free of hardcoded task identity", () => {
    for (const script of ["scripts/authorize-tool.mjs", "scripts/build-execution-report.mjs"]) {
      const body = readFileSync(script, "utf8");
      const codeOnly = body
        .split("\n")
        .filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("//"))
        .join("\n");
      expect(WORK_ITEM_PATTERN.test(codeOnly), `${script} hardcodes a work item`).toBe(false);
    }
  });
});
