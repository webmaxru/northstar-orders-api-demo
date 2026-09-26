import { parseOrderId, type Order, type PlaceOrderInput } from "../domain/order.js";
import type { OrderRepository } from "../repositories/order-repository.js";

export interface PlaceOrderResult {
  order: Order;
  statusCode: 200 | 201;
  replayed: boolean;
}

export interface OrderService {
  placeOrder(input: PlaceOrderInput, idempotencyKey?: string): Promise<PlaceOrderResult>;
  getOrder(id: string): Promise<Order | undefined>;
}

export class BasicOrderService implements OrderService {
  constructor(private readonly orders: OrderRepository) {}

  async placeOrder(input: PlaceOrderInput, _idempotencyKey?: string): Promise<PlaceOrderResult> {
    return {
      order: await this.orders.create(input),
      statusCode: 201,
      replayed: false,
    };
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.getById(parseOrderId(id));
  }
}
