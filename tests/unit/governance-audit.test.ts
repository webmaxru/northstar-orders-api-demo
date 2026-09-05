import { describe, expect, it } from "vitest";
import {
  auditSourceTree,
  hasRulesetBypass,
  rulesetAppliesToDefaultBranch,
} from "../../scripts/governance-audit.mjs";

describe("source-controlled governance", () => {
  it("keeps every required local control present and internally consistent", () => {
    const report = auditSourceTree();
    const failures = report.checks.filter(({ ok }) => !ok);
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
    expect(report.sourceControlsReady).toBe(true);
  });

  it("labels hosted repository controls as unverified rather than pretending", () => {
    expect(new Set(Object.values(auditSourceTree().externalControls))).toEqual(
      new Set(["not-verified"]),
    );
  });

  it("ignores a ruleset that excludes the default branch", () => {
    expect(
      rulesetAppliesToDefaultBranch(
        {
          enforcement: "active",
          target: "branch",
          conditions: {
            ref_name: {
              include: ["~DEFAULT_BRANCH"],
              exclude: ["refs/heads/main"],
            },
          },
        },
        "main",
      ),
    ).toBe(false);
  });

  it("rejects every ruleset bypass mode", () => {
    for (const bypass_mode of ["always", "pull_request", "exempt"]) {
      expect(
        hasRulesetBypass({
          bypass_actors: [{ actor_id: 1, bypass_mode }],
        }),
      ).toBe(true);
    }
  });
});
