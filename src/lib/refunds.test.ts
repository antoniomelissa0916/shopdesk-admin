import { describe, expect, it } from 'vitest';
import { discounts } from '../data/discounts';
import { orders } from '../data/orders';
import type { Order } from '../types';
import { calculateOrderTotals, findDiscount } from './orderTotals';
import {
  applyRefund,
  calculateRefund,
  canRefund,
  derivePaymentStatus,
  getRefundableCents,
  validateRefund,
  type RefundRequest,
} from './refunds';

function orderById(id: string): Order {
  const order = orders.find((candidate) => candidate.id === id);
  if (!order) {
    throw new Error(`Missing order ${id}`);
  }
  return order;
}

function totalsFor(order: Order) {
  return calculateOrderTotals(order, findDiscount(order.discountCode, discounts));
}

const noShipping = (lines: RefundRequest['lines']): RefundRequest => ({ lines, refundShipping: false });

describe('getRefundableCents', () => {
  it('returns what is left after earlier refunds', () => {
    expect(getRefundableCents(10000, 0)).toBe(10000);
    expect(getRefundableCents(10000, 2500)).toBe(7500);
  });

  it('never goes below zero', () => {
    expect(getRefundableCents(10000, 12000)).toBe(0);
  });
});

describe('canRefund', () => {
  it('allows paid and partially refunded orders with a balance left', () => {
    expect(canRefund({ paymentStatus: 'paid', refundedCents: 0 }, { totalCents: 1000 })).toBe(true);
    expect(canRefund({ paymentStatus: 'partially_refunded', refundedCents: 400 }, { totalCents: 1000 })).toBe(true);
  });

  it('blocks unpaid orders and orders with nothing left to refund', () => {
    expect(canRefund({ paymentStatus: 'pending', refundedCents: 0 }, { totalCents: 1000 })).toBe(false);
    expect(canRefund({ paymentStatus: 'refunded', refundedCents: 1000 }, { totalCents: 1000 })).toBe(false);
  });
});

describe('derivePaymentStatus', () => {
  it('is paid with no refunds', () => {
    expect(derivePaymentStatus(10000, 0, 'paid')).toBe('paid');
  });

  it('is partially refunded for part of the total', () => {
    expect(derivePaymentStatus(10000, 1, 'paid')).toBe('partially_refunded');
    expect(derivePaymentStatus(10000, 9999, 'paid')).toBe('partially_refunded');
  });

  it('is refunded once the full total is returned', () => {
    expect(derivePaymentStatus(10000, 10000, 'partially_refunded')).toBe('refunded');
  });

  it('keeps pending orders pending', () => {
    expect(derivePaymentStatus(10000, 0, 'pending')).toBe('pending');
  });

  it('matches the stored status of every seed order', () => {
    for (const order of orders) {
      const { totalCents } = totalsFor(order);
      expect(derivePaymentStatus(totalCents, order.refundedCents, order.paymentStatus)).toBe(order.paymentStatus);
    }
  });
});

describe('calculateRefund', () => {
  it('refunds an item with its tax when there is no discount', () => {
    const order = orderById('ord_005');
    // One of the two pillows: $34.00 + 10.25% tax.
    expect(calculateRefund(order, totalsFor(order), noShipping([{ lineIndex: 0, quantity: 1 }]))).toEqual({
      itemsCents: 3400,
      discountCents: 0,
      taxCents: 349,
      shippingCents: 0,
      totalCents: 3749,
    });
    expect(order.refundedCents).toBe(3749);
  });

  it("takes off the item's share of a percentage discount", () => {
    const order = orderById('ord_003');
    // Two of twelve mugs: $32.00, less 20% = $25.60, plus 8.875% tax.
    const refund = calculateRefund(order, totalsFor(order), noShipping([{ lineIndex: 0, quantity: 2 }]));
    expect(refund).toMatchObject({ itemsCents: 3200, discountCents: 640, taxCents: 227, totalCents: 2787 });
  });

  it('spreads a fixed discount across items by value', () => {
    const order = orderById('ord_007');
    // The hoodie is $58.00 of a $112.00 subtotal, so it carries $7.77 of the $15.00 discount.
    const refund = calculateRefund(order, totalsFor(order), noShipping([{ lineIndex: 1, quantity: 1 }]));
    expect(refund).toMatchObject({ itemsCents: 5800, discountCents: 777, taxCents: 414, totalCents: 5437 });
  });

  it('adds shipping when requested', () => {
    const order = orderById('ord_001');
    const refund = calculateRefund(order, totalsFor(order), { lines: [], refundShipping: true });
    expect(refund).toEqual({ itemsCents: 0, discountCents: 0, taxCents: 0, shippingCents: 500, totalCents: 500 });
  });

  it('refunds exactly what is left when everything is returned', () => {
    for (const order of orders) {
      const totals = totalsFor(order);
      const everything: RefundRequest = {
        lines: order.lineItems.map((item, lineIndex) => ({ lineIndex, quantity: item.quantity })),
        refundShipping: true,
      };
      expect(calculateRefund(order, totals, everything).totalCents).toBe(totals.totalCents - order.refundedCents);
    }
  });

  it('only counts units that have not been refunded yet', () => {
    const order = orderById('ord_005'); // One of the two pillows was already refunded.
    const refund = calculateRefund(order, totalsFor(order), noShipping([{ lineIndex: 0, quantity: 2 }]));
    expect(refund.itemsCents).toBe(3400);
  });

  it('does not refund shipping twice', () => {
    const order = { ...orderById('ord_001'), shippingRefunded: true };
    expect(calculateRefund(order, totalsFor(order), { lines: [], refundShipping: true }).shippingCents).toBe(0);
  });

  it('takes a rounding cent off the tax so the last refund matches the balance', () => {
    // Tax on the rest of order 1005 rounds to $6.36, but only $6.35 of tax is left to give back.
    const order = orderById('ord_005');
    const refund = calculateRefund(order, totalsFor(order), {
      lines: [
        { lineIndex: 0, quantity: 1 },
        { lineIndex: 1, quantity: 1 },
      ],
      refundShipping: true,
    });
    expect(refund).toEqual({ itemsCents: 6200, discountCents: 0, taxCents: 635, shippingCents: 800, totalCents: 7635 });
  });

  it('ignores unknown lines, zero quantities and caps quantities at what was ordered', () => {
    const order = orderById('ord_001');
    const refund = calculateRefund(
      order,
      totalsFor(order),
      noShipping([
        { lineIndex: 9, quantity: 1 },
        { lineIndex: 1, quantity: 0 },
        { lineIndex: 0, quantity: 5 },
      ]),
    );
    expect(refund.itemsCents).toBe(4800);
  });
});

describe('validateRefund', () => {
  const paid = orderById('ord_001');
  const paidTotals = totalsFor(paid);

  it('accepts a valid refund', () => {
    expect(validateRefund(paid, paidTotals, noShipping([{ lineIndex: 0, quantity: 1 }]), 2607)).toBeNull();
  });

  it('rejects refunds on unpaid orders', () => {
    const pending = orderById('ord_004');
    expect(validateRefund(pending, totalsFor(pending), noShipping([{ lineIndex: 0, quantity: 1 }]), 100)).toBe(
      'order_not_paid',
    );
  });

  it('requires something to be selected', () => {
    expect(validateRefund(paid, paidTotals, noShipping([{ lineIndex: 0, quantity: 0 }]), 0)).toBe(
      'nothing_selected',
    );
  });

  it('allows a shipping-only refund', () => {
    expect(validateRefund(paid, paidTotals, { lines: [], refundShipping: true }, 500)).toBeNull();
  });

  it('rejects unknown lines', () => {
    expect(validateRefund(paid, paidTotals, noShipping([{ lineIndex: 5, quantity: 1 }]), 100)).toBe('invalid_line');
  });

  it('rejects fractional, negative and non-numeric quantities with their own message', () => {
    for (const quantity of [0.5, -1, Number.NaN]) {
      expect(validateRefund(paid, paidTotals, noShipping([{ lineIndex: 0, quantity }]), 0)).toBe('invalid_quantity');
    }
  });

  it('rejects more items than were ordered', () => {
    expect(validateRefund(paid, paidTotals, noShipping([{ lineIndex: 0, quantity: 3 }]), 100)).toBe(
      'quantity_too_high',
    );
  });

  it('rejects an amount above what is left to refund', () => {
    const partly = orderById('ord_005');
    const totals = totalsFor(partly);
    const left = totals.totalCents - partly.refundedCents;
    const request = noShipping([{ lineIndex: 0, quantity: 1 }]);

    expect(validateRefund(partly, totals, request, left)).toBeNull();
    expect(validateRefund(partly, totals, request, left + 1)).toBe('amount_too_high');
  });
});

describe('refund tracking', () => {
  it('rejects more units than are left on a line', () => {
    const order = orderById('ord_005');
    expect(validateRefund(order, totalsFor(order), noShipping([{ lineIndex: 0, quantity: 2 }]), 100)).toBe(
      'quantity_too_high',
    );
    expect(validateRefund(order, totalsFor(order), noShipping([{ lineIndex: 0, quantity: 1 }]), 100)).toBeNull();
  });

  it('rejects refunding shipping a second time', () => {
    const order = { ...orderById('ord_001'), shippingRefunded: true };
    expect(validateRefund(order, totalsFor(order), { lines: [], refundShipping: true }, 0)).toBe(
      'shipping_already_refunded',
    );
  });

  it('records refunded units and shipping on the order', () => {
    const order = orderById('ord_001');
    // The tote ($18.00 + $1.55 tax) and $5.00 shipping.
    const request: RefundRequest = { lines: [{ lineIndex: 1, quantity: 1 }], refundShipping: true };
    const updated = applyRefund(order, totalsFor(order), 2455, request);

    expect(updated.lineItems[1].refundedQuantity).toBe(1);
    expect(updated.lineItems[0]).toBe(order.lineItems[0]);
    expect(updated.shippingRefunded).toBe(true);
    expect(order.lineItems[1].refundedQuantity).toBeUndefined();
  });

  it('adds to units refunded earlier', () => {
    const order = orderById('ord_005');
    const updated = applyRefund(order, totalsFor(order), 3749, noShipping([{ lineIndex: 0, quantity: 1 }]));
    expect(updated.lineItems[0].refundedQuantity).toBe(2);
    expect(updated.shippingRefunded).toBe(false);
  });
});

describe('applyRefund', () => {
  it('records a partial refund', () => {
    const order = orderById('ord_001');
    const updated = applyRefund(order, totalsFor(order), 2607);

    expect(updated.refundedCents).toBe(2607);
    expect(updated.paymentStatus).toBe('partially_refunded');
    expect(order.refundedCents).toBe(0);
  });

  it('marks the order refunded when the balance reaches zero', () => {
    const order = orderById('ord_005');
    const totals = totalsFor(order);
    const updated = applyRefund(order, totals, totals.totalCents - order.refundedCents);

    expect(updated.refundedCents).toBe(totals.totalCents);
    expect(updated.paymentStatus).toBe('refunded');
  });

  it('rejects zero, over-balance and unpaid refunds', () => {
    const order = orderById('ord_001');
    const totals = totalsFor(order);
    expect(() => applyRefund(order, totals, 0)).toThrow(RangeError);
    expect(() => applyRefund(order, totals, totals.totalCents + 1)).toThrow(RangeError);

    const pending = orderById('ord_004');
    expect(() => applyRefund(pending, totalsFor(pending), 100)).toThrow(/hasn't been paid/);
  });
});
