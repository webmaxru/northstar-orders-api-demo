import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contractFromFile, parseIssueBody, splitSections, taskScope } from "../../scripts/task-contract.mjs";
import { resolveIssueNumber } from "../../scripts/session-start.mjs";

const SEED = "docs/demo-setup/WI-1842.issue-seed.md";

/**
 * The contract lives in the issue. These tests parse the seed file, which is
 * the text used to create that issue, so a template change the parser cannot
 * read fails CI instead of failing on stage.
 */
describe("parsing a task contract out of an issue body", () => {
  const contract = contractFromFile(SEED);

  it("reads Learn's three sections", () => {
    expect(contract.inputs.scope.allowed).toEqual(["src/**", "tests/**", "migrations/**"]);
    expect(contract.inputs.authoritativeSources).toContain("docs/adr/007-durable-idempotency.md");
    expect(contract.outputs.map((o) => o.id)).toEqual(["plan", "changeset", "evidence"]);
    expect(contract.successCriteria).toHaveLength(6);
  });

  it("maps every criterion to the test that proves it", () => {
    for (const criterion of contract.successCriteria) {
      expect(criterion.id).toMatch(/^AC\d+$/);
      expect(criterion.statement.length).toBeGreaterThan(10);
      expect(criterion.provenBy, `${criterion.id} has no proving test`).toBeTruthy();
    }
  });

  it("records where the contract came from", () => {
    expect(contract.source.kind).toContain("seed file");
    expect(contract.source.issue).toBeNull();
  });

  it("carries prohibited scope and stop conditions", () => {
    expect(contract.inputs.scope.prohibited).toContain("deployment configuration");
    expect(contract.stopConditions.length).toBeGreaterThanOrEqual(5);
  });

  it("exposes scope to the authorizer, with a default when unresolved", () => {
    expect(taskScope(contract).allowed).toContain("src/**");
    expect(taskScope(null).allowed).toContain("src/**");
  });
});

describe("parser handles real GitHub issue-form output", () => {
  // GitHub returns bodies with CRLF; the seed file may be checked out either
  // way. Normalize here so these fixtures exercise the parser, not the shell.
  const seedBody = readFileSync(SEED, "utf8").replace(/\r\n?/g, "\n");

  it("normalizes CRLF bodies from the GitHub API", () => {
    const crlf = seedBody.replace(/\n/g, "\r\n");
    expect(parseIssueBody(crlf).successCriteria).toHaveLength(6);
  });

  it("treats unanswered optional fields as empty", () => {
    const body = seedBody.replace(
      /### Prohibited scope\n\n[\s\S]*?(?=\n### )/,
      "### Prohibited scope\n\n_No response_\n\n",
    );

    expect(parseIssueBody(body).inputs.scope.prohibited).toEqual([]);
  });

  it("tolerates bulleted lines, which the form editor may add", () => {
    const sections = splitSections("### Allowed scope\n\n- src/**\n- tests/**\n");
    expect(sections["allowed scope"]).toContain("src/**");
  });

  it("refuses a body that is not the agent-task template", () => {
    expect(() => parseIssueBody("Please fix the duplicate orders bug, thanks!")).toThrow(
      /missing required section/i,
    );
  });

  it("refuses success criteria that name no proving test", () => {
    const body = seedBody.replace(
      /### Success criteria\n\n[\s\S]*?(?=\n### )/,
      "### Success criteria\n\nIt should work properly\n\n",
    );

    expect(() => parseIssueBody(body)).toThrow(/ID \| statement \| proving test/);
  });
});

describe("the active task resolves without a manual step", () => {
  it("prefers an explicit AGENT_TASK_ISSUE", () => {
    expect(resolveIssueNumber({ env: { AGENT_TASK_ISSUE: "42" }, branch: "main" })).toEqual({
      number: 42,
      how: "AGENT_TASK_ISSUE",
    });
  });

  it("reads a task id out of the branch name before querying anything", () => {
    // Only the explicit rule is exercised here. The branch and sole-issue rules
    // query GitHub, which a unit test must not do.
    expect(resolveIssueNumber({ env: { AGENT_TASK_ISSUE: "7" }, branch: "wi-1842-idempotency" })).toMatchObject({
      number: 7,
    });
  });

  it("does not adopt the sole open issue unless asked", () => {
    // A workspace-wide hook fires on every session, including chats about
    // something else entirely. Adopting a task nobody asked for would both cost
    // a network round trip and govern unrelated work.
    expect(resolveIssueNumber({ env: {}, branch: "main" })).toEqual({
      number: null,
      how: "nothing",
    });
  });
});