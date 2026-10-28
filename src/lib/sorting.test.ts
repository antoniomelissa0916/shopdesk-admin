import { describe, expect, it } from 'vitest';
import { ariaSortFor, nextSortState, type SortState } from './sorting';

type Key = 'title' | 'price';

describe('nextSortState', () => {
  const byTitleAsc: SortState<Key> = { key: 'title', direction: 'asc' };

  it('flips the direction when the current column is clicked again', () => {
    const once = nextSortState(byTitleAsc, 'title');
    expect(once).toEqual({ key: 'title', direction: 'desc' });
    expect(nextSortState(once, 'title')).toEqual({ key: 'title', direction: 'asc' });
  });

  it('switches to a new column in ascending order by default', () => {
    const current: SortState<Key> = { key: 'title', direction: 'desc' };
    expect(nextSortState(current, 'price')).toEqual({ key: 'price', direction: 'asc' });
  });

  it('uses the given default direction for a new column', () => {
    expect(nextSortState(byTitleAsc, 'price', 'desc')).toEqual({ key: 'price', direction: 'desc' });
  });

  it('ignores the default direction when toggling the current column', () => {
    expect(nextSortState(byTitleAsc, 'title', 'desc')).toEqual({ key: 'title', direction: 'desc' });
  });

  it('does not mutate the current state', () => {
    const current: SortState<Key> = { key: 'title', direction: 'asc' };
    nextSortState(current, 'title');
    expect(current).toEqual({ key: 'title', direction: 'asc' });
  });
});

describe('ariaSortFor', () => {
  it('describes the sorted column', () => {
    expect(ariaSortFor<Key>({ key: 'price', direction: 'asc' }, 'price')).toBe('ascending');
    expect(ariaSortFor<Key>({ key: 'price', direction: 'desc' }, 'price')).toBe('descending');
  });

  it('returns none for other columns', () => {
    expect(ariaSortFor<Key>({ key: 'price', direction: 'asc' }, 'title')).toBe('none');
  });
});
