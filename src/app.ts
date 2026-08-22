import Fastify, { type FastifyInstance } from "fastify";
import {
  IdempotencyConflictError,
  OrderValidationError,
  parsePlaceOrderInput,
} from "./domain/order.js";
import type { OrderService } from "./services/order-service.js";

export function buildApp(orderService: OrderService): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get("/health", async () => ({ status: "ok" }));

  app.post("/orders", async (request, reply) => {
    const input = parsePlaceOrderInput(request.body);
    const header = request.headers["idempotency-key"];
    const idempotencyKey = Array.isArray(header) ? header[0] : header;
    const result = await orderService.placeOrder(input, idempotencyKey);

    reply
      .header("x-idempotent-replay", String(result.replayed))
      .code(result.statusCode)
      .send(result.order);
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof OrderValidationError) {
      reply.code(400).send({ error: "invalid_order", message: error.message });
      return;
    }
    if (error instanceof IdempotencyConflictError) {
      reply.code(409).send({ error: "idempotency_conflict", message: error.message });
      return;
    }

    reply.code(500).send({ error: "internal_error", message: "Unexpected server error" });
  });

  return app;
}

