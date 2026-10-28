// Edge cases that cut across the business logic: boundaries, unusual input
// and values that are easy to get wrong.
import { describe, expect, it } from 'vitest';
import { customers } from '../data/customers';
import { products } from '../data/products';
import type { Discount, OrderLineItem } from '../types';
import { matchesCustomerQuery } from './customers';
import { getDiscountStatus } from './discountRules';
import { formatDate, formatMoney } from './format';
import { validateAdjustment, MAX_INVENTORY } from './inventory';
import { calculateOrderTotals } from './orderTotals';
import { paginate } from './pagination';
import { parseMoneyToCents } from './productForm';
import { matchesQuery } from './products';
import { filterOrdersInRange, getPresetRange, getPreviousPeriod } from './salesStats';
import { getStockAlerts } from './stockAlerts';

const line = (quantity: number, unitPriceCents: number): OrderLineItem => ({
  productId: 'prod_x',
  title: 'Item',
  sku: 'ITEM',
  quantity,
  unitPriceCents,
});

describe('money edge cases', () => {
  it('formats single cents and large amounts', () => {
    expect(formatMoney(1)).toBe('$0.01');
    expect(formatMoney(99_999_999)).toBe('$999,999.99');
  });

  it('parses amounts typed in different ways', () => {
    expect(parseMoneyToCents('1,000')).toBe(100_000);
    expect(parseMoneyToCents('$0.5')).toBe(50);
    expect(parseMoneyToCents('00.10')).toBe(10);
  });

  it('rejects a dollar sign on its own and a misplaced one', () => {
    expect(parseMoneyToCents('$')).toBeNull();
    expect(parseMoneyToCents('5$')).toBeNull();
  });
});

describe('order totals edge cases', () => {
  it('leaves only shipping when a 100% discount is used', () => {
    const totals = calculateOrderTotals(
      { lineItems: [line(2, 2500)], shippingCents: 500, taxRate: 0.1 },
      { type: 'percentage', value: 100 },
    );
    expect(totals).toMatchObject({ discountCents: 5000, taxCents: 0, totalCents: 500 });
  });

  it('caps a fixed discount larger than the order at the subtotal', () => {
    const totals = calculateOrderTotals(
      { lineItems: [line(1, 300)], shippingCents: 0, taxRate: 0.1 },
      { type: 'fixed_amount', value: 1500 },
    );
    expect(totals).toMatchObject({ discountCents: 300, taxCents: 0, totalCents: 0 });
  });

  it('handles a zero-priced item', () => {
    const totals = calculateOrderTotals({ lineItems: [line(3, 0)], shippingCents: 500, taxRate: 0.1 }, null);
    expect(totals).toMatchObject({ itemCount: 3, subtotalCents: 0, totalCents: 500 });
  });
});

describe('search edge cases', () => {
  const socks = products.find((product) => product.id === 'prod_010')!;

  it('treats brackets and other symbols as plain text', () => {
    expect(matchesQuery(socks, '(3-pack)')).toBe(true);
    expect(matchesQuery(socks, '.*')).toBe(false);
  });

  it('ignores case in customer emails', () => {
    expect(matchesCustomerQuery(customers[0], 'MAYA.CHEN@EXAMPLE.COM')).toBe(true);
  });
});

describe('date edge cases', () => {
  it('formats a leap day', () => {
    expect(formatDate('2028-02-29T12:00:00Z')).toBe('Feb 29, 2028');
  });

  it('counts an order placed late on the last day of the month in that month', () => {
    const late = { createdAt: '2026-08-31T23:30:00Z' };
    expect(filterOrdersInRange([late], { start: '2026-08-01', end: '2026-08-31' })).toHaveLength(1);
    expect(filterOrdersInRange([late], { start: '2026-09-01', end: '2026-09-30' })).toHaveLength(0);
  });

  it('builds a one-day "this month" range on the first of the month', () => {
    const range = getPresetRange('this_month', new Date('2026-10-01T08:00:00Z'));
    expect(range).toEqual({ start: '2026-10-01', end: '2026-10-01' });
    expect(getPreviousPeriod(range)).toEqual({ start: '2026-09-30', end: '2026-09-30' });
  });

  it('keeps a one-day discount active until the last second of that day', () => {
    const flash: Discount = {
      code: 'FLASH',
      type: 'percentage',
      value: 20,
      minimumSubtotalCents: null,
      startsAt: '2026-10-05T00:00:00Z',
      endsAt: '2026-10-05T23:59:59Z',
      usageLimit: null,
      timesUsed: 0,
    };
    expect(getDiscountStatus(flash, new Date('2026-10-05T23:59:59Z'))).toBe('active');
    expect(getDiscountStatus(flash, new Date('2026-10-06T00:00:00Z'))).toBe('expired');
  });
});

describe('pagination and stock edge cases', () => {
  it('treats page zero and negative pages as the first page', () => {
    expect(paginate([1, 2, 3], 0, 2).page).toBe(1);
    expect(paginate([1, 2, 3], -4, 2).items).toEqual([1, 2]);
  });

  it('allows removing every unit and setting the maximum', () => {
    expect(validateAdjustment(5, { type: 'remove', quantity: 5 })).toBeNull();
    expect(validateAdjustment(5, { type: 'set', quantity: MAX_INVENTORY })).toBeNull();
  });

  it('treats negative stock as out of stock', () => {
    const oversold = { ...products[0], inventory: -2 };
    expect(getStockAlerts([oversold])).toMatchObject([{ status: 'out_of_stock', suggestedReorder: 40 }]);
  });
});
