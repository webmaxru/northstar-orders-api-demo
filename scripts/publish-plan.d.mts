export interface PlanMeta {
  at?: string;
}

export declare function renderPlan(body: string, meta?: PlanMeta): string;

export declare function extractPlan(raw: string): string | null;

export declare function publish(
  issue: string | number,
  body: string,
): { updated: boolean; id: number };
