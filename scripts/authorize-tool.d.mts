export type PermissionDecision = "allow" | "deny";

export interface ToolCall {
  toolName?: string;
  toolArgs?: Record<string, unknown>;
}

export interface TaskScope {
  allowed: string[];
  prohibited?: string[];
}

export interface AuthorizationContext {
  scope?: TaskScope;
  taskId?: string;
}

export interface AuthorizationDecision {
  permissionDecision: PermissionDecision;
  permissionDecisionReason: string;
}

export declare const WRITABLE_PATH_PREFIXES: readonly string[];

export declare function evaluateToolCall(
  call: ToolCall,
  context?: AuthorizationContext,
): AuthorizationDecision;

export type ParsedPayload =
  | { ok: true; value: unknown }
  | { ok: false; reason: string };

export declare function parsePayload(raw: string): ParsedPayload;
