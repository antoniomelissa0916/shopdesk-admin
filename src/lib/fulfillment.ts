import type { Order } from '../types';

/** Orders can be fulfilled until they are fully fulfilled, unless they have been refunded in full. */
export function canFulfill(order: Pick<Order, 'fulfillmentStatus' | 'paymentStatus'>): boolean {
  return order.fulfillmentStatus !== 'fulfilled' && order.paymentStatus !== 'refunded';
}

/** Returns a copy of the order with every item marked as fulfilled. */
export function fulfillOrder(order: Order): Order {
  if (!canFulfill(order)) {
    throw new Error(`Order #${order.number} can't be fulfilled.`);
  }
  return { ...order, fulfillmentStatus: 'fulfilled' };
}
