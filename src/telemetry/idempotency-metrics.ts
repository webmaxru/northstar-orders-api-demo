export interface IdempotencyMetricSnapshot {
  replays: number;
  conflicts: number;
}

export interface IdempotencyMetrics {
  incrementReplay(): void;
  incrementConflict(): void;
  snapshot(): IdempotencyMetricSnapshot;
}

export class InMemoryIdempotencyMetrics implements IdempotencyMetrics {
  #replays = 0;
  #conflicts = 0;

  incrementReplay(): void {
    this.#replays += 1;
  }

  incrementConflict(): void {
    this.#conflicts += 1;
  }

  snapshot(): IdempotencyMetricSnapshot {
    return { replays: this.#replays, conflicts: this.#conflicts };
  }
}

