import { useMemo, useState } from 'react';
import CustomersTable from '../components/CustomersTable';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import SearchField from '../components/SearchField';
import Tabs, { type TabItem } from '../components/Tabs';
import { customers } from '../data/customers';
import {
  buildCustomerRows,
  filterCustomers,
  sortCustomers,
  type CustomerSortKey,
  type MarketingFilter,
} from '../lib/customers';
import { pluralize } from '../lib/format';
import { paginate } from '../lib/pagination';
import type { SortDirection } from '../lib/sorting';
import { useDiscounts } from '../store/DiscountsContext';
import { useOrders } from '../store/OrdersContext';

const PAGE_SIZE_OPTIONS = [5, 10, 25];

const SORT_OPTIONS: { value: `${CustomerSortKey}:${SortDirection}`; label: string }[] = [
  { value: 'name:asc', label: 'Last name A–Z' },
  { value: 'name:desc', label: 'Last name Z–A' },
  { value: 'amountSpent:desc', label: 'Amount spent: high to low' },
  { value: 'amountSpent:asc', label: 'Amount spent: low to high' },
  { value: 'orderCount:desc', label: 'Most orders' },
  { value: 'createdAt:desc', label: 'Newest customers' },
  { value: 'createdAt:asc', label: 'Oldest customers' },
];

export default function CustomersPage() {
  const { orders } = useOrders();
  const { discounts } = useDiscounts();
  const [query, setQuery] = useState('');
  const [marketing, setMarketing] = useState<MarketingFilter>('all');
  const [sort, setSort] = useState<`${CustomerSortKey}:${SortDirection}`>('name:asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const allRows = useMemo(() => buildCustomerRows(customers, orders, discounts), [orders, discounts]);
  const subscribedCount = allRows.filter((row) => row.customer.acceptsMarketing).length;
  const tabs: TabItem<MarketingFilter>[] = [
    { id: 'all', label: 'All', count: allRows.length },
    { id: 'subscribed', label: 'Subscribed', count: subscribedCount },
    { id: 'not_subscribed', label: 'Not subscribed', count: allRows.length - subscribedCount },
  ];

  const matchingRows = useMemo(() => {
    const [key, direction] = sort.split(':') as [CustomerSortKey, SortDirection];
    return sortCustomers(filterCustomers(allRows, { query, marketing }), key, direction);
  }, [allRows, query, marketing, sort]);
  const currentPage = paginate(matchingRows, page, pageSize);

  // Any change to what is shown starts again from the first page.
  function withFirstPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <>
      <PageHeader title="Customers" subtitle={pluralize(allRows.length, 'customer')} />
      <div className="card card-flush">
        <Tabs tabs={tabs} selected={marketing} onSelect={withFirstPage(setMarketing)} label="Email subscription" />
        <div className="table-toolbar">
          <SearchField
            value={query}
            onChange={withFirstPage(setQuery)}
            label="Search customers"
            placeholder="Search by name, email, phone, city or tag"
          />
          <select
            className="select"
            aria-label="Sort customers"
            value={sort}
            onChange={(event) => withFirstPage(setSort)(event.target.value as `${CustomerSortKey}:${SortDirection}`)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <CustomersTable rows={currentPage.items} />
        {currentPage.total > 0 && (
          <Pagination
            page={currentPage}
            onPageChange={setPage}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={withFirstPage(setPageSize)}
            itemLabel="customers"
          />
        )}
      </div>
    </>
  );
}
