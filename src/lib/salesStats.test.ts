import { describe, expect, it } from 'vitest';
import { discounts } from '../data/discounts';
import { orders } from '../data/orders';
import {
  addDays,
  countDays,
  filterOrdersInRange,
  getDailySales,
  getPresetRange,
  getPreviousPeriod,
  getSalesSummary,
  getTopProducts,
  orderDay,
  percentChange,
} from './salesStats';

const NOW = new Date('2026-09-30T12:00:00Z');
const AUGUST = { start: '2026-08-01', end: '2026-08-31' };
const SEPTEMBER = { start: '2026-09-01', end: '2026-09-30' };
const ALL_TIME = { start: '2026-01-01', end: '2026-12-31' };

describe('date helpers', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('counts days inclusively', () => {
    expect(countDays(SEPTEMBER)).toBe(30);
    expect(countDays({ start: '2026-09-30', end: '2026-09-30' })).toBe(1);
  });

  it('uses the UTC day an order was placed', () => {
    expect(orderDay({ createdAt: '2026-08-01T23:59:59Z' })).toBe('2026-08-01');
  });
});

describe('getPresetRange', () => {
  it('builds rolling ranges that end today', () => {
    expect(getPresetRange('last_7_days', NOW)).toEqual({ start: '2026-09-24', end: '2026-09-30' });
    expect(getPresetRange('last_30_days', NOW)).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    expect(getPresetRange('last_90_days', NOW)).toEqual({ start: '2026-07-03', end: '2026-09-30' });
  });

  it('builds calendar month ranges', () => {
    expect(getPresetRange('this_month', NOW)).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    expect(getPresetRange('last_month', NOW)).toEqual(AUGUST);
    expect(getPresetRange('last_month', new Date('2026-01-15T00:00:00Z'))).toEqual({
      start: '2025-12-01',
      end: '2025-12-31',
    });
  });
});

describe('getPreviousPeriod', () => {
  it('returns the same number of days just before the range', () => {
    expect(getPreviousPeriod(SEPTEMBER)).toEqual({ start: '2026-08-02', end: '2026-08-31' });
    expect(getPreviousPeriod({ start: '2026-09-24', end: '2026-09-30' })).toEqual({
      start: '2026-09-17',
      end: '2026-09-23',
    });
  });
});

describe('filterOrdersInRange', () => {
  it('includes orders on the first and last day', () => {
    const numbers = filterOrdersInRange(orders, { start: '2026-08-01', end: '2026-08-11' }).map((o) => o.number);
    expect(numbers).toEqual([1001, 1002, 1003]);
  });
});

describe('getSalesSummary', () => {
  it('summarises August, leaving the unpaid order out of the money', () => {
    expect(getSalesSummary(orders, discounts, AUGUST)).toEqual({
      orderCount: 5,
      paidOrderCount: 4,
      grossSalesCents: 50200,
      discountsCents: 6220,
      refundsCents: 3749,
      netSalesCents: 46966,
      averageOrderValueCents: 12679,
      unitsSold: 21,
    });
  });

  it('counts a fully refunded order as paid but not its units or money kept', () => {
    expect(getSalesSummary(orders, discounts, SEPTEMBER)).toEqual({
      orderCount: 2,
      paidOrderCount: 2,
      grossSalesCents: 17200,
      discountsCents: 1500,
      refundsCents: 7018,
      netSalesCents: 10500,
      averageOrderValueCents: 8759,
      unitsSold: 4,
    });
  });

  it('returns zeros and no average for a range without orders', () => {
    expect(getSalesSummary(orders, discounts, { start: '2026-01-01', end: '2026-01-31' })).toEqual({
      orderCount: 0,
      paidOrderCount: 0,
      grossSalesCents: 0,
      discountsCents: 0,
      refundsCents: 0,
      netSalesCents: 0,
      averageOrderValueCents: null,
      unitsSold: 0,
    });
  });
});

describe('getTopProducts', () => {
  it('ranks products by revenue on paid, unrefunded orders', () => {
    expect(getTopProducts(orders, ALL_TIME, 3)).toEqual([
      { productId: 'prod_005', title: 'Stoneware Mug', unitsSold: 12, revenueCents: 19200 },
      { productId: 'prod_002', title: 'Everyday Hoodie', unitsSold: 2, revenueCents: 11600 },
      { productId: 'prod_004', title: 'Ceramic Pour-Over Set', unitsSold: 2, revenueCents: 9000 },
    ]);
  });

  it('leaves out unpaid and fully refunded orders', () => {
    // Candles on unpaid order 1004 and socks on refunded order 1006 are not counted.
    const top = getTopProducts(orders, ALL_TIME, 10);
    expect(top.find((product) => product.productId === 'prod_008')?.unitsSold).toBe(1);
    expect(top.find((product) => product.productId === 'prod_010')?.unitsSold).toBe(2);
  });

  it('only looks at orders in the range', () => {
    expect(getTopProducts(orders, SEPTEMBER).map((product) => product.title)).toEqual([
      'Everyday Hoodie',
      'Organic Cotton Socks (3-pack)',
      'Classic Cotton T-Shirt',
    ]);
  });

  it('returns an empty list when nothing sold', () => {
    expect(getTopProducts(orders, { start: '2026-01-01', end: '2026-01-31' })).toEqual([]);
  });
});

describe('getDailySales', () => {
  it('returns one entry per day, including days without orders', () => {
    expect(getDailySales(orders, discounts, { start: '2026-09-13', end: '2026-09-15' })).toEqual([
      { date: '2026-09-13', orderCount: 0, netSalesCents: 0 },
      { date: '2026-09-14', orderCount: 0, netSalesCents: 0 },
      { date: '2026-09-15', orderCount: 1, netSalesCents: 10500 },
    ]);
  });

  it('adds up to the summary for the whole range', () => {
    const days = getDailySales(orders, discounts, AUGUST);
    expect(days).toHaveLength(31);
    expect(days.reduce((sum, day) => sum + day.netSalesCents, 0)).toBe(46966);
  });
});

describe('percentChange', () => {
  it('returns the change to one decimal place', () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(10500, 46966)).toBe(-77.6);
  });

  it('returns null when there is no previous value', () => {
    expect(percentChange(100, 0)).toBeNull();
  });
});
