import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../App';

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

function stat(label: string) {
  const summary = screen.getByRole('region', { name: 'Customer summary' });
  return within(summary).getByText(label).nextElementSibling?.textContent;
}

function historyOrderNumbers() {
  const history = screen.getByRole('region', { name: 'Order history' });
  return within(history)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getByRole('link').textContent);
}

describe('CustomerDetailPage', () => {
  it('opens from the customers list', async () => {
    const user = renderAt('/customers');
    await user.click(screen.getByRole('link', { name: 'Maya Chen' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Maya Chen' })).toBeInTheDocument();
    expect(screen.getByText('Customer since May 14, 2026')).toBeInTheDocument();
  });

  it('opens from the customer card on an order', async () => {
    const user = renderAt('/orders/ord_003');
    await user.click(screen.getByRole('link', { name: 'Sofia Rossi' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Sofia Rossi' })).toBeInTheDocument();
  });

  it('summarises spending and orders', () => {
    renderAt('/customers/cust_001');
    expect(stat('Amount spent')).toBe('$76.70');
    expect(stat('Orders')).toBe('2');
    expect(stat('Average order value')).toBe('$38.35');
    expect(stat('Last order')).toBe('Sep 3, 2026');
  });

  it('lists the order history newest first with statuses and totals', () => {
    renderAt('/customers/cust_001');
    expect(historyOrderNumbers()).toEqual(['#1006', '#1001']);

    const refunded = screen.getByRole('link', { name: '#1006' }).closest('tr') as HTMLElement;
    expect(within(refunded).getByText('Refunded')).toBeInTheDocument();
    expect(within(refunded).getByText('$70.18')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#1001' })).toHaveAttribute('href', '/orders/ord_001');
  });

  it('shows a dash for average order value before any payment', () => {
    renderAt('/customers/cust_004');
    expect(stat('Average order value')).toBe('—');
    expect(screen.getByText('Payment pending')).toBeInTheDocument();
  });

  it('shows contact details, address, subscription and tags', () => {
    renderAt('/customers/cust_005');
    expect(screen.getByRole('link', { name: 'aisha.khan@example.com' })).toHaveAttribute(
      'href',
      'mailto:aisha.khan@example.com',
    );
    expect(screen.getByText('+1 312 555 0110')).toBeInTheDocument();
    expect(screen.getByText('Not subscribed to email')).toBeInTheDocument();
    expect(screen.getByText(/Chicago, IL 60606/)).toBeInTheDocument();

    const tags = within(screen.getByRole('region', { name: 'Tags' }));
    expect(tags.getByText('vip')).toBeInTheDocument();
    expect(tags.getByText('repeat')).toBeInTheDocument();
  });

  it('handles a customer without a phone number or tags', () => {
    renderAt('/customers/cust_002');
    expect(screen.getByText('No phone number')).toBeInTheDocument();
    expect(screen.getByText('No tags')).toBeInTheDocument();
  });

  it('updates the amount spent after an order is refunded', async () => {
    const user = renderAt('/orders/ord_002');
    await user.click(screen.getByRole('button', { name: 'Refund' }));
    const quantity = screen.getByRole('spinbutton', { name: 'Quantity of Everyday Hoodie to refund' });
    await user.clear(quantity);
    await user.type(quantity, '1');
    await user.click(screen.getByRole('button', { name: /^Refund \$/ }));
    await user.click(screen.getByRole('link', { name: 'Liam Okafor' }));

    // $70.99 total less the $58.99 refund (hoodie less its discount, plus tax) leaves the shipping.
    expect(stat('Amount spent')).toBe('$12.00');
  });

  it('shows a not found message for an unknown customer', () => {
    renderAt('/customers/cust_404');
    expect(screen.getByRole('heading', { name: 'Customer not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all customers' })).toHaveAttribute('href', '/customers');
  });
});
