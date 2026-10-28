import { describe, expect, it } from 'vitest';
import { discounts } from '../data/discounts';
import { orders } from '../data/orders';
import type { Discount } from '../types';
import {
  applyDiscountToOrder,
  canChangeDiscount,
  checkDiscountCode,
  describeDiscount,
  formatActiveDates,
  formatUsage,
  fromDiscountForm,
  getDiscountStatus,
  removeDiscountFromOrder,
  validateDiscountForm,
  type DiscountFormValues,
} from './discountRules';
import { calculateSubtotal } from './orderTotals';

const NOW = new Date('2026-09-30T12:00:00Z');
const byCode = (code: string) => discounts.find((discount) => discount.code === code)!;

function validForm(overrides: Partial<DiscountFormValues> = {}): DiscountFormValues {
  return {
    code: 'SPRING12',
    type: 'percentage',
    value: '12',
    minimumSubtotal: '',
    startsOn: '2027-03-01',
    endsOn: '2027-05-31',
    usageLimit: '',
    ...overrides,
  };
}

describe('getDiscountStatus', () => {
  it('describes each seed code', () => {
    const statuses = Object.fromEntries(discounts.map((d) => [d.code, getDiscountStatus(d, NOW)]));
    expect(statuses).toEqual({
      WELCOME10: 'active',
      WHOLESALE20: 'active',
      FALL15: 'active',
      SUMMER25: 'expired',
      LAUNCH5: 'used_up',
      HOLIDAY30: 'scheduled',
    });
  });

  it('is active from the first moment to the last moment', () => {
    const fall = byCode('FALL15');
    expect(getDiscountStatus(fall, new Date('2026-09-01T00:00:00Z'))).toBe('active');
    expect(getDiscountStatus(fall, new Date('2026-08-31T23:59:59Z'))).toBe('scheduled');
    expect(getDiscountStatus(fall, new Date('2026-10-31T23:59:59Z'))).toBe('active');
    expect(getDiscountStatus(fall, new Date('2026-11-01T00:00:00Z'))).toBe('expired');
  });

  it('reports expired before used up', () => {
    const both: Discount = { ...byCode('SUMMER25'), usageLimit: 1, timesUsed: 1 };
    expect(getDiscountStatus(both, NOW)).toBe('expired');
  });

  it('is active while uses remain', () => {
    expect(getDiscountStatus({ ...byCode('LAUNCH5'), timesUsed: 49 }, NOW)).toBe('active');
  });
});

describe('describeDiscount', () => {
  it('summarises the amount and minimum', () => {
    expect(describeDiscount(byCode('WELCOME10'))).toBe('10% off');
    expect(describeDiscount(byCode('FALL15'))).toBe('$15.00 off orders of $75.00 or more');
  });
});

describe('formatActiveDates and formatUsage', () => {
  it('shows a date range or an open start date', () => {
    expect(formatActiveDates(byCode('FALL15'))).toBe('Sep 1, 2026 – Oct 31, 2026');
    expect(formatActiveDates(byCode('WELCOME10'))).toBe('From May 1, 2026');
  });

  it('shows uses with the limit when there is one', () => {
    expect(formatUsage(byCode('FALL15'))).toBe('1 / 100 used');
    expect(formatUsage(byCode('WELCOME10'))).toBe('1 used');
  });
});

describe('applying discounts to orders', () => {
  const pending = orders.find((order) => order.id === 'ord_004')!; // 3 candles, $84.00, unpaid
  const paid = orders.find((order) => order.id === 'ord_001')!;

  it('only allows changes before payment', () => {
    expect(canChangeDiscount(pending)).toBe(true);
    expect(canChangeDiscount(paid)).toBe(false);
  });

  it('applies a valid code using its stored spelling', () => {
    const result = applyDiscountToOrder(pending, 'fall15', discounts, NOW);
    expect(result.ok && result.order.discountCode).toBe('FALL15');
    expect(pending.discountCode).toBeNull();
  });

  it('explains why a code cannot be applied', () => {
    expect(applyDiscountToOrder(paid, 'FALL15', discounts, NOW)).toEqual({
      ok: false,
      message: 'Discounts can only be changed before an order is paid.',
    });
    expect(applyDiscountToOrder(pending, '  ', discounts, NOW)).toEqual({ ok: false, message: 'Enter a discount code.' });
    expect(applyDiscountToOrder(pending, 'WHOLESALE20', discounts, NOW)).toMatchObject({
      ok: false,
      message: 'This code needs a subtotal of $150.00 or more. Add $66.00 to use it.',
    });
  });

  it('allows only one discount per order', () => {
    const discounted = { ...pending, discountCode: 'WELCOME10' };
    expect(applyDiscountToOrder(discounted, 'FALL15', discounts, NOW)).toMatchObject({
      ok: false,
      message: 'This order already has a discount. Remove it first.',
    });
  });

  it('removes a discount from an unpaid order', () => {
    expect(removeDiscountFromOrder({ ...pending, discountCode: 'FALL15' }).discountCode).toBeNull();
    expect(() => removeDiscountFromOrder(pending)).toThrow(/no discount/);
    expect(() => removeDiscountFromOrder(orders.find((order) => order.id === 'ord_002')!)).toThrow(/no discount/);
  });
});

describe('checkDiscountCode', () => {
  it('accepts an active code, ignoring case and spaces', () => {
    const result = checkDiscountCode(' fall15 ', discounts, 8000, NOW);
    expect(result.ok && result.discount.code).toBe('FALL15');
  });

  it('rejects unknown codes', () => {
    expect(checkDiscountCode('FREESTUFF', discounts, 8000, NOW)).toEqual({
      ok: false,
      reason: 'not_found',
      message: '"FREESTUFF" isn\'t a valid discount code.',
    });
  });

  it('rejects scheduled, expired and used up codes with a reason', () => {
    expect(checkDiscountCode('HOLIDAY30', discounts, 20000, NOW)).toMatchObject({
      reason: 'scheduled',
      message: 'This code can be used from Nov 20, 2026.',
    });
    expect(checkDiscountCode('SUMMER25', discounts, 20000, NOW)).toMatchObject({
      reason: 'expired',
      message: 'This code expired on Aug 31, 2026.',
    });
    expect(checkDiscountCode('LAUNCH5', discounts, 20000, NOW)).toMatchObject({
      reason: 'used_up',
      message: 'This code has reached its usage limit.',
    });
  });

  it('says how much more is needed to reach the minimum', () => {
    expect(checkDiscountCode('FALL15', discounts, 7499, NOW)).toMatchObject({
      reason: 'minimum_not_met',
      message: 'This code needs a subtotal of $75.00 or more. Add $0.01 to use it.',
    });
    expect(checkDiscountCode('FALL15', discounts, 7500, NOW).ok).toBe(true);
  });

  it('accepts every code that was used on a seed order at the time it was placed', () => {
    for (const order of orders.filter((candidate) => candidate.discountCode)) {
      const result = checkDiscountCode(
        order.discountCode!,
        discounts,
        calculateSubtotal(order.lineItems),
        new Date(order.createdAt),
      );
      expect(result.ok).toBe(true);
    }
  });
});

describe('validateDiscountForm', () => {
  it('accepts a valid percentage code', () => {
    expect(validateDiscountForm(validForm(), discounts)).toEqual({});
  });

  it('accepts a valid fixed amount code with a minimum and limit', () => {
    const form = validForm({ type: 'fixed_amount', value: '10', minimumSubtotal: '50', usageLimit: '200' });
    expect(validateDiscountForm(form, discounts)).toEqual({});
  });

  it('checks the code format and length', () => {
    expect(validateDiscountForm(validForm({ code: '' }), discounts).code).toBe('Code is required.');
    expect(validateDiscountForm(validForm({ code: 'AB' }), discounts).code).toMatch(/between 3 and 20/);
    expect(validateDiscountForm(validForm({ code: 'A'.repeat(21) }), discounts).code).toMatch(/between 3 and 20/);
    expect(validateDiscountForm(validForm({ code: 'TEN OFF' }), discounts).code).toMatch(/letters, numbers/);
  });

  it('rejects a code that already exists, ignoring case', () => {
    expect(validateDiscountForm(validForm({ code: 'welcome10' }), discounts).code).toMatch(/already exists/);
  });

  it('keeps percentages between 1 and 100', () => {
    for (const value of ['0', '101', '12.5', 'ten', '']) {
      expect(validateDiscountForm(validForm({ value }), discounts).value).toMatch(/1 to 100/);
    }
    expect(validateDiscountForm(validForm({ value: '100' }), discounts).value).toBeUndefined();
  });

  it('requires fixed amounts above zero and no larger than the minimum spend', () => {
    expect(validateDiscountForm(validForm({ type: 'fixed_amount', value: '0' }), discounts).value).toMatch(
      /greater than/,
    );
    const tooBig = validForm({ type: 'fixed_amount', value: '60', minimumSubtotal: '50' });
    expect(validateDiscountForm(tooBig, discounts).value).toMatch(/more than the minimum spend/);
  });

  it('validates the optional minimum and usage limit', () => {
    expect(validateDiscountForm(validForm({ minimumSubtotal: 'abc' }), discounts).minimumSubtotal).toBeDefined();
    expect(validateDiscountForm(validForm({ usageLimit: '0' }), discounts).usageLimit).toBeDefined();
    expect(validateDiscountForm(validForm({ usageLimit: '2.5' }), discounts).usageLimit).toBeDefined();
  });

  it('requires a start date and an end date that is not before it', () => {
    expect(validateDiscountForm(validForm({ startsOn: '' }), discounts).startsOn).toBe('Choose a start date.');
    expect(validateDiscountForm(validForm({ endsOn: '2027-02-28' }), discounts).endsOn).toMatch(/before the start/);
    expect(validateDiscountForm(validForm({ endsOn: '2027-03-01' }), discounts).endsOn).toBeUndefined();
    expect(validateDiscountForm(validForm({ endsOn: '' }), discounts).endsOn).toBeUndefined();
  });
});

describe('fromDiscountForm', () => {
  it('builds a percentage discount covering whole days', () => {
    expect(fromDiscountForm(validForm({ code: ' spring12 ' }))).toEqual({
      code: 'SPRING12',
      type: 'percentage',
      value: 12,
      minimumSubtotalCents: null,
      startsAt: '2027-03-01T00:00:00Z',
      endsAt: '2027-05-31T23:59:59Z',
      usageLimit: null,
      timesUsed: 0,
    });
  });

  it('stores fixed amounts and minimums in cents, with no end date when left empty', () => {
    const discount = fromDiscountForm(
      validForm({ type: 'fixed_amount', value: '7.50', minimumSubtotal: '40', endsOn: '', usageLimit: '25' }),
    );
    expect(discount).toMatchObject({ value: 750, minimumSubtotalCents: 4000, endsAt: null, usageLimit: 25 });
  });
});
