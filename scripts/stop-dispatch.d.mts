export declare function selectStopHandler(
  session: { role?: string; sessionId?: string | null } | null | undefined,
  payload: { session_id?: string; sessionId?: string },
  env?: Record<string, string | undefined>,
): "plan-stop.mjs" | "agent-stop.mjs" | null;
