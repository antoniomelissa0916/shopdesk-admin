import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { TopProduct } from '../../lib/salesStats';
import TopProductsChart from './TopProductsChart';

const products: TopProduct[] = [
  { productId: 'prod_005', title: 'Stoneware Mug', unitsSold: 12, revenueCents: 19200 },
  { productId: 'prod_002', title: 'Everyday Hoodie', unitsSold: 2, revenueCents: 9600 },
  { productId: 'prod_008', title: 'Soy Wax Candle', unitsSold: 1, revenueCents: 3200 },
];

function renderChart(list: TopProduct[] = products) {
  render(
    <MemoryRouter>
      <TopProductsChart products={list} />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

const rows = () => within(screen.getByRole('list', { name: 'Top products by revenue' })).getAllByRole('listitem');

describe('TopProductsChart', () => {
  it('sizes each bar against the best seller', () => {
    renderChart();
    const percents = rows().map((row) =>
      (row.querySelector('.bar-row-fill') as HTMLElement).style.getPropertyValue('--bar-percent'),
    );
    expect(percents).toEqual(['100', '50', '16.666666666666664']);
  });

  it('puts the revenue at the end of each bar and the units under the name', () => {
    renderChart();
    const [mug] = rows();
    expect(within(mug).getByRole('link', { name: 'Stoneware Mug' })).toHaveAttribute('href', '/products/prod_005');
    expect(within(mug).getByText('12 units')).toBeInTheDocument();
    expect(within(mug).getByText('$192.00')).toBeInTheDocument();
  });

  it("shows the product's share of revenue on hover and focus", async () => {
    const user = renderChart();

    await user.hover(rows()[1]);
    // $96.00 of the $320.00 these three products made.
    expect(screen.getByRole('tooltip')).toHaveTextContent('30% of top product revenue · 2 units');
    expect(rows()[1]).toHaveClass('active');

    await user.unhover(rows()[1]);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await user.tab();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Stoneware Mug');
  });

  it('shows a message when nothing sold', () => {
    renderChart([]);
    expect(screen.getByText('No sales in this period.')).toBeInTheDocument();
  });
});
