import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { DailySales } from '../../lib/salesStats';
import DailySalesChart from './DailySalesChart';

const days: DailySales[] = [
  { date: '2026-09-13', orderCount: 0, netSalesCents: 0 },
  { date: '2026-09-14', orderCount: 1, netSalesCents: 4200 },
  { date: '2026-09-15', orderCount: 2, netSalesCents: 10500 },
  { date: '2026-09-16', orderCount: 0, netSalesCents: 0 },
  { date: '2026-09-17', orderCount: 1, netSalesCents: 1999 },
];

const plot = () => screen.getByRole('group', { name: /^Net sales by day/ });
const slots = () => Array.from(document.querySelectorAll('.chart-slot'));

describe('DailySalesChart', () => {
  it('draws one slot per day and a column only for days with sales', () => {
    render(<DailySalesChart days={days} />);
    expect(slots()).toHaveLength(5);
    expect(document.querySelectorAll('.chart-column')).toHaveLength(3);
  });

  it('sizes columns against a clean axis maximum', () => {
    render(<DailySalesChart days={days} />);
    // $105.00 peak gives a $0–$150 axis, so the peak column is 70% tall.
    const peak = slots()[2].querySelector('.chart-column') as HTMLElement;
    expect(peak.style.height).toBe('70%');
    expect(Array.from(document.querySelectorAll('.chart-y-axis span')).map((tick) => tick.textContent)).toEqual([
      '$0',
      '$50',
      '$100',
      '$150',
    ]);
  });

  it('labels the peak day and the first, middle and last dates', () => {
    render(<DailySalesChart days={days} />);
    expect(document.querySelector('.chart-peak-label')).toHaveTextContent('$105.00');
    expect(Array.from(document.querySelectorAll('.chart-x-axis span')).map((label) => label.textContent)).toEqual([
      'Sep 13',
      'Sep 15',
      'Sep 17',
    ]);
  });

  it('shows the value, date and order count for the hovered day', async () => {
    const user = userEvent.setup();
    render(<DailySalesChart days={days} />);

    await user.hover(slots()[1]);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('$42.00');
    expect(tooltip).toHaveTextContent('Sep 14');
    expect(tooltip).toHaveTextContent('1 order');
    expect(slots()[1]).toHaveClass('active');

    await user.unhover(plot());
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('can be read day by day with the keyboard', async () => {
    const user = userEvent.setup();
    render(<DailySalesChart days={days} />);

    await user.tab();
    expect(plot()).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Sep 17');
    expect(screen.getByText('Sep 17: $19.99 net sales from 1 order')).toBeInTheDocument();

    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Sep 15');

    await user.keyboard('{Home}');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Sep 13');
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Sep 13');

    await user.keyboard('{End}');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Sep 17');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('offers the same numbers as a table, leaving out days without orders', async () => {
    const user = userEvent.setup();
    render(<DailySalesChart days={days} />);
    await user.click(screen.getByText('Show data table'));

    const rows = within(screen.getByRole('table'))
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.textContent);
    expect(rows).toEqual(['Sep 141$42.00', 'Sep 152$105.00', 'Sep 171$19.99']);
  });

  it('shows a message instead of an empty chart', () => {
    render(<DailySalesChart days={[{ date: '2026-09-13', orderCount: 1, netSalesCents: 0 }]} />);
    expect(screen.getByText('No sales in this period.')).toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });
});
