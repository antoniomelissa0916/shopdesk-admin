import { useMemo, useState } from 'react';
import DailySalesChart from '../components/charts/DailySalesChart';
import TopProductsChart from '../components/charts/TopProductsChart';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import StatTile from '../components/StatTile';
import StockAlertsCard from '../components/StockAlertsCard';
import { formatDate, formatMoney, pluralize } from '../lib/format';
import {
  getDailySales,
  getPresetRange,
  getPreviousPeriod,
  getSalesSummary,
  getTopProducts,
  percentChange,
  RANGE_PRESET_LABELS,
  type RangePreset,
} from '../lib/salesStats';
import { getStockAlerts } from '../lib/stockAlerts';
import { useDiscounts } from '../store/DiscountsContext';
import { useOrders } from '../store/OrdersContext';
import { useProducts } from '../store/ProductsContext';

function change(current: number | null, previous: number | null): number | null {
  return current === null || previous === null ? null : percentChange(current, previous);
}

export default function DashboardPage() {
  const { products } = useProducts();
  const { orders } = useOrders();
  const { discounts, now } = useDiscounts();
  const [preset, setPreset] = useState<RangePreset>('last_30_days');

  const range = useMemo(() => getPresetRange(preset, now()), [preset, now]);
  const previousRange = useMemo(() => getPreviousPeriod(range), [range]);
  const current = useMemo(() => getSalesSummary(orders, discounts, range), [orders, discounts, range]);
  const previous = useMemo(
    () => getSalesSummary(orders, discounts, previousRange),
    [orders, discounts, previousRange],
  );
  const dailySales = useMemo(() => getDailySales(orders, discounts, range), [orders, discounts, range]);
  const topProducts = useMemo(() => getTopProducts(orders, range), [orders, range]);
  const unpaidCount = current.orderCount - current.paidOrderCount;
  const comparisonLabel = 'previous period';

  return (
    <>
      <PageHeader title="Home" subtitle="An overview of how your store is doing." />

      <div className="dashboard-filters">
        <label className="pagination-size">
          Date range
          <select
            className="select"
            value={preset}
            onChange={(event) => setPreset(event.target.value as RangePreset)}
          >
            {(Object.keys(RANGE_PRESET_LABELS) as RangePreset[]).map((value) => (
              <option key={value} value={value}>
                {RANGE_PRESET_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <span className="detail-note">
          {formatDate(`${range.start}T00:00:00Z`)} – {formatDate(`${range.end}T00:00:00Z`)}, compared with{' '}
          {formatDate(`${previousRange.start}T00:00:00Z`)} – {formatDate(`${previousRange.end}T00:00:00Z`)}
        </span>
      </div>

      <div className="dashboard-grid">
        <div className="stat-tiles">
          <StatTile
            label="Net sales"
            icon="dollar"
            value={formatMoney(current.netSalesCents)}
            change={change(current.netSalesCents, previous.netSalesCents)}
            comparisonLabel={comparisonLabel}
          />
          <StatTile
            label="Orders"
            icon="orders"
            value={String(current.orderCount)}
            change={change(current.orderCount, previous.orderCount)}
            comparisonLabel={comparisonLabel}
          />
          <StatTile
            label="Average order value"
            icon="average"
            value={current.averageOrderValueCents === null ? '—' : formatMoney(current.averageOrderValueCents)}
            change={change(current.averageOrderValueCents, previous.averageOrderValueCents)}
            comparisonLabel={comparisonLabel}
          />
          <StatTile
            label="Units sold"
            icon="box"
            value={String(current.unitsSold)}
            change={change(current.unitsSold, previous.unitsSold)}
            comparisonLabel={comparisonLabel}
          />
        </div>

        <section className="card detail-section" aria-labelledby="daily-sales-heading">
          <div className="section-heading">
            <h2 id="daily-sales-heading" className="section-title">
              <Icon name="chart" size={16} />
              Net sales by day
            </h2>
            <span className="detail-note">{formatMoney(current.netSalesCents)} in total</span>
          </div>
          <DailySalesChart days={dailySales} />
        </section>

        <div className="detail-layout">
          <section className="card detail-section" aria-labelledby="top-products-heading">
            <h2 id="top-products-heading" className="section-title">
              <Icon name="trophy" size={16} />
              Top products
            </h2>
            <TopProductsChart products={topProducts} />
          </section>

          <section className="card detail-section" aria-labelledby="breakdown-heading">
            <h2 id="breakdown-heading" className="section-title">
              <Icon name="receipt" size={16} />
              Sales breakdown
            </h2>
            <dl className="summary-list summary-list-compact">
              <div>
                <dt>Gross sales</dt>
                <dd>{formatMoney(current.grossSalesCents)}</dd>
              </div>
              <div>
                <dt>Discounts</dt>
                <dd>−{formatMoney(current.discountsCents)}</dd>
              </div>
              <div>
                <dt>Refunds</dt>
                <dd>−{formatMoney(current.refundsCents)}</dd>
              </div>
              <div className="summary-total">
                <dt>Net sales</dt>
                <dd>{formatMoney(current.netSalesCents)}</dd>
              </div>
            </dl>
            <p className="detail-note">
              Net sales include tax and shipping.{' '}
              {unpaidCount > 0
                ? `${pluralize(unpaidCount, 'order')} awaiting payment ${unpaidCount === 1 ? 'is' : 'are'} not included.`
                : 'All orders in this period have been paid.'}
            </p>
          </section>
        </div>

        <StockAlertsCard alerts={getStockAlerts(products)} />
      </div>
    </>
  );
}
