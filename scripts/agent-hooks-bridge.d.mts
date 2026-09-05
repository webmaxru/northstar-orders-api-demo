import type { InterceptionRecord } from "@responsibleai/agent-hooks";
import type {
  AuthorizationContext,
  ToolCall,
} from "./authorize-tool.d.mts";

export declare function evaluateAgentHooksToolCall(
  call: ToolCall,
  authorization: AuthorizationContext & {
    contractDigest?: string | null;
    planDigest?: string | null;
    repositorySha?: string | null;
  },
  options?: {
    role?: string;
    cloud?: boolean;
    sessionId?: string;
    callId?: string;
    reportDecision?: string | null;
    recordSink?: (record: InterceptionRecord) => void;
  },
): Promise<{
  decision: {
    permissionDecision: "allow" | "deny" | "ask";
    permissionDecisionReason: string;
    modifiedArgs?: Record<string, unknown>;
    hookSpecificOutput: {
      hookEventName: "PreToolUse";
      permissionDecision: "allow" | "deny" | "ask";
      permissionDecisionReason: string;
      updatedInput?: Record<string, unknown>;
    };
  };
  record: InterceptionRecord;
}>;
export declare function payloadFreeRecord(
  record: InterceptionRecord,
): InterceptionRecord;
