import { Link } from 'react-router-dom';
import { formatMoney, pluralize } from '../lib/format';
import { formatLocation, type CustomerRow } from '../lib/customers';
import StatusBadge from './StatusBadge';

export default function CustomersTable({ rows }: { rows: CustomerRow[] }) {
  if (rows.length === 0) {
    return <div className="empty-state">No customers match your filters.</div>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th scope="col">Customer</th>
          <th scope="col">Email subscription</th>
          <th scope="col">Location</th>
          <th scope="col" className="numeric">
            Orders
          </th>
          <th scope="col" className="numeric">
            Amount spent
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ customer, stats }) => (
          <tr key={customer.id}>
            <td>
              <Link to={`/customers/${customer.id}`} className="cell-title cell-link">
                {customer.firstName} {customer.lastName}
              </Link>
              <div className="cell-subtitle">{customer.email}</div>
              {customer.tags.length > 0 && (
                <div className="tag-list">
                  {customer.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </td>
            <td>
              {customer.acceptsMarketing ? (
                <StatusBadge tone="success">Subscribed</StatusBadge>
              ) : (
                <StatusBadge tone="neutral">Not subscribed</StatusBadge>
              )}
            </td>
            <td>{formatLocation(customer)}</td>
            <td className="numeric">{pluralize(stats.orderCount, 'order')}</td>
            <td className="numeric">{formatMoney(stats.amountSpentCents)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
