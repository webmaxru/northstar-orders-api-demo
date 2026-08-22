import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import {
  InMemoryIdempotencyMetrics,
  type IdempotencyMetrics,
} from "../telemetry/idempotency-metrics.js";
import {
  PostgresIdempotentOrderService,
  type PostgresIdempotentOrderServiceOptions,
} from "./postgres-idempotent-order-service.js";
import type { OrderService } from "./order-service.js";

export interface IdempotencyHarness {
  services: readonly [OrderService, OrderService];
  metrics: IdempotencyMetrics;
  orderCount(): Promise<number>;
  reset(): Promise<void>;
  close(): Promise<void>;
}

export interface IdempotencyHarnessOptions {
  databaseUrl?: string;
}

async function migrate(pool: Pool): Promise<void> {
  const sql = await readFile(
    new URL("../../migrations/001_orders_and_idempotency.sql", import.meta.url),
    "utf8",
  );
  await pool.query(sql);
}

export async function createIdempotencyHarness(
  options: IdempotencyHarnessOptions = {},
): Promise<IdempotencyHarness> {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for the governed idempotency reference");
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 8 });
  await migrate(pool);
  const metrics = new InMemoryIdempotencyMetrics();
  const serviceOptions: PostgresIdempotentOrderServiceOptions = { pool, metrics };

  return {
    services: [
      new PostgresIdempotentOrderService(serviceOptions),
      new PostgresIdempotentOrderService(serviceOptions),
    ],
    metrics,
    orderCount: async () => {
      const result = await pool.query<{ count: string }>("SELECT count(*)::text AS count FROM orders");
      return Number(result.rows[0]?.count ?? 0);
    },
    reset: async () => {
      await pool.query("TRUNCATE idempotency_records, orders");
    },
    close: async () => {
      await pool.end();
    },
  };
}

