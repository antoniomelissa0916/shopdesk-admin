import { ariaSortFor, type SortState } from '../lib/sorting';

interface SortableHeaderProps<K extends string> {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
  numeric?: boolean;
}

export default function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  numeric = false,
}: SortableHeaderProps<K>) {
  const ariaSort = ariaSortFor(sort, sortKey);
  const indicator = ariaSort === 'ascending' ? '↑' : ariaSort === 'descending' ? '↓' : '';

  return (
    <th scope="col" aria-sort={ariaSort} className={numeric ? 'numeric' : undefined}>
      <button type="button" className="sort-button" onClick={() => onSort(sortKey)}>
        {label}
        <span className="sort-indicator" aria-hidden="true">
          {indicator}
        </span>
      </button>
    </th>
  );
}
