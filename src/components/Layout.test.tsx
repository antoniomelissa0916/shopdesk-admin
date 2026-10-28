import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../App';

afterEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

function renderApp() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
}

describe('Layout', () => {
  it('gives every sidebar link a decorative icon without changing its name', () => {
    renderApp();
    const links = within(screen.getByRole('navigation', { name: 'Main' })).getAllByRole('link');

    expect(links.map((link) => link.querySelector('svg')?.getAttribute('data-icon'))).toEqual([
      'home',
      'orders',
      'products',
      'customers',
      'discounts',
    ]);
    for (const link of links) {
      expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    }
    expect(links.map((link) => link.textContent)).toEqual([
      'Home',
      'Orders',
      'Products3 low stock alerts',
      'Customers',
      'Discounts',
    ]);
  });

  it('shows the store name and the theme switch in the top bar', () => {
    renderApp();
    const header = within(screen.getByRole('banner'));
    expect(header.getByText('ShopDesk Store')).toBeInTheDocument();
    expect(header.getByRole('button', { name: /^Switch to (dark|light) mode$/ })).toBeInTheDocument();
  });
});
