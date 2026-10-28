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

function paymentAmount(label: string) {
  const payment = screen.getByRole('region', { name: 'Payment' });
  const row = within(payment).getByText(label, { selector: 'dt' }).parentElement as HTMLElement;
  return row.querySelectorAll('dd')[1].textContent;
}

async function setRefundQuantity(user: ReturnType<typeof userEvent.setup>, title: string, quantity: string) {
  const input = screen.getByRole('spinbutton', { name: `Quantity of ${title} to refund` });
  await user.clear(input);
  await user.type(input, quantity);
}

const refundForm = () => screen.getByRole('form', { name: 'Refund items' });

describe('fulfilling an order', () => {
  it('marks an unfulfilled order as fulfilled', async () => {
    const user = renderAt('/orders/ord_002');
    await user.click(screen.getByRole('button', { name: 'Mark as fulfilled' }));

    expect(screen.getByRole('status')).toHaveTextContent('Order marked as fulfilled.');
    expect(screen.getByText('Fulfilled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark as fulfilled' })).not.toBeInTheDocument();
  });

  it('shows the change on the orders list', async () => {
    const user = renderAt('/orders/ord_004');
    await user.click(screen.getByRole('button', { name: 'Mark as fulfilled' }));
    await user.click(screen.getByRole('link', { name: 'Back to orders' }));

    const row = screen.getByRole('link', { name: '#1004' }).closest('tr') as HTMLElement;
    expect(within(row).getByText('Fulfilled')).toBeInTheDocument();
  });

  it('is not offered for an order that is already fulfilled', () => {
    renderAt('/orders/ord_001');
    expect(screen.queryByRole('button', { name: 'Mark as fulfilled' })).not.toBeInTheDocument();
  });

  it('is not offered for a refunded order', () => {
    renderAt('/orders/ord_006');
    expect(screen.queryByRole('button', { name: 'Mark as fulfilled' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument();
  });
});

describe('refunding an order', () => {
  it('is not offered for an order awaiting payment', () => {
    renderAt('/orders/ord_004');
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument();
  });

  it('starts with nothing selected and the refund button disabled', async () => {
    const user = renderAt('/orders/ord_001');
    await user.click(screen.getByRole('button', { name: 'Refund' }));

    expect(within(refundForm()).getByRole('button', { name: 'Refund $0.00' })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('refunds one item with its tax and updates the payment status', async () => {
    const user = renderAt('/orders/ord_001');
    await user.click(screen.getByRole('button', { name: 'Refund' }));
    await setRefundQuantity(user, 'Classic Cotton T-Shirt', '1');
    await user.click(within(refundForm()).getByRole('button', { name: 'Refund $26.07' }));

    expect(screen.getByRole('status')).toHaveTextContent('Refunded $26.07.');
    expect(screen.queryByRole('form', { name: 'Refund items' })).not.toBeInTheDocument();
    expect(screen.getByText('Partially refunded')).toBeInTheDocument();
    expect(paymentAmount('Refunded')).toBe('−$26.07');
    expect(paymentAmount('Net payment')).toBe('$50.63');
  });

  it("includes the item's share of the discount", async () => {
    const user = renderAt('/orders/ord_003');
    await user.click(screen.getByRole('button', { name: 'Refund' }));
    await setRefundQuantity(user, 'Stoneware Mug', '2');

    expect(within(refundForm()).getByText('WHOLESALE20')).toBeInTheDocument();
    expect(within(refundForm()).getByText('−$6.40')).toBeInTheDocument();
    expect(within(refundForm()).getByRole('button', { name: 'Refund $27.87' })).toBeEnabled();
  });

  it('marks the order refunded when everything is returned', async () => {
    const user = renderAt('/orders/ord_002');
    await user.click(screen.getByRole('button', { name: 'Refund' }));
    await setRefundQuantity(user, 'Everyday Hoodie', '1');
    await user.click(screen.getByRole('checkbox', { name: /Refund shipping/ }));
    await user.click(within(refundForm()).getByRole('button', { name: 'Refund $70.99' }));

    expect(screen.getByText('Refunded', { selector: '.badge' })).toBeInTheDocument();
    expect(paymentAmount('Net payment')).toBe('$0.00');
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark as fulfilled' })).not.toBeInTheDocument();
  });

  it('blocks refunding more items than were ordered', async () => {
    const user = renderAt('/orders/ord_001');
    await user.click(screen.getByRole('button', { name: 'Refund' }));
    await setRefundQuantity(user, 'Canvas Tote Bag', '2');

    expect(screen.getByRole('alert')).toHaveTextContent("You can't refund more items than are left to refund.");
    expect(within(refundForm()).getByRole('button', { name: /^Refund \$/ })).toBeDisabled();
  });

  it('only offers the units that have not been refunded yet', async () => {
    const user = renderAt('/orders/ord_005');
    await user.click(screen.getByRole('button', { name: 'Refund' }));

    expect(within(refundForm()).getByText('of 1 (1 already refunded)')).toBeInTheDocument();
    await setRefundQuantity(user, 'Linen Throw Pillow', '2');
    expect(screen.getByRole('alert')).toHaveTextContent("You can't refund more items than are left to refund.");
  });

  it('refunds exactly the balance when everything left is returned', async () => {
    const user = renderAt('/orders/ord_005');
    await user.click(screen.getByRole('button', { name: 'Refund' }));
    await setRefundQuantity(user, 'Linen Throw Pillow', '1');
    await setRefundQuantity(user, 'Soy Wax Candle', '1');
    await user.click(screen.getByRole('checkbox', { name: /Refund shipping/ }));

    expect(within(refundForm()).getByText('$76.35 available')).toBeInTheDocument();
    await user.click(within(refundForm()).getByRole('button', { name: 'Refund $76.35' }));

    expect(screen.getByText('Refunded', { selector: '.badge' })).toBeInTheDocument();
    expect(paymentAmount('Net payment')).toBe('$0.00');
  });

  it('does not offer the same items or shipping again after a refund', async () => {
    const user = renderAt('/orders/ord_001');
    await user.click(screen.getByRole('button', { name: 'Refund' }));
    await setRefundQuantity(user, 'Canvas Tote Bag', '1');
    await user.click(screen.getByRole('checkbox', { name: /Refund shipping/ }));
    await user.click(within(refundForm()).getByRole('button', { name: /^Refund \$/ }));

    const items = within(screen.getByRole('region', { name: 'Items' }));
    expect(items.getByText('1 refunded')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Refund' }));
    expect(within(refundForm()).getByText('All 1 refunded')).toBeInTheDocument();
    expect(
      within(refundForm()).queryByRole('spinbutton', { name: 'Quantity of Canvas Tote Bag to refund' }),
    ).not.toBeInTheDocument();
    expect(within(refundForm()).queryByRole('checkbox', { name: /Refund shipping/ })).not.toBeInTheDocument();
  });

  it('closes the form without refunding when cancelled', async () => {
    const user = renderAt('/orders/ord_001');
    await user.click(screen.getByRole('button', { name: 'Refund' }));
    await setRefundQuantity(user, 'Classic Cotton T-Shirt', '1');
    await user.click(within(refundForm()).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('form', { name: 'Refund items' })).not.toBeInTheDocument();
    expect(screen.queryByText('Refunded', { selector: 'dt' })).not.toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });
});
