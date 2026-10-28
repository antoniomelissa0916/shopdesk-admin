import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { formatMoney } from '../lib/format';
import type { ProductSortKey } from '../lib/products';
import type { SortState } from '../lib/sorting';
import ProductStatusBadge from './ProductStatusBadge';
import SortableHeader from './SortableHeader';
import StockLevel from './StockLevel';

interface ProductsTableProps {
  products: Product[];
  sort: SortState<ProductSortKey>;
  onSort: (key: ProductSortKey) => void;
}

export default function ProductsTable({ products, sort, onSort }: ProductsTableProps) {
  if (products.length === 0) {
    return <div className="empty-state">No products match your filters.</div>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <SortableHeader label="Product" sortKey="title" sort={sort} onSort={onSort} />
          <th scope="col">Status</th>
          <SortableHeader label="Inventory" sortKey="inventory" sort={sort} onSort={onSort} />
          <th scope="col">Category</th>
          <th scope="col">Vendor</th>
          <SortableHeader label="Price" sortKey="price" sort={sort} onSort={onSort} numeric />
        </tr>
      </thead>
      <tbody>
        {products.map((product) => (
          <tr key={product.id}>
            <td>
              <Link to={`/products/${product.id}`} className="cell-title cell-link">
                {product.title}
              </Link>
              <div className="cell-subtitle">{product.sku}</div>
            </td>
            <td>
              <ProductStatusBadge status={product.status} />
            </td>
            <td>
              <StockLevel product={product} />
            </td>
            <td>{product.category}</td>
            <td>{product.vendor}</td>
            <td className="numeric">{formatMoney(product.priceCents)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
