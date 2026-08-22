import { buildApp } from "./app.js";
import { InMemoryOrderRepository } from "./repositories/in-memory-order-repository.js";
import { createIdempotencyHarness } from "./services/idempotency-harness.js";
import { BasicOrderService } from "./services/order-service.js";

const databaseUrl = process.env.DATABASE_URL;
const harness = databaseUrl ? await createIdempotencyHarness({ databaseUrl }) : undefined;
const service = harness
  ? harness.services[0]
  : new BasicOrderService(new InMemoryOrderRepository());
const app = buildApp(service);
const port = Number(process.env.PORT ?? 3000);

if (harness) {
  app.addHook("onClose", async () => {
    await harness.close();
  });
}

await app.listen({ host: "0.0.0.0", port });
console.log(`Northstar Orders API listening on http://localhost:${port}`);
