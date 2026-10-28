import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney, formatPercent, pluralize } from './format';

describe('formatMoney', () => {
  it('formats cents as dollars', () => {
    expect(formatMoney(2400)).toBe('$24.00');
    expect(formatMoney(199)).toBe('$1.99');
  });

  it('formats zero and negative amounts', () => {
    expect(formatMoney(0)).toBe('$0.00');
    expect(formatMoney(-550)).toBe('-$5.50');
  });

  it('adds thousands separators', () => {
    expect(formatMoney(1234567)).toBe('$12,345.67');
  });

  it('supports other currencies', () => {
    expect(formatMoney(1000, 'CAD')).toBe('CA$10.00');
  });
});

describe('formatDate', () => {
  it('formats ISO timestamps in UTC', () => {
    expect(formatDate('2026-08-01T10:12:00Z')).toBe('Aug 1, 2026');
  });

  it('does not shift dates near midnight', () => {
    expect(formatDate('2026-08-01T23:59:00Z')).toBe('Aug 1, 2026');
  });

  it('returns a dash for invalid input', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });
});

describe('formatPercent', () => {
  it('formats rates as percentages without trailing zeros', () => {
    expect(formatPercent(0.13)).toBe('13%');
    expect(formatPercent(0.1025)).toBe('10.25%');
    expect(formatPercent(0.08875)).toBe('8.875%');
    expect(formatPercent(0)).toBe('0%');
  });

  it('hides floating point noise', () => {
    expect(formatPercent(0.0863)).toBe('8.63%');
    expect(formatPercent(0.07)).toBe('7%');
  });
});

describe('pluralize', () => {
  it('uses the singular form for one', () => {
    expect(pluralize(1, 'order')).toBe('1 order');
  });

  it('uses the plural form otherwise', () => {
    expect(pluralize(0, 'order')).toBe('0 orders');
    expect(pluralize(3, 'order')).toBe('3 orders');
  });

  it('accepts a custom plural', () => {
    expect(pluralize(2, 'category', 'categories')).toBe('2 categories');
  });
});
