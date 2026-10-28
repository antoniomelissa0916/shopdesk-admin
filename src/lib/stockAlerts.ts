import type { Product } from '../types';
import { getStockStatus } from './products';

export interface StockAlert {
  product: Product;
  status: 'out_of_stock' | 'low_stock';
  /** Units to order to bring stock back up to twice the low stock threshold. */
  suggestedReorder: number;
}

/** How far above the threshold a restock should bring stock, as a multiple of the threshold. */
export const RESTOCK_TARGET_MULTIPLIER = 2;

export function getSuggestedReorder(product: Pick<Product, 'inventory' | 'lowStockThreshold'>): number {
  const target = product.lowStockThreshold * RESTOCK_TARGET_MULTIPLIER;
  return Math.max(target - Math.max(product.inventory, 0), 0);
}

/**
 * Active products that are out of stock or at or below their low stock
 * threshold. Draft and archived products are not being sold, so they are
 * left out. Out of stock products come first, then the lowest stock.
 */
export function getStockAlerts(products: Product[]): StockAlert[] {
  const alerts: StockAlert[] = [];
  for (const product of products) {
    if (product.status !== 'active') {
      continue;
    }
    const status = getStockStatus(product);
    if (status !== 'in_stock') {
      alerts.push({ product, status, suggestedReorder: getSuggestedReorder(product) });
    }
  }
  return alerts.sort(
    (a, b) =>
      Number(b.status === 'out_of_stock') - Number(a.status === 'out_of_stock') ||
      a.product.inventory - b.product.inventory ||
      a.product.title.localeCompare(b.product.title),
  );
}
