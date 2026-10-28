import type { Customer, Discount, FulfillmentStatus, Order, PaymentStatus } from '../types';
import { calculateOrderTotals, findDiscount, type OrderTotals } from './orderTotals';

export type PaymentFilter = PaymentStatus | 'all';
export type FulfillmentFilter = FulfillmentStatus | 'all';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Payment pending',
  paid: 'Paid',
  partially_refunded: 'Partially refunded',
  refunded: 'Refunded',
};

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
  unfulfilled: 'Unfulfilled',
  partial: 'Partially fulfilled',
  fulfilled: 'Fulfilled',
};

export interface OrderRow {
  order: Order;
  customer: Customer | null;
  totals: OrderTotals;
}

export function customerName(customer: Customer | null): string {
  return customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown customer';
}

export function buildOrderRows(orders: Order[], customers: Customer[], discounts: Discount[]): OrderRow[] {
  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  return orders.map((order) => ({
    order,
    customer: customersById.get(order.customerId) ?? null,
    totals: calculateOrderTotals(order, findDiscount(order.discountCode, discounts)),
  }));
}

/**
 * Matches an order number (with or without #), or the customer's name or
 * email, ignoring case.
 */
export function matchesOrderQuery(row: OrderRow, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const number = needle.startsWith('#') ? needle.slice(1) : needle;
  if (String(row.order.number).includes(number)) {
    return true;
  }
  if (!row.customer) {
    return false;
  }
  return [customerName(row.customer), row.customer.email].some((field) => field.toLowerCase().includes(needle));
}

export interface OrderFilters {
  query?: string;
  payment?: PaymentFilter;
  fulfillment?: FulfillmentFilter;
}

export function filterOrders(rows: OrderRow[], filters: OrderFilters): OrderRow[] {
  const { query = '', payment = 'all', fulfillment = 'all' } = filters;
  return rows.filter(
    (row) =>
      (payment === 'all' || row.order.paymentStatus === payment) &&
      (fulfillment === 'all' || row.order.fulfillmentStatus === fulfillment) &&
      matchesOrderQuery(row, query),
  );
}

/** Newest orders first; orders placed at the same moment fall back to the higher order number. */
export function sortOrdersNewestFirst(rows: OrderRow[]): OrderRow[] {
  return [...rows].sort(
    (a, b) => Date.parse(b.order.createdAt) - Date.parse(a.order.createdAt) || b.order.number - a.order.number,
  );
}
