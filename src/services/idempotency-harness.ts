import type { OrderRepository } from "../repositories/order-repository.js";
import type { OrderService } from "./order-service.js";
import type { IdempotencyMetrics } from "../telemetry/idempotency-metrics.js";

export interface IdempotencyHarness {
  services: readonly [OrderService, OrderService];
  metrics: IdempotencyMetrics;
  orderCount(): Promise<number>;
  reset(): Promise<void>;
  close(): Promise<void>;
}

export interface IdempotencyHarnessOptions {
  databaseUrl?: string;
  repository?: OrderRepository;
}

export async function createIdempotencyHarness(
  _options: IdempotencyHarnessOptions = {},
): Promise<IdempotencyHarness> {
  throw new Error("WI-1842 is not implemented. Produce and approve a plan before editing.");
}

