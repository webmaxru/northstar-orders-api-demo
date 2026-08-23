import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Durable context is loaded for every task. If any of it names a work item,
 * every future task starts by reading something irrelevant to it - and does so
 * silently. See docs/CONTEXT-ARCHITECTURE.md.
 *
 * Task identity belongs in the issue, and in the seed file plus prompt that
 * recreate it, all of which are deliberately excluded here.
 */
const DURABLE_CONTEXT = [
  "AGENTS.md",
  ...globSync(".github/agents/*.agent.md"),
  ...globSync(".github/instructions/*.instructions.md"),
];

const WORK_ITEM_PATTERN = /\bWI-\d+\b/;

describe("durable context is task-agnostic", () => {
  it("covers every durable context file", () => {
    expect(DURABLE_CONTEXT.length).toBeGreaterThanOrEqual(6);
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

/**
 * AGENTS.md is the only hand-authored durable file. The Copilot-specific copy
 * exists because GitHub's support matrix does not yet read AGENTS.md on every
 * surface, so it is generated rather than maintained.
 */
describe("the harness-specific instructions file is generated, not authored", () => {
  const generated = readFileSync(".github/copilot-instructions.md", "utf8").replace(/\r\n?/g, "\n");

  it("is marked as generated", () => {
    expect(generated).toMatch(/GENERATED FILE - DO NOT EDIT/);
    expect(generated).toMatch(/npm run instructions:sync/);
  });

  it("contains exactly the AGENTS.md content", () => {
    const source = readFileSync("AGENTS.md", "utf8").replace(/\r\n?/g, "\n").trimEnd();
    expect(generated.endsWith(`${source}\n`)).toBe(true);
  });

  it("cites the support matrix so the shim can be retired deliberately", () => {
    expect(generated).toMatch(/custom-instructions-support/);
  });
});
