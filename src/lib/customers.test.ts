import { describe, expect, it } from 'vitest';
import { customers } from '../data/customers';
import { discounts } from '../data/discounts';
import { orders } from '../data/orders';
import {
  buildCustomerRows,
  filterCustomers,
  formatLocation,
  getAverageOrderValue,
  getCustomerOrders,
  getCustomerStats,
  matchesCustomerQuery,
  sortCustomers,
  type CustomerRow,
} from './customers';

const rows = buildCustomerRows(customers, orders, discounts);
const names = (list: CustomerRow[]) => list.map((row) => row.customer.firstName);
const customerById = (id: string) => customers.find((customer) => customer.id === id)!;

describe('getCustomerStats', () => {
  it('adds up orders and payments', () => {
    // Order 1001 ($76.70) was paid; order 1006 ($70.18) was refunded in full.
    expect(getCustomerStats('cust_001', orders, discounts)).toEqual({
      orderCount: 2,
      paidOrderCount: 2,
      amountSpentCents: 7670,
      lastOrderAt: '2026-09-03T08:55:00Z',
    });
  });

  it('subtracts partial refunds from the amount spent', () => {
    expect(getCustomerStats('cust_005', orders, discounts).amountSpentCents).toBe(11384 - 3749);
  });

  it('counts unpaid orders without adding to the amount spent', () => {
    expect(getCustomerStats('cust_004', orders, discounts)).toMatchObject({
      orderCount: 1,
      paidOrderCount: 0,
      amountSpentCents: 0,
    });
  });

  it('returns zeros for a customer without orders', () => {
    expect(getCustomerStats('cust_new', orders, discounts)).toEqual({
      orderCount: 0,
      paidOrderCount: 0,
      amountSpentCents: 0,
      lastOrderAt: null,
    });
  });
});

describe('getAverageOrderValue', () => {
  it('divides the amount spent by the number of paid orders', () => {
    expect(getAverageOrderValue({ paidOrderCount: 2, amountSpentCents: 7670 })).toBe(3835);
  });

  it('rounds to the nearest cent', () => {
    expect(getAverageOrderValue({ paidOrderCount: 3, amountSpentCents: 1000 })).toBe(333);
  });

  it('returns null before any order is paid', () => {
    expect(getAverageOrderValue({ paidOrderCount: 0, amountSpentCents: 0 })).toBeNull();
  });
});

describe('getCustomerOrders', () => {
  it("returns only the customer's orders, newest first", () => {
    expect(getCustomerOrders('cust_001', orders).map((order) => order.number)).toEqual([1006, 1001]);
  });

  it('returns an empty list for a customer without orders', () => {
    expect(getCustomerOrders('cust_new', orders)).toEqual([]);
  });
});

describe('formatLocation', () => {
  it('joins city, region and country', () => {
    expect(formatLocation(customerById('cust_002'))).toBe('Toronto, ON, CA');
  });

  it('skips empty parts', () => {
    const customer = customerById('cust_002');
    expect(formatLocation({ ...customer, address: { ...customer.address, region: '' } })).toBe('Toronto, CA');
  });
});

describe('matchesCustomerQuery', () => {
  const maya = customerById('cust_001');

  it('matches full name, email, phone and city', () => {
    expect(matchesCustomerQuery(maya, 'maya chen')).toBe(true);
    expect(matchesCustomerQuery(maya, 'CHEN@EXAMPLE')).toBe(true);
    expect(matchesCustomerQuery(maya, '555 0142')).toBe(true);
    expect(matchesCustomerQuery(maya, 'san francisco')).toBe(true);
  });

  it('matches tags exactly rather than partially', () => {
    expect(matchesCustomerQuery(maya, 'vip')).toBe(true);
    expect(matchesCustomerQuery(maya, 'vi')).toBe(false);
  });

  it('matches everything for a blank query and nothing for unrelated text', () => {
    expect(matchesCustomerQuery(maya, ' ')).toBe(true);
    expect(matchesCustomerQuery(maya, 'toronto')).toBe(false);
  });
});

describe('filterCustomers', () => {
  it('filters by email subscription', () => {
    expect(names(filterCustomers(rows, { marketing: 'subscribed' }))).toEqual(['Maya', 'Sofia', 'Noah']);
    expect(names(filterCustomers(rows, { marketing: 'not_subscribed' }))).toEqual(['Liam', 'Aisha', 'Lucas']);
  });

  it('combines the subscription filter with search', () => {
    expect(names(filterCustomers(rows, { query: 'vip' }))).toEqual(['Maya', 'Aisha']);
    expect(names(filterCustomers(rows, { query: 'vip', marketing: 'subscribed' }))).toEqual(['Maya']);
  });
});

describe('sortCustomers', () => {
  it('sorts by last name, then first name', () => {
    expect(names(sortCustomers(rows, 'name'))).toEqual(['Maya', 'Aisha', 'Lucas', 'Liam', 'Sofia', 'Noah']);
  });

  it('sorts by amount spent, highest first', () => {
    expect(names(sortCustomers(rows, 'amountSpent', 'desc'))).toEqual([
      'Sofia',
      'Lucas',
      'Maya',
      'Aisha',
      'Liam',
      'Noah',
    ]);
  });

  it('sorts by number of orders', () => {
    expect(names(sortCustomers(rows, 'orderCount', 'desc'))[0]).toBe('Maya');
  });

  it('sorts by the date the customer joined', () => {
    expect(names(sortCustomers(rows, 'createdAt', 'desc'))).toEqual([
      'Lucas',
      'Aisha',
      'Noah',
      'Sofia',
      'Liam',
      'Maya',
    ]);
  });

  it('does not mutate the input', () => {
    const before = names(rows);
    sortCustomers(rows, 'name', 'desc');
    expect(names(rows)).toEqual(before);
  });
});
