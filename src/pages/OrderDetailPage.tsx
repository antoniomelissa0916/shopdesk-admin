import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DiscountCodeForm from '../components/DiscountCodeForm';
import { FulfillmentStatusBadge, PaymentStatusBadge } from '../components/OrderStatusBadges';
import PageHeader from '../components/PageHeader';
import RefundForm from '../components/RefundForm';
import { customers } from '../data/customers';
import { canChangeDiscount } from '../lib/discountRules';
import { formatDate, formatMoney, formatPercent, pluralize } from '../lib/format';
import { canFulfill } from '../lib/fulfillment';
import { buildOrderRows, customerName } from '../lib/orders';
import { canRefund, getRefundableCents, type RefundRequest } from '../lib/refunds';
import { useDiscounts } from '../store/DiscountsContext';
import { useOrders } from '../store/OrdersContext';
import { useProducts } from '../store/ProductsContext';

export default function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const { getProduct } = useProducts();
  const { getOrder, fulfillOrder, refundOrder, applyDiscount, removeDiscount } = useOrders();
  const { discounts } = useDiscounts();
  const [refunding, setRefunding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const order = getOrder(orderId);
  const row = useMemo(
    () => (order ? buildOrderRows([order], customers, discounts)[0] : undefined),
    [order, discounts],
  );

  if (!row) {
    return (
      <>
        <PageHeader title="Order not found" backLink={{ to: '/orders', label: 'Back to orders' }} />
        <div className="card empty-state">
          <p>This order doesn't exist or may have been removed.</p>
          <Link to="/orders">View all orders</Link>
        </div>
      </>
    );
  }

  const { customer, totals } = row;
  const current = row.order;
  const netPaymentCents = getRefundableCents(totals.totalCents, current.refundedCents);

  function handleFulfill() {
    fulfillOrder(current.id);
    setMessage('Order marked as fulfilled.');
  }

  function handleRefund(amountCents: number, request: RefundRequest) {
    refundOrder(current.id, amountCents, request);
    setRefunding(false);
    setMessage(`Refunded ${formatMoney(amountCents)}.`);
  }

  function handleApplyDiscount(code: string) {
    const error = applyDiscount(current.id, code);
    if (!error) {
      setMessage(`Discount ${code.trim().toUpperCase()} applied.`);
    }
    return error;
  }

  function handleRemoveDiscount() {
    removeDiscount(current.id);
    setMessage('Discount removed.');
  }

  const discountEditable = canChangeDiscount(current);

  return (
    <>
      <PageHeader
        title={`Order #${current.number}`}
        subtitle={`Placed ${formatDate(current.createdAt)}`}
        backLink={{ to: '/orders', label: 'Back to orders' }}
        actions={
          <>
            {canRefund(current, totals) && !refunding && (
              <button
                type="button"
                className="button"
                onClick={() => {
                  setMessage(null);
                  setRefunding(true);
                }}
              >
                Refund
              </button>
            )}
            {canFulfill(current) && (
              <button type="button" className="button button-primary" onClick={handleFulfill}>
                Mark as fulfilled
              </button>
            )}
          </>
        }
      />
      <div className="order-badges">
        <PaymentStatusBadge status={current.paymentStatus} />
        <FulfillmentStatusBadge status={current.fulfillmentStatus} />
      </div>

      {message && (
        <div className="banner banner-success" role="status">
          <span>{message}</span>
          <button type="button" className="banner-close" aria-label="Dismiss" onClick={() => setMessage(null)}>
            ×
          </button>
        </div>
      )}

      <div className="detail-layout">
        <div className="detail-main">
          {refunding && (
            <RefundForm
              order={current}
              totals={totals}
              onRefund={handleRefund}
              onCancel={() => setRefunding(false)}
            />
          )}

          <section className="card detail-section" aria-labelledby="items-heading">
            <h2 id="items-heading">Items</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col" className="numeric">
                    Price
                  </th>
                  <th scope="col" className="numeric">
                    Quantity
                  </th>
                  <th scope="col" className="numeric">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {current.lineItems.map((item, index) => (
                  <tr key={`${item.productId}-${index}`}>
                    <td>
                      {getProduct(item.productId) ? (
                        <Link to={`/products/${item.productId}`} className="cell-title cell-link">
                          {item.title}
                        </Link>
                      ) : (
                        <div className="cell-title">{item.title}</div>
                      )}
                      <div className="cell-subtitle">{item.sku}</div>
                    </td>
                    <td className="numeric">{formatMoney(item.unitPriceCents)}</td>
                    <td className="numeric">
                      {item.quantity}
                      {(item.refundedQuantity ?? 0) > 0 && (
                        <div className="detail-note">{item.refundedQuantity} refunded</div>
                      )}
                    </td>
                    <td className="numeric">{formatMoney(item.quantity * item.unitPriceCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card detail-section" aria-labelledby="payment-heading">
            <h2 id="payment-heading">Payment</h2>
            <dl className="summary-list">
              <div>
                <dt>Subtotal</dt>
                <dd className="summary-detail">{pluralize(totals.itemCount, 'item')}</dd>
                <dd>{formatMoney(totals.subtotalCents)}</dd>
              </div>
              {current.discountCode && (
                <div>
                  <dt>Discount</dt>
                  <dd className="summary-detail">
                    {current.discountCode}
                    {discountEditable && (
                      <>
                        {' '}
                        <button type="button" className="link-button" onClick={handleRemoveDiscount}>
                          Remove
                        </button>
                      </>
                    )}
                  </dd>
                  <dd>−{formatMoney(totals.discountCents)}</dd>
                </div>
              )}
              <div>
                <dt>Shipping</dt>
                <dd className="summary-detail">{totals.shippingCents === 0 ? 'Free' : ''}</dd>
                <dd>{formatMoney(totals.shippingCents)}</dd>
              </div>
              <div>
                <dt>Tax</dt>
                <dd className="summary-detail">{formatPercent(current.taxRate)}</dd>
                <dd>{formatMoney(totals.taxCents)}</dd>
              </div>
              <div className="summary-total">
                <dt>Total</dt>
                <dd className="summary-detail" />
                <dd>{formatMoney(totals.totalCents)}</dd>
              </div>
              {current.refundedCents > 0 && (
                <>
                  <div>
                    <dt>Refunded</dt>
                    <dd className="summary-detail" />
                    <dd>−{formatMoney(current.refundedCents)}</dd>
                  </div>
                  <div className="summary-total">
                    <dt>Net payment</dt>
                    <dd className="summary-detail" />
                    <dd>{formatMoney(netPaymentCents)}</dd>
                  </div>
                </>
              )}
            </dl>
            {discountEditable && !current.discountCode && <DiscountCodeForm onApply={handleApplyDiscount} />}
          </section>
        </div>

        <aside className="detail-side">
          <section className="card detail-section" aria-labelledby="customer-heading">
            <h2 id="customer-heading">Customer</h2>
            {customer ? (
              <>
                <div>
                  <Link to={`/customers/${customer.id}`} className="cell-title cell-link">
                    {customerName(customer)}
                  </Link>
                  <div className="detail-note">{customer.email}</div>
                  {customer.phone && <div className="detail-note">{customer.phone}</div>}
                </div>
                <address className="address">
                  {customer.address.line1}
                  <br />
                  {customer.address.city}, {customer.address.region} {customer.address.postalCode}
                  <br />
                  {customer.address.country}
                </address>
              </>
            ) : (
              <p className="detail-empty">Unknown customer</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
