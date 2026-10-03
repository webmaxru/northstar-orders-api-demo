import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Order } from "../../src/domain/order.js";
import { assertOrder, startApiProcess, stopApiProcess, type ApiProcess } from "../helpers/order-api-process.js";

describe.sequential("WI-1843 durable order retrieval", () => {
  const schema = `northstar_lookup_${randomBytes(8).toString("hex")}`;
  const servers: ApiProcess[] = [];
  let control: Pool | undefined;
  let databaseUrl: string;
  let schemaCreated = false;
  let writer: ApiProcess;
  let reader: ApiProcess;
  let order: Order;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
    const database = new URL(process.env.DATABASE_URL);
    control = new Pool({ connectionString: database.toString(), connectionTimeoutMillis: 10_000 });
    await control.query(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    database.searchParams.set("options", `-c search_path=${schema}`);
    databaseUrl = database.toString();
    writer = await startApiProcess(databaseUrl);
    servers.push(writer);
    reader = await startApiProcess(databaseUrl);
    servers.push(reader);
    const response = await fetch(`${writer.url}/orders`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": `lookup-${randomBytes(8).toString("hex")}` },
      body: JSON.stringify({ sku: "FICTIONAL-LOOKUP", quantity: 2 }),
      signal: AbortSignal.timeout(10_000),
    });
    expect(response.status).toBe(201);
    const body: unknown = await response.json();
    assertOrder(body);
    order = body;
  }, 90_000);

  afterAll(async () => {
    const errors: unknown[] = [];
    for (const result of await Promise.allSettled(servers.map(stopApiProcess))) {
      if (result.status === "rejected") errors.push(result.reason);
    }
    if (control && schemaCreated) {
      try { await control.query(`DROP SCHEMA "${schema}" CASCADE`); } catch (error) { errors.push(error); }
    }
    try { await control?.end(); } catch (error) { errors.push(error); }
    if (errors.length) throw new AggregateError(errors, "Order lookup acceptance cleanup failed.");
  }, 30_000);

  async function retrieve(server: ApiProcess) {
    const response = await fetch(`${server.url}/orders/${order.id}`, { signal: AbortSignal.timeout(10_000) });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-idempotent-replay")).toBeNull();
    expect(await response.json()).toEqual(order);
  }

  it("retrieves an order across independent server processes", async () => {
    expect(writer.pid).not.toBe(reader.pid);
    await retrieve(reader);
  });

  it("retrieves a durable order after process restart", async () => {
    const oldPid = writer.pid;
    await stopApiProcess(writer);
    writer = await startApiProcess(databaseUrl);
    servers.push(writer);
    expect(writer.pid).not.toBe(oldPid);
    await retrieve(writer);
    await retrieve(reader);
  }, 45_000);

  it("keeps persisted orders and idempotency records unchanged during retrieval", async () => {
    if (!control) throw new Error("Test database was not initialized.");
    const sql = `SELECT (SELECT json_agg(o) FROM "${schema}".orders o) AS orders,
      (SELECT json_agg(i) FROM "${schema}".idempotency_records i) AS idempotency`;
    const before = await control.query(sql);
    await retrieve(reader);
    const absent = await fetch(`${reader.url}/orders/00000000-0000-4000-8000-000000000001`, {
      signal: AbortSignal.timeout(10_000),
    });
    expect(absent.status).toBe(404);
    const after = await control.query(sql);
    expect(after.rows).toEqual(before.rows);
  });
});
