export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
  /** 1-based index of the first item on the page, or 0 when there are no items. */
  start: number;
  /** 1-based index of the last item on the page, or 0 when there are no items. */
  end: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export function getPageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) {
    throw new RangeError('pageSize must be greater than 0');
  }
  return Math.max(1, Math.ceil(total / pageSize));
}

export function clampPage(page: number, pageCount: number): number {
  if (!Number.isFinite(page)) {
    return 1;
  }
  return Math.min(Math.max(1, Math.floor(page)), pageCount);
}

/**
 * Returns one page of items. Pages are 1-based, and out-of-range page
 * numbers are clamped to the first or last page.
 */
export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const total = items.length;
  const pageCount = getPageCount(total, pageSize);
  const current = clampPage(page, pageCount);
  const offset = (current - 1) * pageSize;
  const pageItems = items.slice(offset, offset + pageSize);

  return {
    items: pageItems,
    page: current,
    pageSize,
    pageCount,
    total,
    start: pageItems.length > 0 ? offset + 1 : 0,
    end: offset + pageItems.length,
    hasPrevious: current > 1,
    hasNext: current < pageCount,
  };
}
