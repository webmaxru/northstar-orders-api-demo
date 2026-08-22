import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  IdempotencyConflictError,
  OrderValidationError,
  newOrder,
  type Order,
  type PlaceOrderInput,
} from "../domain/order.js";
import type { IdempotencyMetrics } from "../telemetry/idempotency-metrics.js";
import type { OrderService, PlaceOrderResult } from "./order-service.js";

interface IdempotencyRow {
  request_hash: string;
  response_body: unknown;
}

export interface PostgresIdempotentOrderServiceOptions {
  pool: Pool;
  metrics: IdempotencyMetrics;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashRequest(input: PlaceOrderInput): string {
  return sha256(JSON.stringify({ quantity: input.quantity, sku: input.sku }));
}

function isOrder(value: unknown): value is Order {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<Order>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.sku === "string" &&
    typeof candidate.quantity === "number" &&
    typeof candidate.createdAt === "string"
  );
}

async function insertOrder(client: PoolClient, input: PlaceOrderInput): Promise<Order> {
  const order = newOrder(input);
  await client.query(
    `INSERT INTO orders (id, sku, quantity, created_at)
     VALUES ($1, $2, $3, $4)`,
    [order.id, order.sku, order.quantity, order.createdAt],
  );
  return order;
}

export class PostgresIdempotentOrderService implements OrderService {
  readonly #pool: Pool;
  readonly #metrics: IdempotencyMetrics;

  constructor(options: PostgresIdempotentOrderServiceOptions) {
    this.#pool = options.pool;
    this.#metrics = options.metrics;
  }

  async placeOrder(input: PlaceOrderInput, idempotencyKey?: string): Promise<PlaceOrderResult> {
    if (!idempotencyKey) {
      const client = await this.#pool.connect();
      try {
        await client.query("BEGIN");
        const order = await insertOrder(client, input);
        await client.query("COMMIT");
        return { order, statusCode: 201, replayed: false };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }

    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
      throw new OrderValidationError(
        "Idempotency-Key must contain 8-128 letters, numbers, dots, underscores, colons, or hyphens",
      );
    }

    const keyHash = sha256(`northstar:${idempotencyKey}`);
    const requestHash = hashRequest(input);
    const client = await this.#pool.connect();

    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [keyHash]);
      await client.query(
        "DELETE FROM idempotency_records WHERE key_hash = $1 AND expires_at <= now()",
        [keyHash],
      );

      const existing = await client.query<IdempotencyRow>(
        `SELECT request_hash, response_body
           FROM idempotency_records
          WHERE key_hash = $1`,
        [keyHash],
      );
      const row = existing.rows[0];

      if (row) {
        if (row.request_hash !== requestHash) {
          this.#metrics.incrementConflict();
          throw new IdempotencyConflictError(
            "Idempotency key was already used for another request",
          );
        }
        if (!isOrder(row.response_body)) {
          throw new Error("Stored idempotency response is invalid");
        }

        await client.query("COMMIT");
        this.#metrics.incrementReplay();
        return { order: row.response_body, statusCode: 200, replayed: true };
      }

      const order = await insertOrder(client, input);
      await client.query(
        `INSERT INTO idempotency_records
           (key_hash, request_hash, order_id, response_body, expires_at)
         VALUES ($1, $2, $3, $4::jsonb, now() + interval '24 hours')`,
        [keyHash, requestHash, order.id, JSON.stringify(order)],
      );
      await client.query("COMMIT");
      return { order, statusCode: 201, replayed: false };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          "Order transaction and rollback failed",
          { cause: rollbackError },
        );
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
