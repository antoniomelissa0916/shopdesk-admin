import type { Order, Product, ProductStatus } from '../types';
import type { SortDirection } from './sorting';

export type ProductStatusFilter = ProductStatus | 'all';
export type ProductSortKey = 'title' | 'price' | 'inventory' | 'createdAt';

export interface ProductFilters {
  query?: string;
  status?: ProductStatusFilter;
  category?: string | null;
  vendor?: string | null;
}

export function matchesQuery(product: Product, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return [product.title, product.sku, product.vendor].some((field) =>
    field.toLowerCase().includes(needle),
  );
}

export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  const { query = '', status = 'all', category = null, vendor = null } = filters;
  return products.filter(
    (product) =>
      (status === 'all' || product.status === status) &&
      (!category || product.category === category) &&
      (!vendor || product.vendor === vendor) &&
      matchesQuery(product, query),
  );
}

function compareProducts(a: Product, b: Product, key: ProductSortKey): number {
  switch (key) {
    case 'title':
      return a.title.localeCompare(b.title, 'en', { sensitivity: 'base' });
    case 'price':
      return a.priceCents - b.priceCents;
    case 'inventory':
      return a.inventory - b.inventory;
    case 'createdAt':
      return Date.parse(a.createdAt) - Date.parse(b.createdAt);
  }
}

export function sortProducts(
  products: Product[],
  key: ProductSortKey,
  direction: SortDirection = 'asc',
): Product[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...products].sort((a, b) => sign * compareProducts(a, b, key));
}

export function getCategories(products: Product[]): string[] {
  return [...new Set(products.map((product) => product.category))].sort();
}

export function getVendors(products: Product[]): string[] {
  return [...new Set(products.map((product) => product.vendor))].sort();
}

export type StockStatus = 'out_of_stock' | 'low_stock' | 'in_stock';

export function getStockStatus(product: Pick<Product, 'inventory' | 'lowStockThreshold'>): StockStatus {
  if (product.inventory <= 0) {
    return 'out_of_stock';
  }
  return product.inventory <= product.lowStockThreshold ? 'low_stock' : 'in_stock';
}

/**
 * Percentage saved compared with the compare-at price, rounded to a whole
 * number. Returns null when there is no valid compare-at price.
 */
export function getDiscountPercent(priceCents: number, compareAtPriceCents: number | null): number | null {
  if (compareAtPriceCents === null || compareAtPriceCents <= priceCents) {
    return null;
  }
  return Math.round(((compareAtPriceCents - priceCents) / compareAtPriceCents) * 100);
}

export interface ProductOrderLine {
  orderId: string;
  orderNumber: number;
  createdAt: string;
  quantity: number;
  totalCents: number;
}

export interface ProductSales {
  unitsSold: number;
  revenueCents: number;
  orderCount: number;
  /** Orders containing the product, newest first. */
  orders: ProductOrderLine[];
}

/**
 * Sums sales of a product across orders. Fully refunded orders are left
 * out; revenue is quantity × unit price before discounts, tax and shipping.
 */
export function getProductSales(productId: string, orders: Order[]): ProductSales {
  const lines: ProductOrderLine[] = [];

  for (const order of orders) {
    if (order.paymentStatus === 'refunded') {
      continue;
    }
    let quantity = 0;
    let totalCents = 0;
    for (const item of order.lineItems) {
      if (item.productId === productId) {
        quantity += item.quantity;
        totalCents += item.quantity * item.unitPriceCents;
      }
    }
    if (quantity > 0) {
      lines.push({ orderId: order.id, orderNumber: order.number, createdAt: order.createdAt, quantity, totalCents });
    }
  }

  lines.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return {
    unitsSold: lines.reduce((sum, line) => sum + line.quantity, 0),
    revenueCents: lines.reduce((sum, line) => sum + line.totalCents, 0),
    orderCount: lines.length,
    orders: lines,
  };
}

export function countByStatus(products: Product[]): Record<ProductStatusFilter, number> {
  const counts: Record<ProductStatusFilter, number> = { all: products.length, active: 0, draft: 0, archived: 0 };
  for (const product of products) {
    counts[product.status] += 1;
  }
  return counts;
}
