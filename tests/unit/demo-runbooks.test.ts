import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("documents distinct delivery flows without claiming unverified acceptance", () => {
  const root = resolve(import.meta.dirname, "../..");
  const first = readFileSync(resolve(root, "docs/demos/plan-first-idempotency.md"), "utf8");
  const combined = readFileSync(resolve(root, "docs/demos/plan-execute-order-lookup.md"), "utf8");
  expect(first).toContain("21d5e5a937e61a2a0513158942b3c9556c1ab0e0");
  expect(first).toContain("ebec7ad380dd0a079a02b161a20aaa012ceec3da");
  expect(first).toContain("no application implementation before required plan");
  expect(combined).toContain("same PR");
  expect(combined).toContain("no separate mandatory plan-only approval");
  expect(combined).toContain("hosted workflow runs `plan-approval` unconditionally");
  for (const text of [first, combined]) {
    expect(text).toContain("VS Code");
    expect(text.toLowerCase()).toContain("cloud");
    expect(text).toContain("https://learn.microsoft.com/");
    expect(text.toLowerCase()).toContain("not");
  }
});
