import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import ProductsTable from '../components/ProductsTable';
import SearchField from '../components/SearchField';
import Tabs, { type TabItem } from '../components/Tabs';
import { pluralize } from '../lib/format';
import {
  countByStatus,
  filterProducts,
  sortProducts,
  type ProductSortKey,
  type ProductStatusFilter,
} from '../lib/products';
import { paginate } from '../lib/pagination';
import { nextSortState, type SortState } from '../lib/sorting';
import { useProducts } from '../store/ProductsContext';

const PAGE_SIZE_OPTIONS = [5, 10, 25];

const SORT_OPTIONS: { value: `${ProductSortKey}:${'asc' | 'desc'}`; label: string }[] = [
  { value: 'title:asc', label: 'Title A–Z' },
  { value: 'title:desc', label: 'Title Z–A' },
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'price:asc', label: 'Price: low to high' },
  { value: 'price:desc', label: 'Price: high to low' },
  { value: 'inventory:asc', label: 'Inventory: low to high' },
  { value: 'inventory:desc', label: 'Inventory: high to low' },
];

export default function ProductsPage() {
  const { products } = useProducts();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ProductStatusFilter>('all');
  const [sort, setSort] = useState<SortState<ProductSortKey>>({ key: 'title', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const counts = useMemo(() => countByStatus(products), [products]);
  const tabs: TabItem<ProductStatusFilter>[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'active', label: 'Active', count: counts.active },
    { id: 'draft', label: 'Draft', count: counts.draft },
    { id: 'archived', label: 'Archived', count: counts.archived },
  ];

  const matchingProducts = useMemo(
    () => sortProducts(filterProducts(products, { query, status }), sort.key, sort.direction),
    [products, query, status, sort],
  );
  const currentPage = paginate(matchingProducts, page, pageSize);

  // Any change to what is shown starts again from the first page.
  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  function handleStatusChange(value: ProductStatusFilter) {
    setStatus(value);
    setPage(1);
  }

  function handleSortChange(value: SortState<ProductSortKey>) {
    setSort(value);
    setPage(1);
  }

  function handleSortSelect(value: string) {
    const [key, direction] = value.split(':') as [ProductSortKey, 'asc' | 'desc'];
    handleSortChange({ key, direction });
  }

  function handlePageSizeChange(value: number) {
    setPageSize(value);
    setPage(1);
  }

  return (
    <>
      <PageHeader
        title="Products"
        subtitle={pluralize(products.length, 'product')}
        actions={
          <Link to="/products/new" className="button button-primary">
            Add product
          </Link>
        }
      />
      <div className="card card-flush">
        <Tabs tabs={tabs} selected={status} onSelect={handleStatusChange} label="Filter by status" />
        <div className="table-toolbar">
          <SearchField
            value={query}
            onChange={handleQueryChange}
            label="Search products"
            placeholder="Search by title, SKU or vendor"
          />
          <select
            className="select"
            aria-label="Sort products"
            value={`${sort.key}:${sort.direction}`}
            onChange={(event) => handleSortSelect(event.target.value)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <ProductsTable
          products={currentPage.items}
          sort={sort}
          onSort={(key) => handleSortChange(nextSortState(sort, key))}
        />
        {currentPage.total > 0 && (
          <Pagination
            page={currentPage}
            onPageChange={setPage}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={handlePageSizeChange}
            itemLabel="products"
          />
        )}
      </div>
    </>
  );
}
