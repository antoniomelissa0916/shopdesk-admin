import { describe, expect, it } from 'vitest';
import { products } from '../data/products';
import type { Product } from '../types';
import { nextProductId, productsReducer } from './productsReducer';

const shirt = products[0];

describe('productsReducer', () => {
  it('adds a product to the end of the list', () => {
    const added: Product = { ...shirt, id: 'prod_099', sku: 'NEW-001' };
    const next = productsReducer(products, { type: 'added', product: added });

    expect(next).toHaveLength(products.length + 1);
    expect(next[next.length - 1]).toBe(added);
  });

  it('refuses to add a product with an existing id', () => {
    expect(() => productsReducer(products, { type: 'added', product: shirt })).toThrow(/already exists/);
  });

  it('replaces an updated product in place', () => {
    const renamed = { ...shirt, title: 'Renamed Shirt' };
    const next = productsReducer(products, { type: 'updated', product: renamed });

    expect(next).toHaveLength(products.length);
    expect(next[0]).toEqual(renamed);
    expect(next.slice(1)).toEqual(products.slice(1));
  });

  it('ignores updates for unknown products', () => {
    const unknown = { ...shirt, id: 'prod_missing' };
    expect(productsReducer(products, { type: 'updated', product: unknown })).toBe(products);
  });

  it('does not mutate the previous state', () => {
    const before = [...products];
    productsReducer(products, { type: 'updated', product: { ...shirt, title: 'Changed' } });
    productsReducer(products, { type: 'added', product: { ...shirt, id: 'prod_100' } });
    expect(products).toEqual(before);
  });
});

describe('nextProductId', () => {
  it('returns the id after the highest existing one', () => {
    expect(nextProductId(products)).toBe('prod_011');
  });

  it('uses the highest id even when the list is out of order', () => {
    const list = [{ ...shirt, id: 'prod_007' }, { ...shirt, id: 'prod_002' }];
    expect(nextProductId(list)).toBe('prod_008');
  });

  it('starts at prod_001 for an empty list', () => {
    expect(nextProductId([])).toBe('prod_001');
  });

  it('ignores ids that do not follow the pattern', () => {
    const list = [{ ...shirt, id: 'imported-42' }, { ...shirt, id: 'prod_003' }];
    expect(nextProductId(list)).toBe('prod_004');
  });

  it('grows past three digits', () => {
    expect(nextProductId([{ ...shirt, id: 'prod_999' }])).toBe('prod_1000');
  });
});
