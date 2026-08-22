import { newOrder, type Order, type PlaceOrderInput } from "../domain/order.js";
import type { OrderRepository } from "./order-repository.js";

export class InMemoryOrderRepository implements OrderRepository {
  readonly #orders = new Map<string, Order>();

  constructor(private readonly latencyMs = 0) {}

  async create(input: PlaceOrderInput): Promise<Order> {
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }

    const order = newOrder(input);
    this.#orders.set(order.id, order);
    return order;
  }

  async getById(id: string): Promise<Order | undefined> {
    return this.#orders.get(id);
  }

  async count(): Promise<number> {
    return this.#orders.size;
  }

  async clear(): Promise<void> {
    this.#orders.clear();
  }
}

