import type { TaskContract } from "./task-contract.d.mts";

export declare const PLAN_CACHE: string;
export declare const PLAN_CONTRACT_CACHE: string;
export declare const APPROVED_PLAN_CACHE: string;
export declare const TASK_SESSION_CACHE: string;
export declare const EXECUTION_CONTEXT_CACHE: string;
export declare function clearTaskState(root?: string): void;
export declare function taskRole(prompt: unknown): "plan" | "implement" | null;

export type TaskDecision =
  | { action: "ignore" }
  | { action: "stop"; reason: string }
  | { action: "resolve"; issue: number };

export declare function isTaskInvocation(prompt: unknown): boolean;
export declare function extractIssue(prompt: unknown): number | null;
export declare function decide(prompt: unknown): TaskDecision;
export declare function resolveTask(
  issue: number,
  deps?: {
    root?: string;
    readContract?: (issue: number) => TaskContract;
    readApprovedPlan?: typeof import("./publish-plan.d.mts").fetchApprovedPlan;
    readProposedPlan?: typeof import("./publish-plan.d.mts").fetchProposedPlan;
    role?: "plan" | "implement" | null;
    sessionId?: string | null;
    cloud?: boolean;
  },
): { contract: TaskContract; plan: string | null };
export declare function renderResult(input: {
  contract: TaskContract;
  plan: string | null;
  issue: number;
}): string;
