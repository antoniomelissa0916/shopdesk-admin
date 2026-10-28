import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FulfillmentStatusBadge, PaymentStatusBadge } from '../components/OrderStatusBadges';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { customers } from '../data/customers';
import { getAverageOrderValue, getCustomerOrders, getCustomerStats } from '../lib/customers';
import { formatDate, formatMoney } from '../lib/format';
import { calculateOrderTotals, findDiscount } from '../lib/orderTotals';
import { useDiscounts } from '../store/DiscountsContext';
import { useOrders } from '../store/OrdersContext';

export default function CustomerDetailPage() {
  const { customerId = '' } = useParams();
  const { orders } = useOrders();
  const { discounts } = useDiscounts();
  const customer = customers.find((candidate) => candidate.id === customerId);

  const stats = useMemo(() => getCustomerStats(customerId, orders, discounts), [customerId, orders, discounts]);
  const history = useMemo(
    () =>
      getCustomerOrders(customerId, orders).map((order) => ({
        order,
        totals: calculateOrderTotals(order, findDiscount(order.discountCode, discounts)),
      })),
    [customerId, orders, discounts],
  );

  if (!customer) {
    return (
      <>
        <PageHeader title="Customer not found" backLink={{ to: '/customers', label: 'Back to customers' }} />
        <div className="card empty-state">
          <p>This customer doesn't exist or may have been removed.</p>
          <Link to="/customers">View all customers</Link>
        </div>
      </>
    );
  }

  const averageOrderValue = getAverageOrderValue(stats);

  return (
    <>
      <PageHeader
        title={`${customer.firstName} ${customer.lastName}`}
        subtitle={`Customer since ${formatDate(customer.createdAt)}`}
        backLink={{ to: '/customers', label: 'Back to customers' }}
      />

      <section className="card stat-row" aria-label="Customer summary">
        <div>
          <span className="stat-label">Amount spent</span>
          <span className="stat-value">{formatMoney(stats.amountSpentCents)}</span>
        </div>
        <div>
          <span className="stat-label">Orders</span>
          <span className="stat-value">{stats.orderCount}</span>
        </div>
        <div>
          <span className="stat-label">Average order value</span>
          <span className="stat-value">{averageOrderValue === null ? '—' : formatMoney(averageOrderValue)}</span>
        </div>
        <div>
          <span className="stat-label">Last order</span>
          <span className="stat-value">{stats.lastOrderAt ? formatDate(stats.lastOrderAt) : '—'}</span>
        </div>
      </section>

      <div className="detail-layout">
        <div className="detail-main">
          <section className="card detail-section" aria-labelledby="history-heading">
            <h2 id="history-heading">Order history</h2>
            {history.length === 0 ? (
              <p className="detail-empty">This customer hasn't placed any orders yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Date</th>
                    <th scope="col">Payment</th>
                    <th scope="col">Fulfillment</th>
                    <th scope="col" className="numeric">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(({ order, totals }) => (
                    <tr key={order.id}>
                      <td>
                        <Link to={`/orders/${order.id}`} className="cell-title cell-link">
                          #{order.number}
                        </Link>
                      </td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>
                        <PaymentStatusBadge status={order.paymentStatus} />
                      </td>
                      <td>
                        <FulfillmentStatusBadge status={order.fulfillmentStatus} />
                      </td>
                      <td className="numeric">{formatMoney(totals.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <aside className="detail-side">
          <section className="card detail-section" aria-labelledby="contact-heading">
            <h2 id="contact-heading">Contact information</h2>
            <div>
              <a href={`mailto:${customer.email}`} className="cell-link">
                {customer.email}
              </a>
              <div className="detail-note">{customer.phone ?? 'No phone number'}</div>
            </div>
            <div>
              {customer.acceptsMarketing ? (
                <StatusBadge tone="success">Subscribed to email</StatusBadge>
              ) : (
                <StatusBadge tone="neutral">Not subscribed to email</StatusBadge>
              )}
            </div>
          </section>

          <section className="card detail-section" aria-labelledby="address-heading">
            <h2 id="address-heading">Default address</h2>
            <address className="address">
              {customer.address.line1}
              <br />
              {customer.address.city}, {customer.address.region} {customer.address.postalCode}
              <br />
              {customer.address.country}
            </address>
          </section>

          <section className="card detail-section" aria-labelledby="tags-heading">
            <h2 id="tags-heading">Tags</h2>
            {customer.tags.length === 0 ? (
              <p className="detail-empty">No tags</p>
            ) : (
              <div className="tag-list">
                {customer.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
