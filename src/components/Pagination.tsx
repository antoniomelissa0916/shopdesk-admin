import type { Page } from '../lib/pagination';

interface PaginationProps<T> {
  page: Page<T>;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  itemLabel?: string;
}

export default function Pagination<T>({
  page,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
  itemLabel = 'items',
}: PaginationProps<T>) {
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="pagination-summary">
        {page.total === 0 ? `No ${itemLabel}` : `Showing ${page.start}–${page.end} of ${page.total} ${itemLabel}`}
      </span>
      {pageSizeOptions && onPageSizeChange && (
        <label className="pagination-size">
          Per page
          <select
            className="select"
            value={page.pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="pagination-buttons">
        <button
          type="button"
          className="button"
          disabled={!page.hasPrevious}
          onClick={() => onPageChange(page.page - 1)}
        >
          Previous
        </button>
        <span className="pagination-page">
          Page {page.page} of {page.pageCount}
        </span>
        <button type="button" className="button" disabled={!page.hasNext} onClick={() => onPageChange(page.page + 1)}>
          Next
        </button>
      </div>
    </nav>
  );
}
