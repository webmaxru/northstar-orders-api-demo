import { afterEach, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { buildApp } from "../../src/app.js";
import { InMemoryOrderRepository } from "../../src/repositories/in-memory-order-repository.js";
import { BasicOrderService } from "../../src/services/order-service.js";
import { PostgresIdempotentOrderService } from "../../src/services/postgres-idempotent-order-service.js";
import { InMemoryIdempotencyMetrics } from "../../src/telemetry/idempotency-metrics.js";

const apps: ReturnType<typeof buildApp>[] = [];
const missingId = "00000000-0000-4000-8000-000000000001";
function application() {
  const repository = new InMemoryOrderRepository();
  const service = new BasicOrderService(repository);
  const app = buildApp(service);
  apps.push(app);
  return { repository, service, app };
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("PostgreSQL order lookup query", () => {
  it("uses one parameterized read and maps the persisted timestamp", async () => {
    const pool = new Pool();
    const createdAt = new Date("2026-09-24T00:00:00.000Z");
    const query = vi.fn(async (_sql: string, _values: unknown[]) => ({
      rows: [{ id: missingId, sku: "WIDGET-1", quantity: 2, created_at: createdAt }],
    }));
    Object.defineProperty(pool, "query", { value: query });
    const service = new PostgresIdempotentOrderService({ pool, metrics: new InMemoryIdempotencyMetrics() });
    try {
      expect(await service.getOrder(missingId)).toEqual({
        id: missingId, sku: "WIDGET-1", quantity: 2, createdAt: createdAt.toISOString(),
      });
      expect(query).toHaveBeenCalledExactlyOnceWith(
        "SELECT id, sku, quantity, created_at FROM orders WHERE id = $1", [missingId],
      );
    } finally {
      await pool.end();
    }
  });

  it("rejects invalid identifiers before reaching the database", async () => {
    const pool = new Pool();
    const query = vi.fn();
    Object.defineProperty(pool, "query", { value: query });
    const service = new PostgresIdempotentOrderService({ pool, metrics: new InMemoryIdempotencyMetrics() });
    try {
      await expect(service.getOrder("not-a-uuid")).rejects.toThrow("Order id must be a UUID");
      expect(query).not.toHaveBeenCalled();
    } finally {
      await pool.end();
    }
  });
});

describe("GET /orders/:id", () => {
  it("retrieves an existing order by id", async () => {
    const { app } = application();
    const created = await app.inject({
      method: "POST", url: "/orders", payload: { sku: "WIDGET-1", quantity: 2 },
    });
    const order: { id: string; sku: string; quantity: number; createdAt: string } = created.json();
    const response = await app.inject({ method: "GET", url: `/orders/${order.id}` });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(order);
    expect(response.headers["x-idempotent-replay"]).toBeUndefined();
  });

  it("rejects a malformed order id", async () => {
    const { app } = application();
    for (const id of ["not-a-uuid", "123", "00000000-0000-0000-0000-00000000000z"]) {
      const response = await app.inject({ method: "GET", url: `/orders/${id}` });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: "invalid_order_id", message: "Order id must be a UUID",
      });
    }
  });

  it("returns not found for an unknown order id", async () => {
    const { app } = application();
    const response = await app.inject({ method: "GET", url: `/orders/${missingId}` });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "order_not_found", message: "Order not found" });
  });

  it("retrieving an order has no write side effects", async () => {
    const { app, repository } = application();
    const order = await repository.create({ sku: "WIDGET-1", quantity: 1 });
    for (let index = 0; index < 3; index += 1) {
      expect((await app.inject({ method: "GET", url: `/orders/${order.id}` })).statusCode).toBe(200);
    }
    await app.inject({ method: "GET", url: `/orders/${missingId}` });
    expect(await repository.count()).toBe(1);
    expect(await repository.getById(order.id)).toEqual(order);
  });

  it("hides unexpected order lookup failures", async () => {
    class FailingReadRepository extends InMemoryOrderRepository {
      override async getById(_id: string): Promise<never> {
        throw new Error("Synthetic private database detail");
      }
    }
    const app = buildApp(new BasicOrderService(new FailingReadRepository()));
    apps.push(app);
    const response = await app.inject({ method: "GET", url: `/orders/${missingId}` });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "internal_error", message: "Unexpected server error" });
    expect(response.body).not.toContain("Synthetic private");
  });
});
