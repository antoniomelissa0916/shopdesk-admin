import { useMemo, useState } from 'react';
import OrdersTable from '../components/OrdersTable';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import SearchField from '../components/SearchField';
import { customers } from '../data/customers';
import { pluralize } from '../lib/format';
import {
  buildOrderRows,
  filterOrders,
  FULFILLMENT_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  sortOrdersNewestFirst,
  type FulfillmentFilter,
  type PaymentFilter,
} from '../lib/orders';
import { paginate } from '../lib/pagination';
import { useDiscounts } from '../store/DiscountsContext';
import { useOrders } from '../store/OrdersContext';

const PAGE_SIZE_OPTIONS = [5, 10, 25];

const PAYMENT_OPTIONS: { value: PaymentFilter; label: string }[] = [
  { value: 'all', label: 'All payment statuses' },
  ...(Object.entries(PAYMENT_STATUS_LABELS) as [PaymentFilter, string][]).map(([value, label]) => ({ value, label })),
];

const FULFILLMENT_OPTIONS: { value: FulfillmentFilter; label: string }[] = [
  { value: 'all', label: 'All fulfillment statuses' },
  ...(Object.entries(FULFILLMENT_STATUS_LABELS) as [FulfillmentFilter, string][]).map(([value, label]) => ({
    value,
    label,
  })),
];

export default function OrdersPage() {
  const { orders } = useOrders();
  const { discounts } = useDiscounts();
  const [query, setQuery] = useState('');
  const [payment, setPayment] = useState<PaymentFilter>('all');
  const [fulfillment, setFulfillment] = useState<FulfillmentFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const allRows = useMemo(
    () => sortOrdersNewestFirst(buildOrderRows(orders, customers, discounts)),
    [orders, discounts],
  );
  const matchingRows = useMemo(
    () => filterOrders(allRows, { query, payment, fulfillment }),
    [allRows, query, payment, fulfillment],
  );
  const currentPage = paginate(matchingRows, page, pageSize);
  const filtersActive = query.trim() !== '' || payment !== 'all' || fulfillment !== 'all';

  // Any change to what is shown starts again from the first page.
  function withFirstPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  function clearFilters() {
    setQuery('');
    setPayment('all');
    setFulfillment('all');
    setPage(1);
  }

  return (
    <>
      <PageHeader title="Orders" subtitle={pluralize(allRows.length, 'order')} />
      <div className="card card-flush">
        <div className="table-toolbar">
          <SearchField
            value={query}
            onChange={withFirstPage(setQuery)}
            label="Search orders"
            placeholder="Search by order number, customer or email"
          />
          <select
            className="select select-inline"
            aria-label="Payment status"
            value={payment}
            onChange={(event) => withFirstPage(setPayment)(event.target.value as PaymentFilter)}
          >
            {PAYMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="select select-inline"
            aria-label="Fulfillment status"
            value={fulfillment}
            onChange={(event) => withFirstPage(setFulfillment)(event.target.value as FulfillmentFilter)}
          >
            {FULFILLMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {filtersActive && (
            <button type="button" className="button" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
        <OrdersTable rows={currentPage.items} />
        {currentPage.total > 0 && (
          <Pagination
            page={currentPage}
            onPageChange={setPage}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={withFirstPage(setPageSize)}
            itemLabel="orders"
          />
        )}
      </div>
    </>
  );
}
