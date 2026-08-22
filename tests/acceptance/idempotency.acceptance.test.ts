import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IdempotencyConflictError } from "../../src/domain/order.js";
import {
  createIdempotencyHarness,
  type IdempotencyHarness,
} from "../../src/services/idempotency-harness.js";

describe.sequential("WI-1842 idempotency acceptance", () => {
  let harness: IdempotencyHarness;

  beforeEach(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    harness = await createIdempotencyHarness(databaseUrl ? { databaseUrl } : {});
    await harness.reset();
  });

  afterEach(async () => {
    await harness?.close();
  });

  it("replays the original response on the same instance", async () => {
    const first = await harness.services[0].placeOrder(
      { sku: "WIDGET-1", quantity: 2 },
      "same-instance-key",
    );
    const replay = await harness.services[0].placeOrder(
      { sku: "WIDGET-1", quantity: 2 },
      "same-instance-key",
    );

    expect(replay.order.id).toBe(first.order.id);
    expect(replay.statusCode).toBe(200);
    expect(replay.replayed).toBe(true);
    expect(await harness.orderCount()).toBe(1);
  });

  it("replays the original response across instances", async () => {
    const first = await harness.services[0].placeOrder(
      { sku: "WIDGET-1", quantity: 2 },
      "cross-instance-key",
    );
    const replay = await harness.services[1].placeOrder(
      { sku: "WIDGET-1", quantity: 2 },
      "cross-instance-key",
    );

    expect(replay.order.id).toBe(first.order.id);
    expect(replay.replayed).toBe(true);
    expect(await harness.orderCount()).toBe(1);
  });

  it("rejects a different payload for the same key", async () => {
    await harness.services[0].placeOrder(
      { sku: "WIDGET-1", quantity: 1 },
      "conflict-key",
    );

    await expect(
      harness.services[1].placeOrder(
        { sku: "WIDGET-1", quantity: 2 },
        "conflict-key",
      ),
    ).rejects.toBeInstanceOf(IdempotencyConflictError);
    expect(await harness.orderCount()).toBe(1);
  });

  it("creates exactly one order under concurrent cross-instance retries", async () => {
    const requests = Array.from({ length: 12 }, (_, index) =>
      harness.services[index % 2]!.placeOrder(
        { sku: "WIDGET-1", quantity: 3 },
        "concurrent-key",
      ),
    );
    const results = await Promise.all(requests);

    expect(new Set(results.map((result) => result.order.id)).size).toBe(1);
    expect(results.filter((result) => result.replayed).length).toBe(11);
    expect(await harness.orderCount()).toBe(1);
  });

  it("preserves baseline behavior without an idempotency key", async () => {
    const first = await harness.services[0].placeOrder({ sku: "WIDGET-1", quantity: 1 });
    const second = await harness.services[1].placeOrder({ sku: "WIDGET-1", quantity: 1 });

    expect(first.order.id).not.toBe(second.order.id);
    expect(await harness.orderCount()).toBe(2);
  });

  it("emits replay and conflict metrics", async () => {
    await harness.services[0].placeOrder({ sku: "WIDGET-1", quantity: 1 }, "metric-key");
    await harness.services[1].placeOrder({ sku: "WIDGET-1", quantity: 1 }, "metric-key");
    await expect(
      harness.services[0].placeOrder({ sku: "WIDGET-2", quantity: 1 }, "metric-key"),
    ).rejects.toBeInstanceOf(IdempotencyConflictError);

    expect(harness.metrics.snapshot()).toEqual({ replays: 1, conflicts: 1 });
  });
});
