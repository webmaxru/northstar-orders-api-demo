export interface TaskScope {
  allowed: string[];
  prohibited?: string[];
}

export interface AcceptanceCriterion {
  id: string;
  statement: string;
  provenBy: string;
}

export interface TaskContract {
  id: string;
  title: string;
  workItem: string;
  architectureDecisions: string[];
  scope: TaskScope;
  stopConditions: string[];
  acceptanceCriteria: AcceptanceCriterion[];
}

export declare const DEFAULT_SCOPE: TaskScope;

export declare function contractPath(taskId: string): string;

export declare function resolveTaskId(explicitId?: string): string | null;

export declare function loadTaskContract(explicitId?: string): TaskContract | null;

export declare function scopePrefixes(scope?: TaskScope): string[];
