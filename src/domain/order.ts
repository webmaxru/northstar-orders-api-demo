import { randomUUID } from "node:crypto";

export interface PlaceOrderInput {
  sku: string;
  quantity: number;
}

export interface Order {
  id: string;
  sku: string;
  quantity: number;
  createdAt: string;
}

export function parseOrderId(value: unknown): string {
  if (typeof value !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new OrderIdValidationError("Order id must be a UUID");
  }
  return value.toLowerCase();
}

export function parsePlaceOrderInput(value: unknown): PlaceOrderInput {
  if (!value || typeof value !== "object") {
    throw new OrderValidationError("Request body must be an object");
  }

  const candidate = value as Record<string, unknown>;
  const sku = typeof candidate.sku === "string" ? candidate.sku.trim() : "";
  const quantity = candidate.quantity;

  if (!/^[A-Z0-9-]{3,32}$/.test(sku)) {
    throw new OrderValidationError("sku must contain 3-32 uppercase letters, numbers, or hyphens");
  }
  if (!Number.isInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 100) {
    throw new OrderValidationError("quantity must be an integer between 1 and 100");
  }

  return { sku, quantity: Number(quantity) };
}

export function newOrder(input: PlaceOrderInput): Order {
  return {
    id: randomUUID(),
    sku: input.sku,
    quantity: input.quantity,
    createdAt: new Date().toISOString(),
  };
}

export class OrderValidationError extends Error {
  override readonly name = "OrderValidationError";
}

export class OrderIdValidationError extends Error {
  override readonly name = "OrderIdValidationError";
}

export class IdempotencyConflictError extends Error {
  override readonly name = "IdempotencyConflictError";
}
