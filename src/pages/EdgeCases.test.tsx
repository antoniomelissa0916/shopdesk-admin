// Edge cases that only show up when pages and stores work together.
import { fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { useDiscounts } from '../store/DiscountsContext';
import { useOrders } from '../store/OrdersContext';
import { useProducts } from '../store/ProductsContext';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe('stores', () => {
  it('explain clearly when used outside their provider', () => {
    // React reports the thrown error to the console and to jsdom as an
    // uncaught error; silence both to keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const swallow = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener('error', swallow);
    try {
      expect(() => renderHook(() => useProducts())).toThrow('useProducts must be used inside a ProductsProvider.');
      expect(() => renderHook(() => useOrders())).toThrow('useOrders must be used inside an OrdersProvider.');
      expect(() => renderHook(() => useDiscounts())).toThrow(
        'useDiscounts must be used inside a DiscountsProvider.',
      );
    } finally {
      window.removeEventListener('error', swallow);
    }
  });
});

describe('routing', () => {
  it('shows the not found page for unknown paths below a section', () => {
    renderAt('/products/prod_001/unknown');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});

describe('changing a product', () => {
  it('does not change the prices on past orders', async () => {
    const user = renderAt('/products/prod_002/edit');
    const price = screen.getByLabelText(/^Price/);
    await user.clear(price);
    await user.type(price, '99');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(within(screen.getByRole('region', { name: 'Pricing' })).getByText('$99.00')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: '#1002' }));
    const items = within(screen.getByRole('region', { name: 'Items' }));
    expect(items.getAllByText('$58.00')).toHaveLength(2);
    expect(screen.getByRole('region', { name: 'Payment' })).toHaveTextContent('$70.99');
  });

  it('clears its stock alert when it is archived', async () => {
    const user = renderAt('/products/prod_007/edit');
    await user.selectOptions(screen.getByLabelText('Status'), 'Archived');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await user.click(screen.getByRole('link', { name: 'Home' }));

    const alerts = within(screen.getByRole('region', { name: /^Inventory alerts/ }));
    expect(alerts.getByText('2 products')).toBeInTheDocument();
    expect(alerts.queryByRole('link', { name: 'Linen Throw Pillow' })).not.toBeInTheDocument();
  });
});

describe('searching', () => {
  it('finds products with brackets in their names', async () => {
    const user = renderAt('/products');
    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), '(3-pack)');
    expect(screen.getByRole('link', { name: 'Organic Cotton Socks (3-pack)' })).toBeInTheDocument();
    expect(screen.getByText('Showing 1–1 of 1 products')).toBeInTheDocument();
  });

  it('shows every order when only a hash is typed', async () => {
    const user = renderAt('/orders');
    await user.type(screen.getByRole('searchbox', { name: 'Search orders' }), '#');
    expect(screen.getByText('Showing 1–5 of 7 orders')).toBeInTheDocument();
  });
});

describe('refund form input', () => {
  it('explains that quantities must be whole numbers', async () => {
    const user = renderAt('/orders/ord_001');
    await user.click(screen.getByRole('button', { name: 'Refund' }));
    const quantity = screen.getByRole('spinbutton', { name: 'Quantity of Classic Cotton T-Shirt to refund' });
    await user.clear(quantity);
    await user.type(quantity, '1.5');

    expect(screen.getByRole('alert')).toHaveTextContent('Enter whole numbers of 0 or more for quantities.');
    expect(screen.getByRole('button', { name: /^Refund \$/ })).toBeDisabled();
  });
});

describe('discounts with past dates', () => {
  it('lists a code whose dates have already passed as expired', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));
    const user = renderAt('/discounts/new');

    await user.type(screen.getByLabelText(/^Discount code/), 'AUGUST10');
    await user.type(screen.getByRole('textbox', { name: /^Percentage/ }), '10');
    // Date inputs are set directly, since typing into them character by character is not supported in jsdom.
    fireEvent.change(screen.getByLabelText(/^Start date/), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-08-31' } });
    await user.click(screen.getByRole('button', { name: 'Save discount' }));

    await user.click(screen.getByRole('tab', { name: /^Expired/ }));
    expect(screen.getByText('AUGUST10')).toBeInTheDocument();
    expect(screen.getByText('Aug 1, 2026 – Aug 31, 2026')).toBeInTheDocument();
  });
});
