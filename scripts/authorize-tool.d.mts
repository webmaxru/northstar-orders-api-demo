export type PermissionDecision = "allow" | "deny";

export interface ToolCall {
  toolName?: string;
  toolArgs?: Record<string, unknown>;
}

export interface AuthorizationDecision {
  permissionDecision: PermissionDecision;
  permissionDecisionReason: string;
}

export declare const WRITABLE_PATH_PREFIXES: readonly string[];

export declare function evaluateToolCall(call: ToolCall): AuthorizationDecision;
