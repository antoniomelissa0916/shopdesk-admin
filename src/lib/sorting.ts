export type SortDirection = 'asc' | 'desc';

export interface SortState<K extends string> {
  key: K;
  direction: SortDirection;
}

/**
 * Returns the sort state after a column header is clicked. Clicking the
 * current column flips its direction; clicking a new column starts with
 * that column's default direction.
 */
export function nextSortState<K extends string>(
  current: SortState<K>,
  key: K,
  defaultDirection: SortDirection = 'asc',
): SortState<K> {
  if (current.key !== key) {
    return { key, direction: defaultDirection };
  }
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}

export function ariaSortFor<K extends string>(
  sort: SortState<K>,
  key: K,
): 'ascending' | 'descending' | 'none' {
  if (sort.key !== key) {
    return 'none';
  }
  return sort.direction === 'asc' ? 'ascending' : 'descending';
}
