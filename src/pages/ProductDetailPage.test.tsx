import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../App';

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function valueOf(section: HTMLElement, label: string) {
  const term = within(section).getByText(label, { selector: 'dt' });
  return term.nextElementSibling?.textContent;
}

describe('ProductDetailPage', () => {
  it('shows the product header and edit link', () => {
    renderAt('/products/prod_001');
    expect(screen.getByRole('heading', { level: 1, name: 'Classic Cotton T-Shirt' })).toBeInTheDocument();
    expect(screen.getByText('TS-CLS-001 · Added Jun 2, 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit product' })).toHaveAttribute('href', '/products/prod_001/edit');
  });

  it('shows pricing with discount, profit and margin', () => {
    renderAt('/products/prod_001');
    const pricing = screen.getByRole('region', { name: 'Pricing' });

    expect(valueOf(pricing, 'Price')).toBe('$24.00');
    expect(valueOf(pricing, 'Compare-at price')).toBe('$30.00 20% off');
    expect(valueOf(pricing, 'Cost per item')).toBe('$9.00');
    expect(valueOf(pricing, 'Profit per item')).toBe('$15.00');
    expect(valueOf(pricing, 'Margin')).toBe('62.5%');
  });

  it('shows a dash when there is no compare-at price', () => {
    renderAt('/products/prod_002');
    const pricing = screen.getByRole('region', { name: 'Pricing' });
    expect(valueOf(pricing, 'Compare-at price')).toBe('—');
  });

  it('shows sales totals and the orders the product appears in', () => {
    renderAt('/products/prod_001');
    const sales = screen.getByRole('region', { name: 'Sales' });

    expect(valueOf(sales, 'Units sold')).toBe('3');
    expect(valueOf(sales, 'Revenue')).toBe('$72.00');
    expect(valueOf(sales, 'Orders')).toBe('2');

    const rows = within(sales).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual(['#1007', '#1001']);
  });

  it('shows a message for a product that has never been ordered', () => {
    renderAt('/products/prod_006');
    expect(screen.getByText("This product hasn't been ordered yet.")).toBeInTheDocument();
  });

  it('shows stock level and status', () => {
    renderAt('/products/prod_004');
    const inventory = screen.getByRole('region', { name: 'Inventory' });
    expect(within(inventory).getByText('Out of stock')).toBeInTheDocument();
    expect(within(inventory).getByText('Low stock alert at 5 units.')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Status' })).getByText('Active')).toBeInTheDocument();
  });

  it('links to the product page from the products list', () => {
    renderAt('/products');
    expect(screen.getByRole('link', { name: 'Canvas Tote Bag' })).toHaveAttribute('href', '/products/prod_003');
  });

  it('shows a not found message for an unknown product', () => {
    renderAt('/products/prod_404');
    expect(screen.getByRole('heading', { name: 'Product not found' })).toBeInTheDocument();
  });
});
