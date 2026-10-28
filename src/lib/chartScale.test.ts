import { describe, expect, it } from 'vitest';
import { formatAxisMoney, formatShortDay, getAxisTicks, niceStep, toPercent } from './chartScale';

describe('niceStep', () => {
  it('rounds up to 1, 2 or 5 times a power of ten', () => {
    expect(niceStep(0.7)).toBe(1);
    expect(niceStep(1.3)).toBe(2);
    expect(niceStep(2625)).toBe(5000);
    expect(niceStep(6000)).toBe(10000);
    expect(niceStep(20)).toBe(20);
  });

  it('falls back to 1 for zero or negative input', () => {
    expect(niceStep(0)).toBe(1);
    expect(niceStep(-5)).toBe(1);
  });
});

describe('getAxisTicks', () => {
  it('covers the maximum with clean steps', () => {
    // $105.00 of sales gives a $0–$150 axis in $50 steps.
    expect(getAxisTicks(10500)).toEqual([0, 5000, 10000, 15000]);
    expect(getAxisTicks(46966)).toEqual([0, 20000, 40000, 60000]);
  });

  it('ends exactly on the maximum when it is already clean', () => {
    expect(getAxisTicks(400)).toEqual([0, 100, 200, 300, 400]);
  });

  it('returns a single zero tick when there is nothing to show', () => {
    expect(getAxisTicks(0)).toEqual([0]);
  });
});

describe('formatAxisMoney', () => {
  it('drops the cents for whole dollars', () => {
    expect(formatAxisMoney(0)).toBe('$0');
    expect(formatAxisMoney(150000)).toBe('$1,500');
  });

  it('keeps the cents otherwise', () => {
    expect(formatAxisMoney(50)).toBe('$0.50');
  });
});

describe('formatShortDay', () => {
  it('shows the month and day', () => {
    expect(formatShortDay('2026-09-02')).toBe('Sep 2');
    expect(formatShortDay('2026-12-31')).toBe('Dec 31');
  });
});

describe('toPercent', () => {
  it('sizes a value against the maximum, clamped to 0–100', () => {
    expect(toPercent(25, 100)).toBe(25);
    expect(toPercent(150, 100)).toBe(100);
    expect(toPercent(-5, 100)).toBe(0);
    expect(toPercent(5, 0)).toBe(0);
  });
});
