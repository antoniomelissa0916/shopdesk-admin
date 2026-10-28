import { describe, expect, it } from 'vitest';
import { orders } from '../data/orders';
import { ordersReducer } from './ordersReducer';

describe('ordersReducer', () => {
  it('replaces an updated order in place', () => {
    const updated = { ...orders[1], fulfillmentStatus: 'fulfilled' as const };
    const next = ordersReducer(orders, { type: 'updated', order: updated });

    expect(next).toHaveLength(orders.length);
    expect(next[1]).toBe(updated);
    expect(next[0]).toBe(orders[0]);
  });

  it('ignores updates for unknown orders', () => {
    const unknown = { ...orders[0], id: 'ord_missing' };
    expect(ordersReducer(orders, { type: 'updated', order: unknown })).toBe(orders);
  });

  it('does not mutate the previous state', () => {
    const before = [...orders];
    ordersReducer(orders, { type: 'updated', order: { ...orders[0], refundedCents: 100 } });
    expect(orders).toEqual(before);
  });
});
