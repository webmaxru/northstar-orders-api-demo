import { describe, expect, it } from "vitest";
import { planArtifactPath, validatePlanOnlyFiles } from "../../scripts/plan-artifact.mjs";

const input = {
  taskId: "WI-1842",
  files: [{ filename: "docs/plans/wi-1842.md", status: "added", sha: "a".repeat(40) }],
  entry: { path: "wi-1842.md", type: "blob", mode: "100644", sha: "a".repeat(40) },
};

describe("versioned plan-only boundaries", () => {
  it("accepts only the task-bound versioned plan artifact", () => {
    expect(validatePlanOnlyFiles(input)).toMatchObject({ ok: true, path: "docs/plans/wi-1842.md" });
    expect(validatePlanOnlyFiles({
      ...input, files: [{ ...input.files[0]!, status: "modified" }],
    }).ok).toBe(true);
    expect(validatePlanOnlyFiles({ ...input, files: [] }).ok).toBe(false);
    expect(validatePlanOnlyFiles({
      ...input, files: [...input.files, { filename: "src/server.ts", status: "modified" }],
    }).ok).toBe(false);
    expect(validatePlanOnlyFiles({
      ...input, files: [{ ...input.files[0]!, filename: "docs/plans/another-task.md" }],
    }).ok).toBe(false);
  });

  it("rejects executable, symlink, submodule, renamed, deleted, and mismatched plan blobs", () => {
    for (const mode of ["100755", "120000", "160000"]) {
      expect(validatePlanOnlyFiles({ ...input, entry: { ...input.entry, mode } }).ok).toBe(false);
    }
    for (const status of ["removed", "renamed", "copied"]) {
      expect(validatePlanOnlyFiles({ ...input, files: [{ ...input.files[0]!, status }] }).ok).toBe(false);
    }
    expect(validatePlanOnlyFiles({
      ...input, files: [{ ...input.files[0]!, previous_filename: "src/server.ts" }],
    }).ok).toBe(false);
    expect(validatePlanOnlyFiles({
      ...input, entry: { ...input.entry, sha: "b".repeat(40) },
    }).ok).toBe(false);
  });

  it("rejects traversal and nonportable task names", () => {
    for (const task of ["", "../WI-1842", "a/b", "a\\b", "CON", "NUL.txt", "-task"]) {
      expect(() => planArtifactPath(task)).toThrow(/portable/);
    }
  });
});
