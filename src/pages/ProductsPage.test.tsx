import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../App';

function renderProductsPage() {
  render(
    <MemoryRouter initialEntries={['/products']}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

function visibleTitles(): string[] {
  const table = screen.queryByRole('table');
  if (!table) {
    return [];
  }
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getByRole('link').textContent ?? '');
}

function rowFor(title: string) {
  return screen.getByRole('link', { name: title }).closest('tr') as HTMLElement;
}

const searchBox = () => screen.getByRole('searchbox', { name: 'Search products' });
const summary = () => screen.getByText(/^Showing \d+–\d+ of \d+ products$/);

describe('ProductsPage', () => {
  describe('initial view', () => {
    it('shows the first page of products sorted by title', () => {
      renderProductsPage();
      expect(visibleTitles()).toEqual([
        'Canvas Tote Bag',
        'Ceramic Pour-Over Set',
        'Classic Cotton T-Shirt',
        'Everyday Hoodie',
        'Leather Card Wallet',
      ]);
      expect(summary()).toHaveTextContent('Showing 1–5 of 10 products');
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });

    it('shows status, stock, category, vendor and price for each product', () => {
      renderProductsPage();
      const pourOver = within(rowFor('Ceramic Pour-Over Set'));
      expect(pourOver.getByText('KT-POS-004')).toBeInTheDocument();
      expect(pourOver.getByText('Active')).toBeInTheDocument();
      expect(pourOver.getByText('Out of stock')).toBeInTheDocument();
      expect(pourOver.getByText('Kitchen')).toBeInTheDocument();
      expect(pourOver.getByText('Kiln & Co.')).toBeInTheDocument();
      expect(pourOver.getByText('$45.00')).toBeInTheDocument();
    });

    it('marks products at or below their low stock threshold', () => {
      renderProductsPage();
      expect(within(rowFor('Everyday Hoodie')).getByText('12 in stock (low)')).toBeInTheDocument();
      expect(within(rowFor('Canvas Tote Bag')).getByText('310 in stock')).toBeInTheDocument();
    });
  });

  describe('status tabs', () => {
    it('shows a count on each tab', () => {
      renderProductsPage();
      const expected = { All: '10', Active: '8', Draft: '1', Archived: '1' };
      for (const [label, count] of Object.entries(expected)) {
        const tab = screen.getByRole('tab', { name: new RegExp(`^${label}`) });
        expect(tab).toHaveTextContent(`${label}${count}`);
      }
    });

    it('starts on the All tab', () => {
      renderProductsPage();
      expect(screen.getByRole('tab', { name: /^All/ })).toHaveAttribute('aria-selected', 'true');
    });

    it('filters by the selected status', async () => {
      const user = renderProductsPage();
      await user.click(screen.getByRole('tab', { name: /^Draft/ }));

      expect(screen.getByRole('tab', { name: /^Draft/ })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: /^All/ })).toHaveAttribute('aria-selected', 'false');
      expect(visibleTitles()).toEqual(['Wool Beanie']);

      await user.click(screen.getByRole('tab', { name: /^Archived/ }));
      expect(visibleTitles()).toEqual(['Leather Card Wallet']);
      expect(within(rowFor('Leather Card Wallet')).getByText('Archived')).toBeInTheDocument();
    });
  });

  describe('search', () => {
    it('matches titles, SKUs and vendors', async () => {
      const user = renderProductsPage();

      await user.type(searchBox(), 'hoodie');
      expect(visibleTitles()).toEqual(['Everyday Hoodie']);

      await user.clear(searchBox());
      await user.type(searchBox(), 'KT-');
      expect(visibleTitles()).toEqual(['Ceramic Pour-Over Set', 'Stoneware Mug']);

      await user.clear(searchBox());
      await user.type(searchBox(), 'northwind');
      expect(visibleTitles()).toEqual(['Classic Cotton T-Shirt', 'Everyday Hoodie', 'Organic Cotton Socks (3-pack)']);
    });

    it('combines the search with the selected tab', async () => {
      const user = renderProductsPage();
      await user.type(searchBox(), 'harbor');
      expect(visibleTitles()).toEqual(['Canvas Tote Bag', 'Leather Card Wallet', 'Wool Beanie']);

      await user.click(screen.getByRole('tab', { name: /^Active/ }));
      expect(visibleTitles()).toEqual(['Canvas Tote Bag']);
    });

    it('shows an empty state and hides pagination when nothing matches', async () => {
      const user = renderProductsPage();
      await user.type(searchBox(), 'bicycle');

      expect(screen.getByText('No products match your filters.')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
    });

    it('clears the search with the clear button', async () => {
      const user = renderProductsPage();
      expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();

      await user.type(searchBox(), 'bicycle');
      await user.click(screen.getByRole('button', { name: 'Clear search' }));

      expect(searchBox()).toHaveValue('');
      expect(summary()).toHaveTextContent('Showing 1–5 of 10 products');
    });
  });

  describe('sorting', () => {
    it('sorts by price from a column header and reverses on a second click', async () => {
      const user = renderProductsPage();
      const priceHeader = () => screen.getByRole('columnheader', { name: /Price/ });

      await user.click(within(priceHeader()).getByRole('button'));
      expect(priceHeader()).toHaveAttribute('aria-sort', 'ascending');
      expect(visibleTitles()[0]).toBe('Organic Cotton Socks (3-pack)');

      await user.click(within(priceHeader()).getByRole('button'));
      expect(priceHeader()).toHaveAttribute('aria-sort', 'descending');
      expect(visibleTitles()).toEqual([
        'Everyday Hoodie',
        'Ceramic Pour-Over Set',
        'Leather Card Wallet',
        'Linen Throw Pillow',
        'Soy Wax Candle',
      ]);
      expect(screen.getByRole('columnheader', { name: /Product/ })).toHaveAttribute('aria-sort', 'none');
    });

    it('sorts by inventory from lowest to highest', async () => {
      const user = renderProductsPage();
      await user.click(within(screen.getByRole('columnheader', { name: /Inventory/ })).getByRole('button'));

      expect(visibleTitles()).toEqual([
        'Ceramic Pour-Over Set',
        'Leather Card Wallet',
        'Linen Throw Pillow',
        'Everyday Hoodie',
        'Wool Beanie',
      ]);
    });

    it('sorts from the dropdown and keeps it in sync with the headers', async () => {
      const user = renderProductsPage();
      const dropdown = screen.getByRole('combobox', { name: 'Sort products' });

      await user.selectOptions(dropdown, 'Newest first');
      expect(visibleTitles()).toEqual([
        'Organic Cotton Socks (3-pack)',
        'Soy Wax Candle',
        'Linen Throw Pillow',
        'Wool Beanie',
        'Stoneware Mug',
      ]);

      await user.click(within(screen.getByRole('columnheader', { name: /Price/ })).getByRole('button'));
      expect(dropdown).toHaveDisplayValue('Price: low to high');
    });
  });

  describe('pagination', () => {
    it('moves between pages', async () => {
      const user = renderProductsPage();
      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

      await user.click(screen.getByRole('button', { name: 'Next' }));
      expect(visibleTitles()).toEqual([
        'Linen Throw Pillow',
        'Organic Cotton Socks (3-pack)',
        'Soy Wax Candle',
        'Stoneware Mug',
        'Wool Beanie',
      ]);
      expect(summary()).toHaveTextContent('Showing 6–10 of 10 products');
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

      await user.click(screen.getByRole('button', { name: 'Previous' }));
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });

    it('shows more products per page when the page size changes', async () => {
      const user = renderProductsPage();
      await user.selectOptions(screen.getByRole('combobox', { name: 'Per page' }), '10');

      expect(visibleTitles()).toHaveLength(10);
      expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    });

    it('returns to the first page when the filters change', async () => {
      const user = renderProductsPage();
      await user.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: /^Active/ }));
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      expect(summary()).toHaveTextContent('Showing 1–5 of 8 products');
    });

    it('returns to the first page when the sort order changes', async () => {
      const user = renderProductsPage();
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await user.click(within(screen.getByRole('columnheader', { name: /Price/ })).getByRole('button'));

      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });
  });
});
