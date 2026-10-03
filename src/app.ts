import Fastify, { type FastifyInstance } from "fastify";
import {
  IdempotencyConflictError,
  OrderIdValidationError,
  OrderValidationError,
  parsePlaceOrderInput,
  parseOrderId,
} from "./domain/order.js";
import type { OrderService } from "./services/order-service.js";

export function buildApp(orderService: OrderService): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get("/health", async () => ({ status: "ok" }));

  app.get<{ Params: { id: string } }>("/orders/:id", async (request, reply) => {
    const order = await orderService.getOrder(parseOrderId(request.params.id));
    if (!order) {
      return reply.code(404).send({ error: "order_not_found", message: "Order not found" });
    }
    return order;
  });

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
    if (error instanceof OrderIdValidationError) {
      reply.code(400).send({ error: "invalid_order_id", message: error.message });
      return;
    }
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
