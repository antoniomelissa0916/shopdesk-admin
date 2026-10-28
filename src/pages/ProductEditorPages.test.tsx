import { render, screen } from '@testing-library/react';
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

describe('creating a product', () => {
  it('opens the form from the products page', async () => {
    const user = renderAt('/products');
    await user.click(screen.getByRole('link', { name: 'Add product' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Add product' })).toBeInTheDocument();
  });

  it('opens the new product after saving and adds it to the list', async () => {
    const user = renderAt('/products/new');
    await user.type(screen.getByLabelText(/^Title/), 'Recycled Notebook');
    await user.type(screen.getByLabelText(/^SKU/), 'st-ntb-011');
    await user.type(screen.getByLabelText(/^Price/), '12.50');
    await user.type(screen.getByLabelText(/^Category/), 'Stationery');
    await user.click(screen.getByRole('button', { name: 'Save product' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Recycled Notebook' })).toBeInTheDocument();
    expect(screen.getByText(/^ST-NTB-011 ·/)).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Back to products' }));
    expect(screen.getByText('11 products')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'notebook');
    expect(screen.getByRole('link', { name: 'Recycled Notebook' })).toBeInTheDocument();
  });

  it('returns to the list without saving when cancelled', async () => {
    const user = renderAt('/products/new');
    await user.type(screen.getByLabelText(/^Title/), 'Discarded');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('10 products')).toBeInTheDocument();
  });
});

describe('editing a product', () => {
  it('opens the form from the product page', async () => {
    const user = renderAt('/products');
    await user.click(screen.getByRole('link', { name: 'Canvas Tote Bag' }));
    await user.click(screen.getByRole('link', { name: 'Edit product' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Edit Canvas Tote Bag' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^SKU/)).toHaveValue('BG-TOT-003');
  });

  it('saves changes and returns to the product page', async () => {
    const user = renderAt('/products/prod_003/edit');
    const title = screen.getByLabelText(/^Title/);
    await user.clear(title);
    await user.type(title, 'Market Tote Bag');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Market Tote Bag' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Back to products' }));
    expect(screen.getByText('10 products')).toBeInTheDocument();
    // The renamed product sorts onto a later page, so search for it.
    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'tote');
    expect(screen.getByRole('link', { name: 'Market Tote Bag' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Canvas Tote Bag' })).not.toBeInTheDocument();
  });

  it('returns to the product page when cancelled', async () => {
    const user = renderAt('/products/prod_003/edit');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Canvas Tote Bag' })).toBeInTheDocument();
  });

  it('shows a not found message for an unknown product', () => {
    renderAt('/products/prod_404/edit');
    expect(screen.getByRole('heading', { name: 'Product not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all products' })).toHaveAttribute('href', '/products');
  });
});
