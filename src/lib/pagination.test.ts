import { describe, expect, it } from 'vitest';
import { clampPage, getPageCount, paginate } from './pagination';

const numbers = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

describe('getPageCount', () => {
  it('rounds up partial pages', () => {
    expect(getPageCount(10, 5)).toBe(2);
    expect(getPageCount(11, 5)).toBe(3);
  });

  it('always returns at least one page', () => {
    expect(getPageCount(0, 5)).toBe(1);
  });

  it('rejects a page size of zero or less', () => {
    expect(() => getPageCount(10, 0)).toThrow(RangeError);
    expect(() => getPageCount(10, -5)).toThrow(RangeError);
  });
});

describe('clampPage', () => {
  it('keeps pages inside the valid range', () => {
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(-2, 3)).toBe(1);
    expect(clampPage(2, 3)).toBe(2);
    expect(clampPage(9, 3)).toBe(3);
  });

  it('rounds fractional pages down', () => {
    expect(clampPage(2.7, 3)).toBe(2);
  });

  it('falls back to the first page for non-numeric input', () => {
    expect(clampPage(Number.NaN, 3)).toBe(1);
    expect(clampPage(Number.POSITIVE_INFINITY, 3)).toBe(1);
  });
});

describe('paginate', () => {
  it('returns the first page', () => {
    const result = paginate(numbers(12), 1, 5);
    expect(result.items).toEqual([1, 2, 3, 4, 5]);
    expect(result).toMatchObject({ page: 1, pageCount: 3, total: 12, start: 1, end: 5 });
    expect(result.hasPrevious).toBe(false);
    expect(result.hasNext).toBe(true);
  });

  it('returns a middle page', () => {
    const result = paginate(numbers(12), 2, 5);
    expect(result.items).toEqual([6, 7, 8, 9, 10]);
    expect(result).toMatchObject({ start: 6, end: 10, hasPrevious: true, hasNext: true });
  });

  it('returns a partial last page', () => {
    const result = paginate(numbers(12), 3, 5);
    expect(result.items).toEqual([11, 12]);
    expect(result).toMatchObject({ start: 11, end: 12, hasPrevious: true, hasNext: false });
  });

  it('clamps a page past the end to the last page', () => {
    const result = paginate(numbers(12), 10, 5);
    expect(result.page).toBe(3);
    expect(result.items).toEqual([11, 12]);
  });

  it('handles an empty list', () => {
    const result = paginate([], 1, 5);
    expect(result).toMatchObject({ items: [], page: 1, pageCount: 1, total: 0, start: 0, end: 0 });
    expect(result.hasPrevious).toBe(false);
    expect(result.hasNext).toBe(false);
  });

  it('fits everything on one page when the page size is large enough', () => {
    const result = paginate(numbers(4), 1, 25);
    expect(result.items).toEqual([1, 2, 3, 4]);
    expect(result.pageCount).toBe(1);
    expect(result.hasNext).toBe(false);
  });
});
