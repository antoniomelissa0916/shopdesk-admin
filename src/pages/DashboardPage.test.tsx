import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

// Date ranges are relative to today, so pin the clock. Only Date is faked
// so user-event's timers keep working.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

function renderDashboard() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

const tile = (label: string) => screen.getByRole('group', { name: label });

function breakdown(label: string) {
  const section = screen.getByRole('region', { name: 'Sales breakdown' });
  const row = within(section).getByText(label, { selector: 'dt' }).parentElement as HTMLElement;
  return row.querySelector('dd')?.textContent;
}

function topProductRows() {
  const chart = screen.getByRole('list', { name: 'Top products by revenue' });
  return within(chart)
    .getAllByRole('listitem')
    .map((row) => [
      within(row).getByRole('link').textContent,
      row.querySelector('.bar-row-label .detail-note')?.textContent,
      row.querySelector('.bar-row-value')?.textContent,
    ]);
}

describe('DashboardPage', () => {
  it('starts on the last 30 days and names the comparison period', () => {
    renderDashboard();
    expect(screen.getByRole('combobox', { name: 'Date range' })).toHaveDisplayValue('Last 30 days');
    expect(
      screen.getByText('Sep 1, 2026 – Sep 30, 2026, compared with Aug 2, 2026 – Aug 31, 2026'),
    ).toBeInTheDocument();
  });

  it('shows each stat with its change from the previous period', () => {
    renderDashboard();
    expect(tile('Net sales')).toHaveTextContent('$105.00▼ Down 73.3% vs previous period');
    expect(tile('Orders')).toHaveTextContent('2▼ Down 50% vs previous period');
    expect(tile('Average order value')).toHaveTextContent('$87.59▼ Down 39% vs previous period');
    expect(tile('Units sold')).toHaveTextContent('4▼ Down 77.8% vs previous period');
  });

  it('breaks down net sales and lists the top products', () => {
    renderDashboard();
    expect(breakdown('Gross sales')).toBe('$172.00');
    expect(breakdown('Discounts')).toBe('−$15.00');
    expect(breakdown('Refunds')).toBe('−$70.18');
    expect(breakdown('Net sales')).toBe('$105.00');
    expect(screen.getByText(/All orders in this period have been paid\./)).toBeInTheDocument();

    expect(topProductRows()).toEqual([
      ['Everyday Hoodie', '1 unit', '$58.00'],
      ['Organic Cotton Socks (3-pack)', '2 units', '$30.00'],
      ['Classic Cotton T-Shirt', '1 unit', '$24.00'],
    ]);
  });

  it('updates everything when the date range changes', async () => {
    const user = renderDashboard();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Date range' }), 'Last month');

    expect(tile('Net sales')).toHaveTextContent('$469.66No data for previous period');
    expect(tile('Orders')).toHaveTextContent('5');
    expect(tile('Units sold')).toHaveTextContent('21');
    expect(breakdown('Refunds')).toBe('−$37.49');
    expect(screen.getByText(/1 order awaiting payment is not included\./)).toBeInTheDocument();
    expect(topProductRows()[0]).toEqual(['Stoneware Mug', '12 units', '$192.00']);
  });

  it('handles a period with no orders', async () => {
    const user = renderDashboard();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Date range' }), 'Last 7 days');

    expect(tile('Net sales')).toHaveTextContent('$0.00');
    expect(tile('Average order value')).toHaveTextContent('—');
    // Both the daily chart and the top products chart say so.
    expect(screen.getAllByText('No sales in this period.')).toHaveLength(2);
  });

  it('links top products to their pages', async () => {
    const user = renderDashboard();
    const section = screen.getByRole('region', { name: 'Top products' });
    await user.click(within(section).getByRole('link', { name: 'Everyday Hoodie' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Everyday Hoodie' })).toBeInTheDocument();
  });

  it('reflects a refund made on an order', async () => {
    const user = renderDashboard();
    await user.click(screen.getByRole('link', { name: 'Orders' }));
    await user.click(screen.getByRole('link', { name: '#1007' }));
    await user.click(screen.getByRole('button', { name: 'Refund' }));
    const socks = screen.getByRole('spinbutton', { name: 'Quantity of Organic Cotton Socks (3-pack) to refund' });
    await user.clear(socks);
    await user.type(socks, '1');
    await user.click(screen.getByRole('button', { name: /^Refund \$/ }));
    await user.click(screen.getByRole('link', { name: 'Home' }));

    // One $15.00 pack less its $2.01 share of FALL15, plus $1.07 tax, is $14.06 on top of the earlier $70.18.
    expect(breakdown('Refunds')).toBe('−$84.24');
  });
});
