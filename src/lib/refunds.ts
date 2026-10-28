import type { Order, OrderLineItem, PaymentStatus } from '../types';
import { calculateTax, roundCents, type OrderTotals } from './orderTotals';

export interface RefundLine {
  /** Index into the order's line items. */
  lineIndex: number;
  quantity: number;
}

export interface RefundRequest {
  lines: RefundLine[];
  refundShipping: boolean;
}

export interface RefundBreakdown {
  itemsCents: number;
  /** Share of the order discount that belonged to the refunded items. */
  discountCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
}

export function getRefundableCents(totalCents: number, refundedCents: number): number {
  return Math.max(totalCents - refundedCents, 0);
}

/** Units of a line that have not been refunded yet. */
export function getRemainingQuantity(item: Pick<OrderLineItem, 'quantity' | 'refundedQuantity'>): number {
  return Math.max(item.quantity - (item.refundedQuantity ?? 0), 0);
}

/** Paid orders can be refunded until nothing is left to give back. */
export function canRefund(
  order: Pick<Order, 'paymentStatus' | 'refundedCents'>,
  totals: Pick<OrderTotals, 'totalCents'>,
): boolean {
  return order.paymentStatus !== 'pending' && getRefundableCents(totals.totalCents, order.refundedCents) > 0;
}

/**
 * Payment status after refunds. Pending orders have not been charged, so
 * they stay pending whatever the refunded amount says.
 */
export function derivePaymentStatus(
  totalCents: number,
  refundedCents: number,
  currentStatus: PaymentStatus,
): PaymentStatus {
  if (currentStatus === 'pending') {
    return 'pending';
  }
  if (refundedCents <= 0) {
    return 'paid';
  }
  return refundedCents >= totalCents ? 'refunded' : 'partially_refunded';
}

/**
 * Works out how much to refund for returned items. Each item gives back
 * its price minus its share of the order discount, plus the tax charged on
 * that amount. Items already refunded can't be refunded again, and
 * shipping is added only when asked for and not refunded before.
 *
 * Tax is rounded separately for each refund, so the last refund on an
 * order can come out a cent above what is left. When that happens the
 * extra cent comes off the tax, so the refund never exceeds the balance.
 */
export function calculateRefund(
  order: Pick<Order, 'lineItems' | 'taxRate' | 'refundedCents' | 'shippingRefunded'>,
  totals: Pick<OrderTotals, 'subtotalCents' | 'discountCents' | 'shippingCents' | 'totalCents'>,
  request: RefundRequest,
): RefundBreakdown {
  let itemsCents = 0;
  for (const line of request.lines) {
    const item = order.lineItems[line.lineIndex];
    if (item && line.quantity > 0) {
      itemsCents += Math.min(line.quantity, getRemainingQuantity(item)) * item.unitPriceCents;
    }
  }

  const discountCents =
    totals.subtotalCents > 0 ? roundCents((itemsCents * totals.discountCents) / totals.subtotalCents) : 0;
  const shippingCents = request.refundShipping && !order.shippingRefunded ? totals.shippingCents : 0;
  const untaxedCents = itemsCents - discountCents + shippingCents;
  const refundable = getRefundableCents(totals.totalCents, order.refundedCents);
  const taxCents = Math.max(
    Math.min(calculateTax(itemsCents - discountCents, order.taxRate), refundable - untaxedCents),
    0,
  );

  return {
    itemsCents,
    discountCents,
    taxCents,
    shippingCents,
    totalCents: untaxedCents + taxCents,
  };
}

export type RefundError =
  | 'order_not_paid'
  | 'nothing_selected'
  | 'invalid_line'
  | 'invalid_quantity'
  | 'quantity_too_high'
  | 'shipping_already_refunded'
  | 'amount_too_high';

export function validateRefund(
  order: Pick<Order, 'lineItems' | 'paymentStatus' | 'refundedCents' | 'shippingRefunded'>,
  totals: Pick<OrderTotals, 'totalCents'>,
  request: RefundRequest,
  amountCents: number,
): RefundError | null {
  if (order.paymentStatus === 'pending') {
    return 'order_not_paid';
  }
  // Anything other than zero counts as an attempt, so negative or
  // fractional quantities are reported instead of silently ignored.
  const selected = request.lines.filter((line) => line.quantity !== 0);
  if (selected.length === 0 && !request.refundShipping) {
    return 'nothing_selected';
  }
  for (const line of selected) {
    const item = order.lineItems[line.lineIndex];
    if (!item) {
      return 'invalid_line';
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 0) {
      return 'invalid_quantity';
    }
    if (line.quantity > getRemainingQuantity(item)) {
      return 'quantity_too_high';
    }
  }
  if (request.refundShipping && order.shippingRefunded) {
    return 'shipping_already_refunded';
  }
  if (amountCents > getRefundableCents(totals.totalCents, order.refundedCents)) {
    return 'amount_too_high';
  }
  return null;
}

export const REFUND_ERROR_MESSAGES: Record<RefundError, string> = {
  order_not_paid: "This order hasn't been paid, so it can't be refunded.",
  nothing_selected: 'Select at least one item or the shipping to refund.',
  invalid_line: 'One of the selected items is not on this order.',
  invalid_quantity: 'Enter whole numbers of 0 or more for quantities.',
  quantity_too_high: "You can't refund more items than are left to refund.",
  shipping_already_refunded: 'Shipping has already been refunded on this order.',
  amount_too_high: 'The refund is more than the amount left to refund on this order.',
};

/**
 * Returns a copy of the order with the refund recorded: the amount, the
 * refunded units on each line, whether shipping was refunded, and the new
 * payment status.
 */
export function applyRefund(
  order: Order,
  totals: Pick<OrderTotals, 'totalCents'>,
  amountCents: number,
  request: RefundRequest = { lines: [], refundShipping: false },
): Order {
  if (amountCents <= 0) {
    throw new RangeError('Refund amount must be greater than 0');
  }
  if (order.paymentStatus === 'pending') {
    throw new Error("Can't refund an order that hasn't been paid");
  }
  if (amountCents > getRefundableCents(totals.totalCents, order.refundedCents)) {
    throw new RangeError('Refund amount is more than the refundable balance');
  }
  const refundedCents = order.refundedCents + amountCents;
  const lineItems = order.lineItems.map((item, index) => {
    const refunded = request.lines
      .filter((line) => line.lineIndex === index && line.quantity > 0)
      .reduce((sum, line) => sum + line.quantity, 0);
    if (refunded === 0) {
      return item;
    }
    return { ...item, refundedQuantity: Math.min((item.refundedQuantity ?? 0) + refunded, item.quantity) };
  });

  return {
    ...order,
    lineItems,
    refundedCents,
    shippingRefunded: order.shippingRefunded || request.refundShipping,
    paymentStatus: derivePaymentStatus(totals.totalCents, refundedCents, order.paymentStatus),
  };
}
