import type { Customer, Discount, Order } from '../types';
import { calculateOrderTotals, findDiscount } from './orderTotals';
import type { SortDirection } from './sorting';

export interface CustomerStats {
  orderCount: number;
  /** Orders that have been paid for, including ones later refunded. */
  paidOrderCount: number;
  /** What the customer has paid across all orders, after refunds. */
  amountSpentCents: number;
  lastOrderAt: string | null;
}

export interface CustomerRow {
  customer: Customer;
  stats: CustomerStats;
}

export type MarketingFilter = 'all' | 'subscribed' | 'not_subscribed';
export type CustomerSortKey = 'name' | 'amountSpent' | 'orderCount' | 'createdAt';

/**
 * Totals a customer's orders. Orders still awaiting payment count towards
 * the order count but not the amount spent, since nothing has been paid.
 */
export function getCustomerStats(customerId: string, orders: Order[], discounts: Discount[]): CustomerStats {
  let orderCount = 0;
  let paidOrderCount = 0;
  let amountSpentCents = 0;
  let lastOrderAt: string | null = null;

  for (const order of orders) {
    if (order.customerId !== customerId) {
      continue;
    }
    orderCount += 1;
    if (order.paymentStatus !== 'pending') {
      paidOrderCount += 1;
      const { totalCents } = calculateOrderTotals(order, findDiscount(order.discountCode, discounts));
      amountSpentCents += Math.max(totalCents - order.refundedCents, 0);
    }
    if (lastOrderAt === null || Date.parse(order.createdAt) > Date.parse(lastOrderAt)) {
      lastOrderAt = order.createdAt;
    }
  }

  return { orderCount, paidOrderCount, amountSpentCents, lastOrderAt };
}

/** Average paid per paid order, rounded to the cent, or null before the first payment. */
export function getAverageOrderValue(stats: Pick<CustomerStats, 'paidOrderCount' | 'amountSpentCents'>): number | null {
  if (stats.paidOrderCount === 0) {
    return null;
  }
  return Math.round(stats.amountSpentCents / stats.paidOrderCount);
}

/** The customer's orders, newest first. */
export function getCustomerOrders(customerId: string, orders: Order[]): Order[] {
  return orders
    .filter((order) => order.customerId === customerId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function buildCustomerRows(customers: Customer[], orders: Order[], discounts: Discount[]): CustomerRow[] {
  return customers.map((customer) => ({ customer, stats: getCustomerStats(customer.id, orders, discounts) }));
}

export function formatLocation(customer: Customer): string {
  const { city, region, country } = customer.address;
  return [city, region, country].filter(Boolean).join(', ');
}

/** Matches name, email, phone, city or an exact tag, ignoring case. */
export function matchesCustomerQuery(customer: Customer, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const fields = [
    `${customer.firstName} ${customer.lastName}`,
    customer.email,
    customer.phone ?? '',
    customer.address.city,
  ];
  return (
    fields.some((field) => field.toLowerCase().includes(needle)) ||
    customer.tags.some((tag) => tag.toLowerCase() === needle)
  );
}

export interface CustomerFilters {
  query?: string;
  marketing?: MarketingFilter;
}

export function filterCustomers(rows: CustomerRow[], filters: CustomerFilters): CustomerRow[] {
  const { query = '', marketing = 'all' } = filters;
  return rows.filter(
    ({ customer }) =>
      (marketing === 'all' || customer.acceptsMarketing === (marketing === 'subscribed')) &&
      matchesCustomerQuery(customer, query),
  );
}

function compareRows(a: CustomerRow, b: CustomerRow, key: CustomerSortKey): number {
  switch (key) {
    case 'name':
      return (
        a.customer.lastName.localeCompare(b.customer.lastName, 'en', { sensitivity: 'base' }) ||
        a.customer.firstName.localeCompare(b.customer.firstName, 'en', { sensitivity: 'base' })
      );
    case 'amountSpent':
      return a.stats.amountSpentCents - b.stats.amountSpentCents;
    case 'orderCount':
      return a.stats.orderCount - b.stats.orderCount;
    case 'createdAt':
      return Date.parse(a.customer.createdAt) - Date.parse(b.customer.createdAt);
  }
}

export function sortCustomers(rows: CustomerRow[], key: CustomerSortKey, direction: SortDirection = 'asc'): CustomerRow[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * compareRows(a, b, key));
}
