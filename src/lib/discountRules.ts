import type { Discount, DiscountType, Order } from '../types';
import { formatDate, formatMoney } from './format';
import { calculateSubtotal, findDiscount } from './orderTotals';
import { parseMoneyToCents, parseWholeNumber } from './productForm';

export type DiscountStatus = 'active' | 'scheduled' | 'expired' | 'used_up';

export const DISCOUNT_STATUS_LABELS: Record<DiscountStatus, string> = {
  active: 'Active',
  scheduled: 'Scheduled',
  expired: 'Expired',
  used_up: 'Limit reached',
};

/** Where a code is in its life: not started, running, past its end date, or out of uses. */
export function getDiscountStatus(discount: Discount, now: Date): DiscountStatus {
  const time = now.getTime();
  if (time < Date.parse(discount.startsAt)) {
    return 'scheduled';
  }
  if (discount.endsAt !== null && time > Date.parse(discount.endsAt)) {
    return 'expired';
  }
  if (discount.usageLimit !== null && discount.timesUsed >= discount.usageLimit) {
    return 'used_up';
  }
  return 'active';
}

/** A short summary such as "10% off" or "$15.00 off orders of $75.00 or more". */
export function describeDiscount(discount: Pick<Discount, 'type' | 'value' | 'minimumSubtotalCents'>): string {
  const amount = discount.type === 'percentage' ? `${discount.value}% off` : `${formatMoney(discount.value)} off`;
  return discount.minimumSubtotalCents === null
    ? amount
    : `${amount} orders of ${formatMoney(discount.minimumSubtotalCents)} or more`;
}

/** "Sep 1, 2026 – Oct 31, 2026", or "From May 1, 2026" when there is no end date. */
export function formatActiveDates(discount: Pick<Discount, 'startsAt' | 'endsAt'>): string {
  return discount.endsAt === null
    ? `From ${formatDate(discount.startsAt)}`
    : `${formatDate(discount.startsAt)} – ${formatDate(discount.endsAt)}`;
}

/** "3 used", or "3 / 100 used" when there is a limit. */
export function formatUsage(discount: Pick<Discount, 'timesUsed' | 'usageLimit'>): string {
  return discount.usageLimit === null
    ? `${discount.timesUsed} used`
    : `${discount.timesUsed} / ${discount.usageLimit} used`;
}

export type DiscountCheck =
  | { ok: true; discount: Discount }
  | {
      ok: false;
      reason: 'not_found' | 'scheduled' | 'expired' | 'used_up' | 'minimum_not_met';
      message: string;
    };

/** Checks whether a code can be used on an order with the given merchandise subtotal. */
export function checkDiscountCode(
  code: string,
  discounts: Discount[],
  subtotalCents: number,
  now: Date,
): DiscountCheck {
  const discount = findDiscount(code, discounts);
  if (!discount) {
    return { ok: false, reason: 'not_found', message: `"${code.trim()}" isn't a valid discount code.` };
  }

  switch (getDiscountStatus(discount, now)) {
    case 'scheduled':
      return { ok: false, reason: 'scheduled', message: `This code can be used from ${formatDate(discount.startsAt)}.` };
    case 'expired':
      return { ok: false, reason: 'expired', message: `This code expired on ${formatDate(discount.endsAt!)}.` };
    case 'used_up':
      return { ok: false, reason: 'used_up', message: 'This code has reached its usage limit.' };
    case 'active':
      break;
  }

  if (discount.minimumSubtotalCents !== null && subtotalCents < discount.minimumSubtotalCents) {
    const shortBy = discount.minimumSubtotalCents - subtotalCents;
    return {
      ok: false,
      reason: 'minimum_not_met',
      message: `This code needs a subtotal of ${formatMoney(discount.minimumSubtotalCents)} or more. Add ${formatMoney(shortBy)} to use it.`,
    };
  }

  return { ok: true, discount };
}

/** Discounts can only be added to or removed from an order before it is paid. */
export function canChangeDiscount(order: Pick<Order, 'paymentStatus'>): boolean {
  return order.paymentStatus === 'pending';
}

export type ApplyDiscountResult = { ok: true; order: Order; discount: Discount } | { ok: false; message: string };

export function applyDiscountToOrder(order: Order, code: string, discounts: Discount[], now: Date): ApplyDiscountResult {
  if (!canChangeDiscount(order)) {
    return { ok: false, message: 'Discounts can only be changed before an order is paid.' };
  }
  if (order.discountCode) {
    return { ok: false, message: 'This order already has a discount. Remove it first.' };
  }
  if (!code.trim()) {
    return { ok: false, message: 'Enter a discount code.' };
  }
  const check = checkDiscountCode(code, discounts, calculateSubtotal(order.lineItems), now);
  if (!check.ok) {
    return { ok: false, message: check.message };
  }
  return { ok: true, order: { ...order, discountCode: check.discount.code }, discount: check.discount };
}

export function removeDiscountFromOrder(order: Order): Order {
  if (!canChangeDiscount(order) || !order.discountCode) {
    throw new Error(`Order #${order.number} has no discount that can be removed.`);
  }
  return { ...order, discountCode: null };
}

/** Form fields for creating a code. Dates are YYYY-MM-DD strings from date inputs. */
export interface DiscountFormValues {
  code: string;
  type: DiscountType;
  value: string;
  minimumSubtotal: string;
  startsOn: string;
  endsOn: string;
  usageLimit: string;
}

export type DiscountFormErrors = Partial<Record<keyof DiscountFormValues, string>>;

const CODE_PATTERN = /^[A-Z0-9_-]+$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  return DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function validateDiscountForm(values: DiscountFormValues, existing: Discount[]): DiscountFormErrors {
  const errors: DiscountFormErrors = {};

  const code = values.code.trim();
  if (!code) {
    errors.code = 'Code is required.';
  } else if (code.length < 3 || code.length > 20) {
    errors.code = 'Code must be between 3 and 20 characters.';
  } else if (!CODE_PATTERN.test(code)) {
    errors.code = 'Code can only contain letters, numbers, hyphens and underscores.';
  } else if (findDiscount(code, existing)) {
    errors.code = 'A discount with this code already exists.';
  }

  let valueCents: number | null = null;
  if (values.type === 'percentage') {
    const percent = parseWholeNumber(values.value);
    if (percent === null || percent < 1 || percent > 100) {
      errors.value = 'Enter a whole percentage from 1 to 100.';
    }
  } else {
    valueCents = parseMoneyToCents(values.value);
    if (valueCents === null || valueCents <= 0) {
      errors.value = 'Enter an amount greater than $0.00.';
    }
  }

  if (values.minimumSubtotal.trim()) {
    const minimum = parseMoneyToCents(values.minimumSubtotal);
    if (minimum === null || minimum <= 0) {
      errors.minimumSubtotal = 'Enter a minimum greater than $0.00, or leave it empty.';
    } else if (valueCents !== null && valueCents > minimum) {
      errors.value = "The amount off can't be more than the minimum spend.";
    }
  }

  if (!isValidDate(values.startsOn)) {
    errors.startsOn = 'Choose a start date.';
  }
  if (values.endsOn) {
    if (!isValidDate(values.endsOn)) {
      errors.endsOn = 'Choose a valid end date, or leave it empty.';
    } else if (isValidDate(values.startsOn) && values.endsOn < values.startsOn) {
      errors.endsOn = "The end date can't be before the start date.";
    }
  }

  if (values.usageLimit.trim()) {
    const limit = parseWholeNumber(values.usageLimit);
    if (limit === null || limit < 1) {
      errors.usageLimit = 'Enter a whole number of 1 or more, or leave it empty.';
    }
  }

  return errors;
}

/** Builds a discount from valid form values. The code runs from the start of its first day to the end of its last. */
export function fromDiscountForm(values: DiscountFormValues): Discount {
  const minimum = values.minimumSubtotal.trim() ? parseMoneyToCents(values.minimumSubtotal) : null;
  const limit = values.usageLimit.trim() ? parseWholeNumber(values.usageLimit) : null;
  return {
    code: values.code.trim().toUpperCase(),
    type: values.type,
    value: values.type === 'percentage' ? (parseWholeNumber(values.value) ?? 0) : (parseMoneyToCents(values.value) ?? 0),
    minimumSubtotalCents: minimum,
    startsAt: `${values.startsOn}T00:00:00Z`,
    endsAt: values.endsOn ? `${values.endsOn}T23:59:59Z` : null,
    usageLimit: limit,
    timesUsed: 0,
  };
}
