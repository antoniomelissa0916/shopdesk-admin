import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

// Discount statuses depend on today's date, so pin the clock. Only Date is
// faked so user-event's timers keep working.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

function discountRow(code: string) {
  return within(screen.getByText(code, { selector: '.cell-title' }).closest('tr') as HTMLElement);
}

function visibleCodes() {
  return Array.from(document.querySelectorAll('tbody .cell-title')).map((cell) => cell.textContent);
}

function paymentRow(label: string) {
  const payment = screen.getByRole('region', { name: 'Payment' });
  const row = within(payment).getByText(label, { selector: 'dt' }).parentElement as HTMLElement;
  return Array.from(row.querySelectorAll('dd')).map((dd) => dd.textContent);
}

describe('DiscountsPage', () => {
  it('lists every code with its status, dates and usage', () => {
    renderAt('/discounts');
    expect(screen.getByText('6 discount codes')).toBeInTheDocument();

    const fall = discountRow('FALL15');
    expect(fall.getByText('$15.00 off orders of $75.00 or more')).toBeInTheDocument();
    expect(fall.getByText('Active')).toBeInTheDocument();
    expect(fall.getByText('Sep 1, 2026 – Oct 31, 2026')).toBeInTheDocument();
    expect(fall.getByText('1 / 100 used')).toBeInTheDocument();

    expect(discountRow('SUMMER25').getByText('Expired')).toBeInTheDocument();
    expect(discountRow('LAUNCH5').getByText('Limit reached')).toBeInTheDocument();
    expect(discountRow('HOLIDAY30').getByText('Scheduled')).toBeInTheDocument();
  });

  it('filters by status', async () => {
    const user = renderAt('/discounts');
    expect(screen.getByRole('tab', { name: /^Active/ })).toHaveTextContent('Active3');

    await user.click(screen.getByRole('tab', { name: /^Expired/ }));
    expect(visibleCodes()).toEqual(['SUMMER25']);

    await user.click(screen.getByRole('tab', { name: /^Scheduled/ }));
    expect(visibleCodes()).toEqual(['HOLIDAY30']);
  });

  it('is reachable from the sidebar', async () => {
    const user = renderAt('/');
    await user.click(screen.getByRole('link', { name: 'Discounts' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Discounts' })).toBeInTheDocument();
  });
});

describe('creating a discount', () => {
  it('adds a new active code to the list', async () => {
    const user = renderAt('/discounts');
    await user.click(screen.getByRole('link', { name: 'Create discount' }));

    expect(screen.getByLabelText(/^Start date/)).toHaveValue('2026-09-30');
    await user.type(screen.getByLabelText(/^Discount code/), 'spring12');
    await user.type(screen.getByRole('textbox', { name: /^Percentage/ }), '12');
    await user.type(screen.getByLabelText('Usage limit'), '200');
    await user.click(screen.getByRole('button', { name: 'Save discount' }));

    expect(screen.getByText('7 discount codes')).toBeInTheDocument();
    const spring = discountRow('SPRING12');
    expect(spring.getByText('12% off')).toBeInTheDocument();
    expect(spring.getByText('Active')).toBeInTheDocument();
    expect(spring.getByText('0 / 200 used')).toBeInTheDocument();
  });

  it('creates a fixed amount code with a minimum spend', async () => {
    const user = renderAt('/discounts/new');
    await user.type(screen.getByLabelText(/^Discount code/), 'TENOFF');
    await user.click(screen.getByRole('radio', { name: 'Fixed amount off' }));
    await user.type(screen.getByRole('textbox', { name: /^Amount/ }), '10');
    await user.type(screen.getByLabelText('Minimum subtotal'), '60');
    await user.click(screen.getByRole('button', { name: 'Save discount' }));

    expect(discountRow('TENOFF').getByText('$10.00 off orders of $60.00 or more')).toBeInTheDocument();
  });

  it('shows errors and stays on the form when the input is invalid', async () => {
    const user = renderAt('/discounts/new');
    await user.type(screen.getByLabelText(/^Discount code/), 'welcome10');
    await user.type(screen.getByRole('textbox', { name: /^Percentage/ }), '150');
    await user.click(screen.getByRole('button', { name: 'Save discount' }));

    expect(screen.getByText('A discount with this code already exists.')).toBeInTheDocument();
    expect(screen.getByText('Enter a whole percentage from 1 to 100.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Create discount' })).toBeInTheDocument();
  });
});

describe('applying a discount to an order', () => {
  it('is only offered on orders awaiting payment', () => {
    renderAt('/orders/ord_001');
    expect(screen.queryByRole('form', { name: 'Apply discount' })).not.toBeInTheDocument();
  });

  it('applies a code and recalculates the totals', async () => {
    const user = renderAt('/orders/ord_004');
    expect(paymentRow('Total')).toEqual(['', '$97.61']);

    await user.type(screen.getByLabelText('Discount code'), 'fall15');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(screen.getByRole('status')).toHaveTextContent('Discount FALL15 applied.');
    expect(paymentRow('Discount')).toEqual(['FALL15 Remove', '−$15.00']);
    // ($84.00 − $15.00) + 10.25% tax + $5.00 shipping.
    expect(paymentRow('Total')).toEqual(['', '$81.07']);
    expect(screen.queryByRole('form', { name: 'Apply discount' })).not.toBeInTheDocument();
  });

  it('counts the use on the discounts page', async () => {
    const user = renderAt('/orders/ord_004');
    await user.type(screen.getByLabelText('Discount code'), 'FALL15');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    await user.click(screen.getByRole('link', { name: 'Discounts' }));

    expect(discountRow('FALL15').getByText('2 / 100 used')).toBeInTheDocument();
  });

  it('explains why a code cannot be used', async () => {
    const user = renderAt('/orders/ord_004');
    const input = screen.getByLabelText('Discount code');

    await user.type(input, 'WHOLESALE20');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByText('This code needs a subtotal of $150.00 or more. Add $66.00 to use it.')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');

    await user.clear(input);
    await user.type(input, 'SUMMER25');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByText('This code expired on Aug 31, 2026.')).toBeInTheDocument();
    expect(paymentRow('Total')).toEqual(['', '$97.61']);
  });

  it('removes a discount and gives the use back', async () => {
    const user = renderAt('/orders/ord_004');
    await user.type(screen.getByLabelText('Discount code'), 'FALL15');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(screen.getByRole('status')).toHaveTextContent('Discount removed.');
    expect(paymentRow('Total')).toEqual(['', '$97.61']);
    expect(screen.getByRole('form', { name: 'Apply discount' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Discounts' }));
    expect(discountRow('FALL15').getByText('1 / 100 used')).toBeInTheDocument();
  });
});
