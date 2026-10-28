import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import InventoryAdjustForm from '../components/InventoryAdjustForm';
import PageHeader from '../components/PageHeader';
import ProductStatusBadge from '../components/ProductStatusBadge';
import StockLevel from '../components/StockLevel';
import { formatDate, formatMoney, pluralize } from '../lib/format';
import { ADJUSTMENT_REASON_LABELS, formatDelta } from '../lib/inventory';
import { calculateMargin } from '../lib/productForm';
import { getDiscountPercent, getProductSales } from '../lib/products';
import { useOrders } from '../store/OrdersContext';
import { useProducts } from '../store/ProductsContext';

export default function ProductDetailPage() {
  const { productId = '' } = useParams();
  const { getProduct, adjustInventory, getAdjustments } = useProducts();
  const { orders } = useOrders();
  const [adjusting, setAdjusting] = useState(false);
  const product = getProduct(productId);

  if (!product) {
    return (
      <>
        <PageHeader title="Product not found" backLink={{ to: '/products', label: 'Back to products' }} />
        <div className="card empty-state">
          <p>This product doesn't exist or may have been removed.</p>
          <Link to="/products">View all products</Link>
        </div>
      </>
    );
  }

  const margin = calculateMargin(product.priceCents, product.costCents);
  const discount = getDiscountPercent(product.priceCents, product.compareAtPriceCents);
  const sales = getProductSales(product.id, orders);
  const adjustments = getAdjustments(product.id);

  return (
    <>
      <PageHeader
        title={product.title}
        subtitle={`${product.sku} · Added ${formatDate(product.createdAt)}`}
        backLink={{ to: '/products', label: 'Back to products' }}
        actions={
          <Link to={`/products/${product.id}/edit`} className="button button-primary">
            Edit product
          </Link>
        }
      />

      <div className="detail-layout">
        <div className="detail-main">
          <section className="card detail-section" aria-labelledby="pricing-heading">
            <h2 id="pricing-heading">Pricing</h2>
            <dl className="detail-list">
              <div>
                <dt>Price</dt>
                <dd>{formatMoney(product.priceCents)}</dd>
              </div>
              <div>
                <dt>Compare-at price</dt>
                <dd>
                  {product.compareAtPriceCents === null ? (
                    '—'
                  ) : (
                    <>
                      <s>{formatMoney(product.compareAtPriceCents)}</s>
                      {discount !== null && <span className="detail-note"> {discount}% off</span>}
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt>Cost per item</dt>
                <dd>{formatMoney(product.costCents)}</dd>
              </div>
              <div>
                <dt>Profit per item</dt>
                <dd>{formatMoney(product.priceCents - product.costCents)}</dd>
              </div>
              <div>
                <dt>Margin</dt>
                <dd>{margin === null ? '—' : `${margin}%`}</dd>
              </div>
            </dl>
          </section>

          <section className="card detail-section" aria-labelledby="sales-heading">
            <h2 id="sales-heading">Sales</h2>
            <dl className="detail-list">
              <div>
                <dt>Units sold</dt>
                <dd>{sales.unitsSold}</dd>
              </div>
              <div>
                <dt>Revenue</dt>
                <dd>{formatMoney(sales.revenueCents)}</dd>
              </div>
              <div>
                <dt>Orders</dt>
                <dd>{sales.orderCount}</dd>
              </div>
            </dl>
            {sales.orders.length === 0 ? (
              <p className="detail-empty">This product hasn't been ordered yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Date</th>
                    <th scope="col" className="numeric">
                      Quantity
                    </th>
                    <th scope="col" className="numeric">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sales.orders.map((line) => (
                    <tr key={line.orderId}>
                      <td>
                        <Link to={`/orders/${line.orderId}`} className="cell-link">
                          #{line.orderNumber}
                        </Link>
                      </td>
                      <td>{formatDate(line.createdAt)}</td>
                      <td className="numeric">{line.quantity}</td>
                      <td className="numeric">{formatMoney(line.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <aside className="detail-side">
          <section className="card detail-section" aria-labelledby="status-heading">
            <h2 id="status-heading">Status</h2>
            <div>
              <ProductStatusBadge status={product.status} />
            </div>
          </section>

          <section className="card detail-section" aria-labelledby="inventory-heading">
            <div className="section-heading">
              <h2 id="inventory-heading">Inventory</h2>
              {!adjusting && (
                <button type="button" className="button button-small" onClick={() => setAdjusting(true)}>
                  Adjust
                </button>
              )}
            </div>
            <StockLevel product={product} />
            <p className="detail-note">
              Low stock alert at {pluralize(product.lowStockThreshold, 'unit')}.
            </p>
            {adjusting && (
              <InventoryAdjustForm
                currentQuantity={product.inventory}
                onSubmit={(request) => {
                  adjustInventory(product.id, request);
                  setAdjusting(false);
                }}
                onCancel={() => setAdjusting(false)}
              />
            )}
            {adjustments.length > 0 && (
              <div>
                <h3 className="subheading">Recent changes</h3>
                <ul className="adjustment-list" aria-label="Recent stock changes">
                  {adjustments.map((adjustment) => (
                    <li key={adjustment.id}>
                      <span className={adjustment.delta > 0 ? 'delta delta-up' : 'delta delta-down'}>
                        {formatDelta(adjustment.delta)}
                      </span>
                      <span>
                        {ADJUSTMENT_REASON_LABELS[adjustment.reason]}
                        <span className="detail-note adjustment-quantities">
                          {adjustment.previousQuantity} → {adjustment.newQuantity}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="card detail-section" aria-labelledby="organization-heading">
            <h2 id="organization-heading">Organization</h2>
            <dl className="detail-list detail-list-stacked">
              <div>
                <dt>Vendor</dt>
                <dd>{product.vendor || '—'}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{product.category}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}
