import { describe, expect, it } from 'vitest';
import { orders } from '../data/orders';
import type { Order } from '../types';
import { canFulfill, fulfillOrder } from './fulfillment';

const base: Order = orders[0];

describe('canFulfill', () => {
  it('allows unfulfilled and partially fulfilled orders', () => {
    expect(canFulfill({ fulfillmentStatus: 'unfulfilled', paymentStatus: 'paid' })).toBe(true);
    expect(canFulfill({ fulfillmentStatus: 'partial', paymentStatus: 'paid' })).toBe(true);
  });

  it('allows orders that are still awaiting payment', () => {
    expect(canFulfill({ fulfillmentStatus: 'unfulfilled', paymentStatus: 'pending' })).toBe(true);
  });

  it('allows partially refunded orders', () => {
    expect(canFulfill({ fulfillmentStatus: 'unfulfilled', paymentStatus: 'partially_refunded' })).toBe(true);
  });

  it('blocks orders that are already fulfilled', () => {
    expect(canFulfill({ fulfillmentStatus: 'fulfilled', paymentStatus: 'paid' })).toBe(false);
  });

  it('blocks fully refunded orders', () => {
    expect(canFulfill({ fulfillmentStatus: 'unfulfilled', paymentStatus: 'refunded' })).toBe(false);
  });
});

describe('fulfillOrder', () => {
  it('marks the order fulfilled without changing anything else', () => {
    const order: Order = { ...base, fulfillmentStatus: 'partial' };
    const fulfilled = fulfillOrder(order);

    expect(fulfilled.fulfillmentStatus).toBe('fulfilled');
    expect({ ...fulfilled, fulfillmentStatus: 'partial' }).toEqual(order);
    expect(order.fulfillmentStatus).toBe('partial');
  });

  it('throws for an order that cannot be fulfilled', () => {
    expect(() => fulfillOrder({ ...base, fulfillmentStatus: 'fulfilled' })).toThrow(/can't be fulfilled/);
    expect(() => fulfillOrder({ ...base, fulfillmentStatus: 'unfulfilled', paymentStatus: 'refunded' })).toThrow();
  });
});
