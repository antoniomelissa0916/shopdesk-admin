import { describe, expect, it } from 'vitest';
import { discounts } from '../data/discounts';
import { orders } from '../data/orders';
import type { OrderLineItem } from '../types';
import {
  calculateDiscount,
  calculateOrderTotals,
  calculateSubtotal,
  calculateTax,
  countItems,
  findDiscount,
  roundCents,
  type DiscountAmount,
} from './orderTotals';

function line(quantity: number, unitPriceCents: number): OrderLineItem {
  return { productId: 'prod_x', title: 'Item', sku: 'ITEM', quantity, unitPriceCents };
}

const tenPercent: DiscountAmount = { type: 'percentage', value: 10 };
const fiveDollars: DiscountAmount = { type: 'fixed_amount', value: 500 };

function orderById(id: string) {
  const order = orders.find((candidate) => candidate.id === id);
  if (!order) {
    throw new Error(`Missing order ${id}`);
  }
  return order;
}

describe('roundCents', () => {
  it('rounds halves up', () => {
    expect(roundCents(234.5)).toBe(235);
    expect(roundCents(234.49)).toBe(234);
  });

  it('is not thrown off by floating point noise', () => {
    expect(roundCents(234.49999999999997)).toBe(235);
    expect(roundCents(1.0000000000000002)).toBe(1);
  });
});

describe('countItems and calculateSubtotal', () => {
  it('add up quantities and line totals', () => {
    const items = [line(2, 2400), line(1, 1800), line(3, 99)];
    expect(countItems(items)).toBe(6);
    expect(calculateSubtotal(items)).toBe(6897);
  });

  it('return zero for no line items', () => {
    expect(countItems([])).toBe(0);
    expect(calculateSubtotal([])).toBe(0);
  });
});

describe('calculateDiscount', () => {
  it('returns zero without a discount', () => {
    expect(calculateDiscount(5000, null)).toBe(0);
  });

  it('takes a percentage of the subtotal, rounded to the nearest cent', () => {
    expect(calculateDiscount(5800, tenPercent)).toBe(580);
    expect(calculateDiscount(2345, tenPercent)).toBe(235);
    expect(calculateDiscount(2344, tenPercent)).toBe(234);
  });

  it('takes a fixed amount off', () => {
    expect(calculateDiscount(11200, fiveDollars)).toBe(500);
  });

  it('never discounts more than the subtotal', () => {
    expect(calculateDiscount(300, fiveDollars)).toBe(300);
    expect(calculateDiscount(1000, { type: 'percentage', value: 150 })).toBe(1000);
  });

  it('returns zero for an empty subtotal', () => {
    expect(calculateDiscount(0, fiveDollars)).toBe(0);
  });

  it('ignores negative discount values', () => {
    expect(calculateDiscount(1000, { type: 'fixed_amount', value: -200 })).toBe(0);
  });
});

describe('calculateTax', () => {
  it('applies the rate and rounds to the nearest cent', () => {
    expect(calculateTax(6600, 0.0863)).toBe(570);
    expect(calculateTax(22560, 0.08875)).toBe(2002);
  });

  it('returns zero for a zero rate or zero amount', () => {
    expect(calculateTax(5000, 0)).toBe(0);
    expect(calculateTax(0, 0.1)).toBe(0);
  });

  it('rejects a negative rate', () => {
    expect(() => calculateTax(5000, -0.1)).toThrow(RangeError);
  });
});

describe('findDiscount', () => {
  it('finds a code ignoring case and surrounding spaces', () => {
    expect(findDiscount(' welcome10 ', discounts)?.value).toBe(10);
  });

  it('returns null for a missing or unknown code', () => {
    expect(findDiscount(null, discounts)).toBeNull();
    expect(findDiscount('', discounts)).toBeNull();
    expect(findDiscount('NOPE', discounts)).toBeNull();
  });
});

describe('calculateOrderTotals', () => {
  it('adds shipping and tax to an order without a discount', () => {
    const order = orderById('ord_001');
    expect(calculateOrderTotals(order, findDiscount(order.discountCode, discounts))).toEqual({
      itemCount: 3,
      subtotalCents: 6600,
      discountCents: 0,
      shippingCents: 500,
      taxCents: 570,
      totalCents: 7670,
    });
  });

  it('charges tax on the discounted subtotal, not on shipping', () => {
    const order = orderById('ord_002');
    expect(calculateOrderTotals(order, findDiscount(order.discountCode, discounts))).toEqual({
      itemCount: 1,
      subtotalCents: 5800,
      discountCents: 580,
      shippingCents: 1200,
      taxCents: 679,
      totalCents: 7099,
    });
  });

  it('handles a large percentage discount with free shipping', () => {
    const order = orderById('ord_003');
    const totals = calculateOrderTotals(order, findDiscount(order.discountCode, discounts));
    expect(totals).toMatchObject({ itemCount: 14, subtotalCents: 28200, discountCents: 5640, taxCents: 2002 });
    expect(totals.totalCents).toBe(24562);
  });

  it('applies a fixed amount discount', () => {
    const order = orderById('ord_007');
    const totals = calculateOrderTotals(order, findDiscount(order.discountCode, discounts));
    expect(totals).toMatchObject({ subtotalCents: 11200, discountCents: 1500, taxCents: 800, totalCents: 10500 });
  });

  it('keeps the total equal to the sum of its parts for every seed order', () => {
    for (const order of orders) {
      const t = calculateOrderTotals(order, findDiscount(order.discountCode, discounts));
      expect(t.totalCents).toBe(t.subtotalCents - t.discountCents + t.shippingCents + t.taxCents);
      expect(t.totalCents).toBeGreaterThan(0);
    }
  });

  it('returns only shipping for an order with no line items', () => {
    expect(calculateOrderTotals({ lineItems: [], shippingCents: 500, taxRate: 0.1 }, tenPercent)).toEqual({
      itemCount: 0,
      subtotalCents: 0,
      discountCents: 0,
      shippingCents: 500,
      taxCents: 0,
      totalCents: 500,
    });
  });
});
