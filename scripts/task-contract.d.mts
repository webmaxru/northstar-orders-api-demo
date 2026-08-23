export interface TaskScope {
  allowed: string[];
  prohibited?: string[];
}

/** Learn's "Inputs": what the agent needs. */
export interface TaskInputs {
  workItem: string;
  architectureDecisions: string[];
  scope: TaskScope;
  constraints: string[];
}

/** Learn's "Outputs": what the agent produces. */
export interface TaskOutput {
  id: string;
  description: string;
  location?: string;
  artifacts?: string[];
}

/** Learn's "Success criteria": how results are evaluated. */
export interface SuccessCriterion {
  id: string;
  statement: string;
  provenBy: string;
}

/**
 * Inputs / Outputs / Success criteria follow the task contract described in
 * Microsoft Learn. `stopConditions` is an extension of this repository.
 */
export interface TaskContract {
  schema: string;
  id: string;
  title: string;
  inputs: TaskInputs;
  outputs: TaskOutput[];
  successCriteria: SuccessCriterion[];
  stopConditions: string[];
}

export declare const DEFAULT_SCOPE: TaskScope;

export declare function contractPath(taskId: string): string;

export declare function resolveTaskId(explicitId?: string): string | null;

export declare function loadTaskContract(explicitId?: string): TaskContract | null;

export declare function taskScope(contract?: TaskContract | null): TaskScope;

export declare function scopePrefixes(scope?: TaskScope): string[];
