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

/** Returns [detail, amount] for a row of the payment summary. */
function summaryRow(label: string): [string, string] {
  const payment = screen.getByRole('region', { name: 'Payment' });
  const row = within(payment).getByText(label, { selector: 'dt' }).parentElement as HTMLElement;
  const [detail, amount] = Array.from(row.querySelectorAll('dd')).map((dd) => dd.textContent ?? '');
  return [detail, amount];
}

describe('OrderDetailPage', () => {
  it('opens from the orders list', async () => {
    const user = renderAt('/orders');
    await user.click(screen.getByRole('link', { name: '#1003' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Order #1003' })).toBeInTheDocument();
  });

  it('shows the order date and statuses', () => {
    renderAt('/orders/ord_002');
    expect(screen.getByText('Placed Aug 4, 2026')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('Unfulfilled')).toBeInTheDocument();
  });

  it('lists each item with price, quantity and line total', () => {
    renderAt('/orders/ord_003');
    const items = screen.getByRole('region', { name: 'Items' });
    const mugRow = within(items).getByRole('link', { name: 'Stoneware Mug' }).closest('tr') as HTMLElement;

    expect(within(items).getByRole('link', { name: 'Stoneware Mug' })).toHaveAttribute('href', '/products/prod_005');
    expect(within(mugRow).getByText('KT-MUG-005')).toBeInTheDocument();
    expect(within(mugRow).getByText('$16.00')).toBeInTheDocument();
    expect(within(mugRow).getByText('12')).toBeInTheDocument();
    expect(within(mugRow).getByText('$192.00')).toBeInTheDocument();
  });

  it('breaks down the payment with discount, shipping and tax', () => {
    renderAt('/orders/ord_002');
    expect(summaryRow('Subtotal')).toEqual(['1 item', '$58.00']);
    expect(summaryRow('Discount')).toEqual(['WELCOME10', '−$5.80']);
    expect(summaryRow('Shipping')).toEqual(['', '$12.00']);
    expect(summaryRow('Tax')).toEqual(['13%', '$6.79']);
    expect(summaryRow('Total')).toEqual(['', '$70.99']);
    expect(screen.queryByText('Refunded', { selector: 'dt' })).not.toBeInTheDocument();
  });

  it('marks free shipping', () => {
    renderAt('/orders/ord_003');
    expect(summaryRow('Shipping')).toEqual(['Free', '$0.00']);
  });

  it('hides the discount row when no code was used', () => {
    renderAt('/orders/ord_001');
    expect(screen.getByRole('region', { name: 'Payment' })).not.toHaveTextContent('Discount');
  });

  it('shows refunds and the net payment', () => {
    renderAt('/orders/ord_005');
    expect(summaryRow('Total')).toEqual(['', '$113.84']);
    expect(summaryRow('Refunded')).toEqual(['', '−$37.49']);
    expect(summaryRow('Net payment')).toEqual(['', '$76.35']);
  });

  it('shows the customer contact details and address', () => {
    renderAt('/orders/ord_002');
    const customer = within(screen.getByRole('region', { name: 'Customer' }));
    expect(customer.getByText('Liam Okafor')).toBeInTheDocument();
    expect(customer.getByText('liam.okafor@example.com')).toBeInTheDocument();
    expect(customer.getByText(/Toronto, ON M5H 1A1/)).toBeInTheDocument();
  });

  it('links to orders from the product sales table', async () => {
    const user = renderAt('/products/prod_001');
    await user.click(screen.getByRole('link', { name: '#1001' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Order #1001' })).toBeInTheDocument();
  });

  it('shows a not found message for an unknown order', () => {
    renderAt('/orders/ord_404');
    expect(screen.getByRole('heading', { name: 'Order not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all orders' })).toHaveAttribute('href', '/orders');
  });
});
