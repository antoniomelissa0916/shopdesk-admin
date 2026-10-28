import { Link } from 'react-router-dom';
import { pluralize } from '../lib/format';
import type { StockAlert } from '../lib/stockAlerts';
import Icon from './Icon';
import StockLevel from './StockLevel';

export default function StockAlertsCard({ alerts }: { alerts: StockAlert[] }) {
  return (
    <section className="card detail-section" aria-labelledby="stock-alerts-heading">
      <div className="section-heading">
        <h2 id="stock-alerts-heading" className="section-title">
          <Icon name="alert" size={16} />
          Inventory alerts
        </h2>
        {alerts.length > 0 && <span className="badge badge-warning">{pluralize(alerts.length, 'product')}</span>}
      </div>
      {alerts.length === 0 ? (
        <p className="detail-empty">All active products are well stocked.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Stock</th>
              <th scope="col" className="numeric">
                Alert at
              </th>
              <th scope="col" className="numeric">
                Suggested reorder
              </th>
            </tr>
          </thead>
          <tbody>
            {alerts.map(({ product, suggestedReorder }) => (
              <tr key={product.id}>
                <td>
                  <Link to={`/products/${product.id}`} className="cell-title cell-link">
                    {product.title}
                  </Link>
                  <div className="cell-subtitle">{product.sku}</div>
                </td>
                <td>
                  <StockLevel product={product} />
                </td>
                <td className="numeric">{product.lowStockThreshold}</td>
                <td className="numeric">{suggestedReorder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
