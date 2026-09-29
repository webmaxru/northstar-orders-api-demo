import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createIdempotencyHarness, type IdempotencyHarness } from "../../src/services/idempotency-harness.js";

describe.sequential("PostgreSQL idempotency privacy", () => {
  const databaseUrl = process.env.DATABASE_URL;
  let harness: IdempotencyHarness | undefined;
  let pool: Pool | undefined;
  let controlPool: Pool | undefined;
  let schemaCreated = false;
  const schema = `northstar_privacy_${randomBytes(8).toString("hex")}`;

  async function cleanup() {
    const errors: unknown[] = [];
    try {
      await harness?.close();
    } catch (error) {
      errors.push(error);
    }
    harness = undefined;
    try {
      await pool?.end();
    } catch (error) {
      errors.push(error);
    }
    pool = undefined;
    if (schemaCreated && controlPool) {
      try {
        await controlPool.query(`DROP SCHEMA "${schema}" CASCADE`);
        schemaCreated = false;
      } catch (error) {
        errors.push(error);
      }
    }
    try {
      await controlPool?.end();
    } catch (error) {
      errors.push(error);
    }
    controlPool = undefined;
    if (errors.length > 0) {
      throw new AggregateError(errors, "PostgreSQL privacy acceptance cleanup failed.");
    }
  }

  beforeAll(async () => {
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required");
    }
    const database = new URL(databaseUrl);
    const setupPool = new Pool({ connectionString: database.toString(), connectionTimeoutMillis: 10_000 });
    controlPool = setupPool;
    try {
      await setupPool.query(`CREATE SCHEMA "${schema}"`);
      schemaCreated = true;
      database.searchParams.set("options", `-c search_path=${schema}`);
      const isolatedUrl = database.toString();
      const setupHarness = await createIdempotencyHarness({ databaseUrl: isolatedUrl });
      harness = setupHarness;
      pool = new Pool({ connectionString: isolatedUrl, connectionTimeoutMillis: 10_000 });
      await setupHarness.reset();
    } catch (error) {
      try {
        await cleanup();
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          "PostgreSQL privacy acceptance setup and cleanup failed.",
          { cause: cleanupError },
        );
      }
      throw error;
    }
  });

  afterAll(cleanup);

  it("stores only fixed-length hashes", async () => {
    const currentHarness = harness;
    const currentPool = pool;
    if (!currentHarness || !currentPool) {
      throw new Error("PostgreSQL privacy acceptance setup is incomplete.");
    }
    const rawKey = "private-demo-correlation-key";
    await currentHarness.services[0].placeOrder({ sku: "SECRET-SKU", quantity: 2 }, rawKey);

    const result = await currentPool.query<{
      key_hash: string;
      request_hash: string;
      response_text: string;
    }>(
      `SELECT key_hash, request_hash, response_body::text AS response_text
         FROM idempotency_records`,
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.key_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.rows[0]?.request_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.rows[0]?.key_hash).not.toContain(rawKey);
    expect(result.rows[0]?.response_text).not.toContain(rawKey);
  });
});
