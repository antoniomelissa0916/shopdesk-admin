import { useState, type KeyboardEvent } from 'react';
import { formatAxisMoney, formatShortDay, getAxisTicks, toPercent } from '../../lib/chartScale';
import { formatMoney, pluralize } from '../../lib/format';
import type { DailySales } from '../../lib/salesStats';

interface DailySalesChartProps {
  days: DailySales[];
}

function describeDay(day: DailySales): string {
  return `${formatShortDay(day.date)}: ${formatMoney(day.netSalesCents)} net sales from ${pluralize(day.orderCount, 'order')}`;
}

/**
 * Net sales per day as columns. Hover a day, or focus the chart and use the
 * arrow keys, to read its value; the same numbers are in the data table below.
 */
export default function DailySalesChart({ days }: DailySalesChartProps) {
  const [active, setActive] = useState<number | null>(null);

  const max = Math.max(0, ...days.map((day) => day.netSalesCents));
  if (days.length === 0 || max === 0) {
    return <p className="detail-empty">No sales in this period.</p>;
  }

  const ticks = getAxisTicks(max);
  const top = ticks[ticks.length - 1];
  const peakIndex = days.findIndex((day) => day.netSalesCents === max);
  const centre = (index: number) => ((index + 0.5) / days.length) * 100;
  const labelIndexes = [...new Set([0, Math.floor((days.length - 1) / 2), days.length - 1])];
  const daysWithSales = days.filter((day) => day.orderCount > 0);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const last = days.length - 1;
    const keys: Record<string, () => number> = {
      ArrowRight: () => (active === null ? 0 : Math.min(active + 1, last)),
      ArrowLeft: () => (active === null ? last : Math.max(active - 1, 0)),
      Home: () => 0,
      End: () => last,
    };
    if (event.key === 'Escape') {
      setActive(null);
    } else if (keys[event.key]) {
      event.preventDefault();
      setActive(keys[event.key]());
    }
  }

  // Keep labels and the tooltip inside the chart near the left and right edges.
  const edgeShift = (index: number) => {
    const position = centre(index);
    return position < 15 ? '0%' : position > 85 ? '-100%' : '-50%';
  };

  return (
    <div className="column-chart">
      <div className="column-chart-body">
        <div className="chart-y-axis" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} style={{ bottom: `${toPercent(tick, top)}%` }}>
              {formatAxisMoney(tick)}
            </span>
          ))}
        </div>

        <div
          className="chart-plot"
          role="group"
          aria-label="Net sales by day. Use the left and right arrow keys to read each day."
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
        >
          {ticks.map((tick) => (
            <div
              key={tick}
              className={tick === 0 ? 'chart-gridline chart-baseline' : 'chart-gridline'}
              style={{ bottom: `${toPercent(tick, top)}%` }}
              aria-hidden="true"
            />
          ))}

          <div className="chart-columns" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
            {days.map((day, index) => (
              <div
                key={day.date}
                className={index === active ? 'chart-slot active' : 'chart-slot'}
                data-date={day.date}
                onPointerEnter={() => setActive(index)}
              >
                {day.netSalesCents > 0 && (
                  <div className="chart-column" style={{ height: `${toPercent(day.netSalesCents, top)}%` }} />
                )}
              </div>
            ))}
          </div>

          <span
            className="chart-peak-label"
            style={{
              left: `${centre(peakIndex)}%`,
              bottom: `${toPercent(max, top)}%`,
              transform: `translateX(${edgeShift(peakIndex)})`,
            }}
            aria-hidden="true"
          >
            {formatMoney(max)}
          </span>

          {active !== null && (
            <div
              className="chart-tooltip"
              role="tooltip"
              style={{ left: `${centre(active)}%`, transform: `translateX(${edgeShift(active)})` }}
            >
              <strong>{formatMoney(days[active].netSalesCents)}</strong>
              <span>{formatShortDay(days[active].date)}</span>
              <span>{pluralize(days[active].orderCount, 'order')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="chart-x-axis" aria-hidden="true">
        {labelIndexes.map((index) => (
          <span key={index} style={{ left: `${centre(index)}%`, transform: `translateX(${edgeShift(index)})` }}>
            {formatShortDay(days[index].date)}
          </span>
        ))}
      </div>

      <p className="visually-hidden" aria-live="polite">
        {active === null ? '' : describeDay(days[active])}
      </p>

      <details className="chart-table">
        <summary>Show data table</summary>
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col" className="numeric">
                Orders
              </th>
              <th scope="col" className="numeric">
                Net sales
              </th>
            </tr>
          </thead>
          <tbody>
            {daysWithSales.map((day) => (
              <tr key={day.date}>
                <td>{formatShortDay(day.date)}</td>
                <td className="numeric">{day.orderCount}</td>
                <td className="numeric">{formatMoney(day.netSalesCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="detail-note">Days without orders are left out.</p>
      </details>
    </div>
  );
}
