import type { Discount, Order } from '../types';
import { calculateOrderTotals, findDiscount } from './orderTotals';

/** An inclusive range of whole UTC days, as YYYY-MM-DD strings. */
export interface DateRange {
  start: string;
  end: string;
}

export type RangePreset = 'last_7_days' | 'last_30_days' | 'last_90_days' | 'this_month' | 'last_month';

export const RANGE_PRESET_LABELS: Record<RangePreset, string> = {
  last_7_days: 'Last 7 days',
  last_30_days: 'Last 30 days',
  last_90_days: 'Last 90 days',
  this_month: 'This month',
  last_month: 'Last month',
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, amount: number): string {
  return toDay(new Date(Date.parse(`${day}T00:00:00Z`) + amount * DAY_MS));
}

export function countDays(range: DateRange): number {
  return Math.round((Date.parse(`${range.end}T00:00:00Z`) - Date.parse(`${range.start}T00:00:00Z`)) / DAY_MS) + 1;
}

export function getPresetRange(preset: RangePreset, now: Date): DateRange {
  const today = toDay(now);
  switch (preset) {
    case 'last_7_days':
      return { start: addDays(today, -6), end: today };
    case 'last_30_days':
      return { start: addDays(today, -29), end: today };
    case 'last_90_days':
      return { start: addDays(today, -89), end: today };
    case 'this_month':
      return { start: `${today.slice(0, 7)}-01`, end: today };
    case 'last_month': {
      const firstOfThisMonth = `${today.slice(0, 7)}-01`;
      const end = addDays(firstOfThisMonth, -1);
      return { start: `${end.slice(0, 7)}-01`, end };
    }
  }
}

/** The range of the same length that ends the day before this one starts. */
export function getPreviousPeriod(range: DateRange): DateRange {
  const length = countDays(range);
  return { start: addDays(range.start, -length), end: addDays(range.start, -1) };
}

export function orderDay(order: Pick<Order, 'createdAt'>): string {
  return toDay(new Date(order.createdAt));
}

export function filterOrdersInRange<T extends Pick<Order, 'createdAt'>>(orders: T[], range: DateRange): T[] {
  return orders.filter((order) => {
    const day = orderDay(order);
    return day >= range.start && day <= range.end;
  });
}

/** Orders that took money: everything except orders still awaiting payment. */
function isPaid(order: Order): boolean {
  return order.paymentStatus !== 'pending';
}

export interface SalesSummary {
  /** Every order placed in the range, paid or not. */
  orderCount: number;
  paidOrderCount: number;
  /** Merchandise subtotals of paid orders, before discounts. */
  grossSalesCents: number;
  discountsCents: number;
  refundsCents: number;
  /** What paid orders brought in after discounts and refunds, including tax and shipping. */
  netSalesCents: number;
  /** Average paid order total before refunds, or null with no paid orders. */
  averageOrderValueCents: number | null;
  /** Units on paid orders, leaving out orders that were refunded in full. */
  unitsSold: number;
}

export function getSalesSummary(orders: Order[], discounts: Discount[], range: DateRange): SalesSummary {
  const inRange = filterOrdersInRange(orders, range);
  const summary: SalesSummary = {
    orderCount: inRange.length,
    paidOrderCount: 0,
    grossSalesCents: 0,
    discountsCents: 0,
    refundsCents: 0,
    netSalesCents: 0,
    averageOrderValueCents: null,
    unitsSold: 0,
  };
  let paidTotalCents = 0;

  for (const order of inRange.filter(isPaid)) {
    const totals = calculateOrderTotals(order, findDiscount(order.discountCode, discounts));
    summary.paidOrderCount += 1;
    summary.grossSalesCents += totals.subtotalCents;
    summary.discountsCents += totals.discountCents;
    summary.refundsCents += order.refundedCents;
    summary.netSalesCents += totals.totalCents - order.refundedCents;
    paidTotalCents += totals.totalCents;
    if (order.paymentStatus !== 'refunded') {
      summary.unitsSold += totals.itemCount;
    }
  }

  if (summary.paidOrderCount > 0) {
    summary.averageOrderValueCents = Math.round(paidTotalCents / summary.paidOrderCount);
  }
  return summary;
}

export interface TopProduct {
  productId: string;
  title: string;
  unitsSold: number;
  revenueCents: number;
}

/**
 * Best selling products by revenue (quantity × price, before discounts) on
 * paid orders that were not refunded in full. Ties go to more units sold.
 */
export function getTopProducts(orders: Order[], range: DateRange, limit = 5): TopProduct[] {
  const byProduct = new Map<string, TopProduct>();

  for (const order of filterOrdersInRange(orders, range)) {
    if (!isPaid(order) || order.paymentStatus === 'refunded') {
      continue;
    }
    for (const item of order.lineItems) {
      const entry = byProduct.get(item.productId) ?? {
        productId: item.productId,
        title: item.title,
        unitsSold: 0,
        revenueCents: 0,
      };
      entry.unitsSold += item.quantity;
      entry.revenueCents += item.quantity * item.unitPriceCents;
      byProduct.set(item.productId, entry);
    }
  }

  return [...byProduct.values()]
    .sort((a, b) => b.revenueCents - a.revenueCents || b.unitsSold - a.unitsSold || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export interface DailySales {
  date: string;
  orderCount: number;
  netSalesCents: number;
}

/** Net sales and order count for every day in the range, including days with no orders. */
export function getDailySales(orders: Order[], discounts: Discount[], range: DateRange): DailySales[] {
  const days: DailySales[] = [];
  for (let day = range.start; day <= range.end; day = addDays(day, 1)) {
    const summary = getSalesSummary(orders, discounts, { start: day, end: day });
    days.push({ date: day, orderCount: summary.orderCount, netSalesCents: summary.netSalesCents });
  }
  return days;
}

/** Percentage change from the previous value, to one decimal place, or null when there is nothing to compare. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
