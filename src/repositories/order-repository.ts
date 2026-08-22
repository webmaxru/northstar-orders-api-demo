import type { Order, PlaceOrderInput } from "../domain/order.js";

export interface OrderRepository {
  create(input: PlaceOrderInput): Promise<Order>;
  getById(id: string): Promise<Order | undefined>;
  count(): Promise<number>;
  clear(): Promise<void>;
}

