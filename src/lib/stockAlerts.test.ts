import { describe, expect, it } from 'vitest';
import { products } from '../data/products';
import type { Product } from '../types';
import { getStockAlerts, getSuggestedReorder } from './stockAlerts';

function makeProduct(overrides: Partial<Product>): Product {
  return { ...products[0], ...overrides };
}

describe('getSuggestedReorder', () => {
  it('orders enough to reach twice the threshold', () => {
    expect(getSuggestedReorder({ inventory: 0, lowStockThreshold: 5 })).toBe(10);
    expect(getSuggestedReorder({ inventory: 12, lowStockThreshold: 15 })).toBe(18);
  });

  it('suggests nothing when stock is already at the target', () => {
    expect(getSuggestedReorder({ inventory: 30, lowStockThreshold: 15 })).toBe(0);
    expect(getSuggestedReorder({ inventory: 5, lowStockThreshold: 0 })).toBe(0);
  });

  it('treats negative stock as zero', () => {
    expect(getSuggestedReorder({ inventory: -3, lowStockThreshold: 5 })).toBe(10);
  });
});

describe('getStockAlerts', () => {
  it('lists active products that are out of stock or running low', () => {
    const alerts = getStockAlerts(products);
    expect(alerts.map((alert) => [alert.product.title, alert.status, alert.suggestedReorder])).toEqual([
      ['Ceramic Pour-Over Set', 'out_of_stock', 10],
      ['Linen Throw Pillow', 'low_stock', 12],
      ['Everyday Hoodie', 'low_stock', 18],
    ]);
  });

  it('ignores draft and archived products', () => {
    // The archived Leather Card Wallet has 3 left against a threshold of 5.
    const titles = getStockAlerts(products).map((alert) => alert.product.title);
    expect(titles).not.toContain('Leather Card Wallet');

    const draft = makeProduct({ id: 'd', status: 'draft', inventory: 0 });
    expect(getStockAlerts([draft])).toEqual([]);
  });

  it('includes products exactly at their threshold', () => {
    const atThreshold = makeProduct({ id: 'a', inventory: 5, lowStockThreshold: 5 });
    expect(getStockAlerts([atThreshold])).toHaveLength(1);
  });

  it('puts out of stock first, then the lowest stock, then by title', () => {
    const list = [
      makeProduct({ id: '1', title: 'Beta', inventory: 4, lowStockThreshold: 10 }),
      makeProduct({ id: '2', title: 'Alpha', inventory: 4, lowStockThreshold: 10 }),
      makeProduct({ id: '3', title: 'Gamma', inventory: 0, lowStockThreshold: 10 }),
      makeProduct({ id: '4', title: 'Delta', inventory: 2, lowStockThreshold: 10 }),
    ];
    expect(getStockAlerts(list).map((alert) => alert.product.title)).toEqual(['Gamma', 'Delta', 'Alpha', 'Beta']);
  });

  it('returns nothing when everything is well stocked', () => {
    expect(getStockAlerts([makeProduct({ inventory: 100, lowStockThreshold: 10 })])).toEqual([]);
  });
});
