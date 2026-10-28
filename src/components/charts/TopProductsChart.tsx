import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { toPercent } from '../../lib/chartScale';
import { formatMoney, pluralize } from '../../lib/format';
import type { TopProduct } from '../../lib/salesStats';

interface TopProductsChartProps {
  products: TopProduct[];
}

/** Products ranked by revenue as horizontal bars, with each value at the end of its bar. */
export default function TopProductsChart({ products }: TopProductsChartProps) {
  const [active, setActive] = useState<string | null>(null);

  if (products.length === 0) {
    return <p className="detail-empty">No sales in this period.</p>;
  }

  const max = products[0].revenueCents;
  const total = products.reduce((sum, product) => sum + product.revenueCents, 0);

  return (
    <ol className="bar-list" aria-label="Top products by revenue">
      {products.map((product) => {
        const share = Math.round((product.revenueCents / total) * 100);
        const isActive = active === product.productId;
        return (
          <li
            key={product.productId}
            className={isActive ? 'bar-row active' : 'bar-row'}
            onPointerEnter={() => setActive(product.productId)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(product.productId)}
            onBlur={() => setActive(null)}
          >
            <div className="bar-row-label">
              <Link to={`/products/${product.productId}`} className="cell-link">
                {product.title}
              </Link>
              <span className="detail-note">{pluralize(product.unitsSold, 'unit')}</span>
            </div>
            <div className="bar-row-track">
              <div
                className="bar-row-fill"
                style={{ '--bar-percent': toPercent(product.revenueCents, max) } as CSSProperties}
              />
              <span className="bar-row-value">{formatMoney(product.revenueCents)}</span>
            </div>
            {isActive && (
              <div className="chart-tooltip bar-row-tooltip" role="tooltip">
                <strong>{formatMoney(product.revenueCents)}</strong>
                <span>{product.title}</span>
                <span>
                  {share}% of top product revenue · {pluralize(product.unitsSold, 'unit')}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
