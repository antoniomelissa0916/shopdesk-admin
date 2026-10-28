import { describe, expect, it } from 'vitest';
import { customers } from '../data/customers';
import { discounts } from '../data/discounts';
import { orders } from '../data/orders';
import {
  buildOrderRows,
  customerName,
  filterOrders,
  matchesOrderQuery,
  sortOrdersNewestFirst,
  type OrderRow,
} from './orders';

const rows = buildOrderRows(orders, customers, discounts);
const numbers = (list: OrderRow[]) => list.map((row) => row.order.number);
const rowFor = (number: number) => rows.find((row) => row.order.number === number)!;

describe('buildOrderRows', () => {
  it('pairs each order with its customer and totals', () => {
    const row = rowFor(1002);
    expect(row.customer?.email).toBe('liam.okafor@example.com');
    expect(row.totals.totalCents).toBe(7099);
  });

  it('leaves the customer empty when it cannot be found', () => {
    const [row] = buildOrderRows([{ ...orders[0], customerId: 'cust_missing' }], customers, discounts);
    expect(row.customer).toBeNull();
    expect(customerName(row.customer)).toBe('Unknown customer');
  });
});

describe('matchesOrderQuery', () => {
  const row = rowFor(1003);

  it('matches the order number with or without a hash', () => {
    expect(matchesOrderQuery(row, '1003')).toBe(true);
    expect(matchesOrderQuery(row, '#1003')).toBe(true);
    expect(matchesOrderQuery(row, '#1004')).toBe(false);
  });

  it('matches the customer name and email, ignoring case', () => {
    expect(matchesOrderQuery(row, 'sofia ROSSI')).toBe(true);
    expect(matchesOrderQuery(row, 'rossi@example')).toBe(true);
    expect(matchesOrderQuery(row, 'maya')).toBe(false);
  });

  it('matches everything for a blank query', () => {
    expect(matchesOrderQuery(row, '  ')).toBe(true);
  });
});

describe('filterOrders', () => {
  it('filters by payment status', () => {
    expect(numbers(filterOrders(rows, { payment: 'pending' }))).toEqual([1004]);
    expect(numbers(filterOrders(rows, { payment: 'refunded' }))).toEqual([1006]);
  });

  it('filters by fulfillment status', () => {
    expect(numbers(filterOrders(rows, { fulfillment: 'fulfilled' }))).toEqual([1001, 1005]);
    expect(numbers(filterOrders(rows, { fulfillment: 'partial' }))).toEqual([1003]);
  });

  it('combines payment, fulfillment and search filters', () => {
    expect(numbers(filterOrders(rows, { payment: 'paid', fulfillment: 'unfulfilled' }))).toEqual([1002, 1007]);
    expect(numbers(filterOrders(rows, { payment: 'paid', fulfillment: 'unfulfilled', query: 'lucas' }))).toEqual([
      1007,
    ]);
  });

  it('returns every order with no filters', () => {
    expect(filterOrders(rows, {})).toHaveLength(orders.length);
  });
});

describe('sortOrdersNewestFirst', () => {
  it('puts the most recent orders first', () => {
    expect(numbers(sortOrdersNewestFirst(rows))).toEqual([1007, 1006, 1005, 1004, 1003, 1002, 1001]);
  });

  it('breaks ties by order number', () => {
    const sameTime = rows.slice(0, 2).map((row) => ({
      ...row,
      order: { ...row.order, createdAt: '2026-09-01T00:00:00Z' },
    }));
    expect(numbers(sortOrdersNewestFirst(sameTime))).toEqual([1002, 1001]);
  });

  it('does not mutate the input', () => {
    const before = numbers(rows);
    sortOrdersNewestFirst(rows);
    expect(numbers(rows)).toEqual(before);
  });
});
