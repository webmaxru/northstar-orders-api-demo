export interface GovernanceCheck {
  id: string;
  ok: boolean;
  detail: string;
}

export declare function auditSourceTree(): {
  schema: "northstar/governance-report/1";
  generatedAt: string;
  policySchema: string;
  reviewCadence: Record<string, string>;
  ownership: Record<string, string>;
  checks: GovernanceCheck[];
  sourceControlsReady: boolean;
  externalControls: Record<string, "not-verified">;
};
export declare function rulesetAppliesToDefaultBranch(
  ruleset: Record<string, unknown>,
  defaultBranch: string,
): boolean;
export declare function hasRulesetBypass(
  ruleset: Record<string, unknown>,
): boolean;
