export interface PlanCheck {
  ok: boolean;
  reason: string;
}

export declare const REQUIRED_SECTIONS: { label: string; pattern: RegExp }[];
export declare function validatePlan(prBody: unknown): PlanCheck;