import { getStockStatus } from '../lib/products';
import type { Product } from '../types';

export default function StockLevel({ product }: { product: Pick<Product, 'inventory' | 'lowStockThreshold'> }) {
  switch (getStockStatus(product)) {
    case 'out_of_stock':
      return <span className="text-critical">Out of stock</span>;
    case 'low_stock':
      return <span className="text-warning">{product.inventory} in stock (low)</span>;
    case 'in_stock':
      return <span>{product.inventory} in stock</span>;
  }
}
