import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../App';

function renderOrdersPage() {
  render(
    <MemoryRouter initialEntries={['/orders']}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

function visibleOrderNumbers(): string[] {
  const table = screen.queryByRole('table');
  if (!table) {
    return [];
  }
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent ?? '');
}

function rowFor(number: string) {
  return screen.getByText(number).closest('tr') as HTMLElement;
}

describe('OrdersPage', () => {
  it('lists the newest orders first', () => {
    renderOrdersPage();
    expect(screen.getByText('7 orders')).toBeInTheDocument();
    expect(visibleOrderNumbers()).toEqual(['#1007', '#1006', '#1005', '#1004', '#1003']);
    expect(screen.getByText('Showing 1–5 of 7 orders')).toBeInTheDocument();
  });

  it('shows the date, customer, total, statuses and item count', () => {
    renderOrdersPage();
    const row = within(rowFor('#1005'));
    expect(row.getByText('Aug 27, 2026')).toBeInTheDocument();
    expect(row.getByText('Aisha Khan')).toBeInTheDocument();
    expect(row.getByText('$113.84')).toBeInTheDocument();
    expect(row.getByText('Partially refunded')).toBeInTheDocument();
    expect(row.getByText('Fulfilled')).toBeInTheDocument();
    expect(row.getByText('3 items')).toBeInTheDocument();
  });

  it('filters by payment status', async () => {
    const user = renderOrdersPage();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Payment status' }), 'Payment pending');
    expect(visibleOrderNumbers()).toEqual(['#1004']);
  });

  it('filters by fulfillment status', async () => {
    const user = renderOrdersPage();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Fulfillment status' }), 'Unfulfilled');
    expect(visibleOrderNumbers()).toEqual(['#1007', '#1006', '#1004', '#1002']);
  });

  it('combines filters with search', async () => {
    const user = renderOrdersPage();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Payment status' }), 'Paid');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Fulfillment status' }), 'Unfulfilled');
    expect(visibleOrderNumbers()).toEqual(['#1007', '#1002']);

    await user.type(screen.getByRole('searchbox', { name: 'Search orders' }), 'okafor');
    expect(visibleOrderNumbers()).toEqual(['#1002']);
  });

  it('searches by order number', async () => {
    const user = renderOrdersPage();
    await user.type(screen.getByRole('searchbox', { name: 'Search orders' }), '#1001');
    expect(visibleOrderNumbers()).toEqual(['#1001']);
  });

  it('shows an empty state and clears all filters at once', async () => {
    const user = renderOrdersPage();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Payment status' }), 'Refunded');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Fulfillment status' }), 'Fulfilled');
    expect(screen.getByText('No orders match your filters.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(visibleOrderNumbers()).toHaveLength(5);
    expect(screen.getByRole('combobox', { name: 'Payment status' })).toHaveValue('all');
    expect(screen.getByRole('combobox', { name: 'Fulfillment status' })).toHaveValue('all');
  });

  it('pages through orders and returns to page one when a filter changes', async () => {
    const user = renderOrdersPage();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(visibleOrderNumbers()).toEqual(['#1002', '#1001']);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Fulfillment status' }), 'Unfulfilled');
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });
});
