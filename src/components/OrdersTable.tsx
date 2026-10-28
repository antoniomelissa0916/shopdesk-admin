import { Link } from 'react-router-dom';
import { formatDate, formatMoney, pluralize } from '../lib/format';
import { customerName, type OrderRow } from '../lib/orders';
import { FulfillmentStatusBadge, PaymentStatusBadge } from './OrderStatusBadges';

export default function OrdersTable({ rows }: { rows: OrderRow[] }) {
  if (rows.length === 0) {
    return <div className="empty-state">No orders match your filters.</div>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th scope="col">Order</th>
          <th scope="col">Date</th>
          <th scope="col">Customer</th>
          <th scope="col" className="numeric">
            Total
          </th>
          <th scope="col">Payment</th>
          <th scope="col">Fulfillment</th>
          <th scope="col" className="numeric">
            Items
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ order, customer, totals }) => (
          <tr key={order.id}>
            <td>
              <Link to={`/orders/${order.id}`} className="cell-title cell-link">
                #{order.number}
              </Link>
            </td>
            <td>{formatDate(order.createdAt)}</td>
            <td>{customerName(customer)}</td>
            <td className="numeric">{formatMoney(totals.totalCents)}</td>
            <td>
              <PaymentStatusBadge status={order.paymentStatus} />
            </td>
            <td>
              <FulfillmentStatusBadge status={order.fulfillmentStatus} />
            </td>
            <td className="numeric">{pluralize(totals.itemCount, 'item')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
