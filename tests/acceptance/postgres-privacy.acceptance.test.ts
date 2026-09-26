import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createIdempotencyHarness, type IdempotencyHarness } from "../../src/services/idempotency-harness.js";
import {
  createIsolatedPostgresDatabase,
  type IsolatedPostgresDatabase,
} from "./postgres-test-database.js";

describe.sequential("PostgreSQL idempotency privacy", () => {
  const databaseUrl = process.env.DATABASE_URL;
  let harness: IdempotencyHarness;
  let pool: Pool;
  let isolatedDatabase: IsolatedPostgresDatabase;

  beforeAll(async () => {
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required");
    }
    isolatedDatabase = await createIsolatedPostgresDatabase(databaseUrl);
    harness = await createIdempotencyHarness({
      databaseUrl: isolatedDatabase.connectionString,
    });
    pool = new Pool({ connectionString: isolatedDatabase.connectionString });
    await harness.reset();
  });

  afterAll(async () => {
    const errors: unknown[] = [];
    for (const close of [
      () => harness?.close(),
      () => pool?.end(),
      () => isolatedDatabase?.close(),
    ]) {
      try {
        await close();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, "Privacy acceptance cleanup failed.");
    }
  });

  it("stores only fixed-length hashes", async () => {
    const rawKey = "private-demo-correlation-key";
    await harness.services[0].placeOrder({ sku: "SECRET-SKU", quantity: 2 }, rawKey);

    const result = await pool.query<{
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
