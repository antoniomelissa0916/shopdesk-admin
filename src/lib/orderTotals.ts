import type { Discount, Order, OrderLineItem } from '../types';

/** The parts of a discount that decide how much it takes off. */
export type DiscountAmount = Pick<Discount, 'type' | 'value'>;

export interface OrderTotals {
  itemCount: number;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

/**
 * Rounds to the nearest cent, with halves rounding up. The value is first
 * trimmed to six decimals so float noise such as 234.49999999999997 does
 * not round the wrong way.
 */
export function roundCents(value: number): number {
  return Math.round(Number(value.toFixed(6)));
}

export function countItems(lineItems: OrderLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + item.quantity, 0);
}

export function calculateSubtotal(lineItems: OrderLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
}

/**
 * Amount taken off the subtotal. Percentage discounts are rounded to the
 * nearest cent, and a discount never takes the subtotal below zero.
 */
export function calculateDiscount(subtotalCents: number, discount: DiscountAmount | null): number {
  if (!discount || subtotalCents <= 0) {
    return 0;
  }
  const amount =
    discount.type === 'percentage' ? roundCents((subtotalCents * discount.value) / 100) : discount.value;
  return Math.min(Math.max(amount, 0), subtotalCents);
}

export function calculateTax(taxableCents: number, taxRate: number): number {
  if (taxRate < 0) {
    throw new RangeError('taxRate cannot be negative');
  }
  return roundCents(taxableCents * taxRate);
}

export function findDiscount(code: string | null, discounts: Discount[]): Discount | null {
  if (!code) {
    return null;
  }
  const normalized = code.trim().toUpperCase();
  return discounts.find((discount) => discount.code.toUpperCase() === normalized) ?? null;
}

/**
 * Works out an order's totals. The discount applies to the merchandise
 * subtotal only, tax is charged on the discounted subtotal (not on
 * shipping), and shipping is added at the end.
 */
export function calculateOrderTotals(
  order: Pick<Order, 'lineItems' | 'shippingCents' | 'taxRate'>,
  discount: DiscountAmount | null,
): OrderTotals {
  const subtotalCents = calculateSubtotal(order.lineItems);
  const discountCents = calculateDiscount(subtotalCents, discount);
  const taxCents = calculateTax(subtotalCents - discountCents, order.taxRate);
  const shippingCents = Math.max(order.shippingCents, 0);

  return {
    itemCount: countItems(order.lineItems),
    subtotalCents,
    discountCents,
    shippingCents,
    taxCents,
    totalCents: subtotalCents - discountCents + shippingCents + taxCents,
  };
}
