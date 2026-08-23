import { globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadTaskContract, taskScope } from "../../scripts/task-contract.mjs";

const CONTRACTS = globSync("docs/work-items/*.contract.json");

/**
 * Microsoft Learn describes a task contract with three sections: Inputs,
 * Outputs, and Success criteria.
 * https://learn.microsoft.com/en-us/training/modules/design-agent-architecture-integration/3-inputs-outputs-success-criteria
 *
 * Learn shows those sections as prose in an issue or pull request. Rendering
 * them as JSON is this repository's choice, so these tests pin the shape to the
 * documented vocabulary and keep the extension explicit.
 */
describe("task contracts follow the documented structure", () => {
  it("finds at least one contract", () => {
    expect(CONTRACTS.length).toBeGreaterThan(0);
  });

  it.each(CONTRACTS)("%s has Inputs, Outputs and Success criteria", (file) => {
    const contract = JSON.parse(readFileSync(file, "utf8"));

    expect(Object.keys(contract)).toEqual(
      expect.arrayContaining(["inputs", "outputs", "successCriteria"]),
    );

    expect(contract.inputs.scope.allowed.length).toBeGreaterThan(0);
    expect(contract.inputs.workItem).toMatch(/^docs\/work-items\/.+\.md$/);
    expect(contract.outputs.length).toBeGreaterThan(0);

    for (const criterion of contract.successCriteria) {
      expect(criterion.id).toBeTruthy();
      expect(criterion.statement).toBeTruthy();
      expect(criterion.provenBy, `${criterion.id} has no evidence`).toBeTruthy();
    }
  });

  it.each(CONTRACTS)("%s labels anything beyond Learn's three sections", (file) => {
    const contract = JSON.parse(readFileSync(file, "utf8"));
    const documented = ["$schema-note", "schema", "id", "title", "inputs", "outputs", "successCriteria"];
    const extensions = Object.keys(contract).filter((key) => !documented.includes(key));

    // Extensions are allowed, but the note must say the schema is not a
    // Microsoft standard so nobody cites it as one.
    expect(extensions).toEqual(["stopConditions"]);
    expect(contract["$schema-note"]).toMatch(/not a Microsoft standard/i);
    expect(contract["$schema-note"]).toMatch(/learn\.microsoft\.com/);
  });

  it("exposes the contract's scope to the authorizer", () => {
    const contract = loadTaskContract("WI-1842");
    expect(taskScope(contract).allowed).toContain("src/**");
    expect(taskScope(null).allowed).toContain("src/**");
  });
});
