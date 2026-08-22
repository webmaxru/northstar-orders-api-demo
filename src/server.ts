import { buildApp } from "./app.js";
import { InMemoryOrderRepository } from "./repositories/in-memory-order-repository.js";
import { BasicOrderService } from "./services/order-service.js";

const repository = new InMemoryOrderRepository();
const app = buildApp(new BasicOrderService(repository));
const port = Number(process.env.PORT ?? 3000);

await app.listen({ host: "0.0.0.0", port });
console.log(`Northstar Orders API listening on http://localhost:${port}`);

