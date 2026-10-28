import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import StatusBadge, { type BadgeTone } from '../components/StatusBadge';
import Tabs, { type TabItem } from '../components/Tabs';
import {
  describeDiscount,
  DISCOUNT_STATUS_LABELS,
  formatActiveDates,
  formatUsage,
  getDiscountStatus,
  type DiscountStatus,
} from '../lib/discountRules';
import { pluralize } from '../lib/format';
import { useDiscounts } from '../store/DiscountsContext';

type StatusFilter = DiscountStatus | 'all';

const STATUS_TONES: Record<DiscountStatus, BadgeTone> = {
  active: 'success',
  scheduled: 'info',
  expired: 'neutral',
  used_up: 'warning',
};

export default function DiscountsPage() {
  const { discounts, now } = useDiscounts();
  const [filter, setFilter] = useState<StatusFilter>('all');

  const rows = useMemo(() => {
    const at = now();
    return discounts.map((discount) => ({ discount, status: getDiscountStatus(discount, at) }));
  }, [discounts, now]);

  const countFor = (status: DiscountStatus) => rows.filter((row) => row.status === status).length;
  const tabs: TabItem<StatusFilter>[] = [
    { id: 'all', label: 'All', count: rows.length },
    ...(Object.keys(DISCOUNT_STATUS_LABELS) as DiscountStatus[]).map((status) => ({
      id: status,
      label: DISCOUNT_STATUS_LABELS[status],
      count: countFor(status),
    })),
  ];
  const visible = filter === 'all' ? rows : rows.filter((row) => row.status === filter);

  return (
    <>
      <PageHeader
        title="Discounts"
        subtitle={pluralize(rows.length, 'discount code')}
        actions={
          <Link to="/discounts/new" className="button button-primary">
            Create discount
          </Link>
        }
      />
      <div className="card card-flush">
        <Tabs tabs={tabs} selected={filter} onSelect={setFilter} label="Filter by status" />
        {visible.length === 0 ? (
          <div className="empty-state">No discount codes with this status.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Status</th>
                <th scope="col">Active dates</th>
                <th scope="col" className="numeric">
                  Used
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ discount, status }) => (
                <tr key={discount.code}>
                  <td>
                    <div className="cell-title">{discount.code}</div>
                    <div className="cell-subtitle">{describeDiscount(discount)}</div>
                  </td>
                  <td>
                    <StatusBadge tone={STATUS_TONES[status]}>{DISCOUNT_STATUS_LABELS[status]}</StatusBadge>
                  </td>
                  <td>{formatActiveDates(discount)}</td>
                  <td className="numeric">{formatUsage(discount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
