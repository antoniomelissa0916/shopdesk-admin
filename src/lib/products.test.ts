import { describe, expect, it } from 'vitest';
import { orders } from '../data/orders';
import { products } from '../data/products';
import type { Order, Product } from '../types';
import {
  countByStatus,
  filterProducts,
  getCategories,
  getDiscountPercent,
  getProductSales,
  getStockStatus,
  getVendors,
  matchesQuery,
  sortProducts,
} from './products';

function makeProduct(overrides: Partial<Product>): Product {
  return {
    id: 'prod_test',
    title: 'Test Product',
    sku: 'TST-001',
    vendor: 'Test Vendor',
    category: 'Test',
    status: 'active',
    priceCents: 1000,
    compareAtPriceCents: null,
    costCents: 400,
    inventory: 10,
    lowStockThreshold: 5,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const ids = (list: Product[]) => list.map((product) => product.id);

describe('matchesQuery', () => {
  const tote = products.find((product) => product.id === 'prod_003')!;

  it('matches everything for an empty or blank query', () => {
    expect(matchesQuery(tote, '')).toBe(true);
    expect(matchesQuery(tote, '   ')).toBe(true);
  });

  it('matches title, SKU and vendor case-insensitively', () => {
    expect(matchesQuery(tote, 'TOTE')).toBe(true);
    expect(matchesQuery(tote, 'bg-tot')).toBe(true);
    expect(matchesQuery(tote, 'harbor')).toBe(true);
  });

  it('ignores surrounding whitespace', () => {
    expect(matchesQuery(tote, '  canvas ')).toBe(true);
  });

  it('does not match unrelated text', () => {
    expect(matchesQuery(tote, 'hoodie')).toBe(false);
  });
});

describe('filterProducts', () => {
  it('returns all products when no filters are set', () => {
    expect(filterProducts(products, {})).toHaveLength(products.length);
  });

  it('filters by status', () => {
    expect(ids(filterProducts(products, { status: 'draft' }))).toEqual(['prod_006']);
    expect(ids(filterProducts(products, { status: 'archived' }))).toEqual(['prod_009']);
  });

  it('filters by category and vendor', () => {
    expect(ids(filterProducts(products, { category: 'Kitchen' }))).toEqual(['prod_004', 'prod_005']);
    expect(ids(filterProducts(products, { vendor: 'Meadow Home' }))).toEqual(['prod_007', 'prod_008']);
  });

  it('combines filters', () => {
    const result = filterProducts(products, { query: 'a', status: 'active', category: 'Accessories' });
    expect(ids(result)).toEqual(['prod_003']);
  });

  it('treats a null category or vendor as no filter', () => {
    expect(filterProducts(products, { category: null, vendor: null })).toHaveLength(products.length);
  });

  it('does not mutate the input array', () => {
    const copy = [...products];
    filterProducts(products, { status: 'active' });
    expect(products).toEqual(copy);
  });
});

describe('sortProducts', () => {
  const list = [
    makeProduct({ id: 'a', title: 'banana', priceCents: 300, inventory: 5, createdAt: '2026-03-01T00:00:00Z' }),
    makeProduct({ id: 'b', title: 'Apple', priceCents: 100, inventory: 20, createdAt: '2026-01-01T00:00:00Z' }),
    makeProduct({ id: 'c', title: 'cherry', priceCents: 200, inventory: 0, createdAt: '2026-02-01T00:00:00Z' }),
  ];

  it('sorts by title ignoring case', () => {
    expect(ids(sortProducts(list, 'title'))).toEqual(['b', 'a', 'c']);
  });

  it('sorts by price in both directions', () => {
    expect(ids(sortProducts(list, 'price', 'asc'))).toEqual(['b', 'c', 'a']);
    expect(ids(sortProducts(list, 'price', 'desc'))).toEqual(['a', 'c', 'b']);
  });

  it('sorts by inventory', () => {
    expect(ids(sortProducts(list, 'inventory'))).toEqual(['c', 'a', 'b']);
  });

  it('sorts by creation date, newest first when descending', () => {
    expect(ids(sortProducts(list, 'createdAt', 'desc'))).toEqual(['a', 'c', 'b']);
  });

  it('keeps the original order for ties', () => {
    const tied = [makeProduct({ id: 'x', priceCents: 500 }), makeProduct({ id: 'y', priceCents: 500 })];
    expect(ids(sortProducts(tied, 'price', 'desc'))).toEqual(['x', 'y']);
  });

  it('returns a new array without mutating the input', () => {
    const before = ids(list);
    const sorted = sortProducts(list, 'price');
    expect(sorted).not.toBe(list);
    expect(ids(list)).toEqual(before);
  });
});

describe('getCategories and getVendors', () => {
  it('returns sorted unique categories', () => {
    expect(getCategories(products)).toEqual(['Accessories', 'Apparel', 'Home', 'Kitchen']);
  });

  it('returns sorted unique vendors', () => {
    expect(getVendors(products)).toEqual(['Harbor Goods', 'Kiln & Co.', 'Meadow Home', 'Northwind Apparel']);
  });
});

describe('getStockStatus', () => {
  it('is out of stock at zero or below', () => {
    expect(getStockStatus({ inventory: 0, lowStockThreshold: 5 })).toBe('out_of_stock');
    expect(getStockStatus({ inventory: -2, lowStockThreshold: 5 })).toBe('out_of_stock');
  });

  it('is low stock at or below the threshold', () => {
    expect(getStockStatus({ inventory: 5, lowStockThreshold: 5 })).toBe('low_stock');
    expect(getStockStatus({ inventory: 1, lowStockThreshold: 5 })).toBe('low_stock');
  });

  it('is in stock above the threshold', () => {
    expect(getStockStatus({ inventory: 6, lowStockThreshold: 5 })).toBe('in_stock');
  });

  it('treats a zero threshold as never low', () => {
    expect(getStockStatus({ inventory: 1, lowStockThreshold: 0 })).toBe('in_stock');
  });
});

describe('getDiscountPercent', () => {
  it('returns the rounded percentage saved', () => {
    expect(getDiscountPercent(2400, 3000)).toBe(20);
    expect(getDiscountPercent(4500, 5200)).toBe(13);
  });

  it('returns null without a higher compare-at price', () => {
    expect(getDiscountPercent(2400, null)).toBeNull();
    expect(getDiscountPercent(2400, 2400)).toBeNull();
    expect(getDiscountPercent(2400, 2000)).toBeNull();
  });
});

describe('getProductSales', () => {
  it('totals units and revenue across orders, newest first', () => {
    const sales = getProductSales('prod_001', orders);
    expect(sales.unitsSold).toBe(3);
    expect(sales.revenueCents).toBe(7200);
    expect(sales.orderCount).toBe(2);
    expect(sales.orders.map((line) => line.orderNumber)).toEqual([1007, 1001]);
  });

  it('leaves out fully refunded orders', () => {
    // Order 1006 (4 × socks) was refunded; order 1007 (2 × socks) was not.
    const sales = getProductSales('prod_010', orders);
    expect(sales.unitsSold).toBe(2);
    expect(sales.orders.map((line) => line.orderNumber)).toEqual([1007]);
  });

  it('adds up repeated lines for the same product in one order', () => {
    const order: Order = {
      ...orders[0],
      lineItems: [
        { productId: 'prod_005', title: 'Mug', sku: 'KT-MUG-005', quantity: 2, unitPriceCents: 1600 },
        { productId: 'prod_005', title: 'Mug', sku: 'KT-MUG-005', quantity: 1, unitPriceCents: 1400 },
      ],
    };
    const sales = getProductSales('prod_005', [order]);
    expect(sales.orderCount).toBe(1);
    expect(sales.unitsSold).toBe(3);
    expect(sales.revenueCents).toBe(4600);
  });

  it('returns zeros for a product with no sales', () => {
    expect(getProductSales('prod_006', orders)).toEqual({ unitsSold: 0, revenueCents: 0, orderCount: 0, orders: [] });
  });
});

describe('countByStatus', () => {
  it('counts products per status', () => {
    expect(countByStatus(products)).toEqual({ all: 10, active: 8, draft: 1, archived: 1 });
  });

  it('returns zeros for an empty list', () => {
    expect(countByStatus([])).toEqual({ all: 0, active: 0, draft: 0, archived: 0 });
  });
});
