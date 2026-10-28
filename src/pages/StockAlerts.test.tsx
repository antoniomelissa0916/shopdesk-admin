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

const alertsCard = () => within(screen.getByRole('region', { name: /^Inventory alerts/ }));

function alertRows() {
  return alertsCard()
    .getAllByRole('row')
    .slice(1)
    .map((row) => Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent));
}

async function restock(user: ReturnType<typeof userEvent.setup>, quantity: string) {
  const inventory = within(screen.getByRole('region', { name: 'Inventory' }));
  await user.click(inventory.getByRole('button', { name: 'Adjust' }));
  await user.type(screen.getByLabelText('Quantity'), quantity);
  await user.click(screen.getByRole('button', { name: 'Save' }));
}

describe('low stock alerts', () => {
  it('lists products that need restocking on the home page', () => {
    renderAt('/');
    expect(alertsCard().getByText('3 products')).toBeInTheDocument();
    expect(alertRows()).toEqual([
      ['Ceramic Pour-Over SetKT-POS-004', 'Out of stock', '5', '10'],
      ['Linen Throw PillowHM-PIL-007', '8 in stock (low)', '10', '12'],
      ['Everyday HoodieHD-EVD-002', '12 in stock (low)', '15', '18'],
    ]);
  });

  it('links each alert to its product', async () => {
    const user = renderAt('/');
    await user.click(alertsCard().getByRole('link', { name: 'Linen Throw Pillow' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Linen Throw Pillow' })).toBeInTheDocument();
  });

  it('shows the number of alerts on the Products link', () => {
    renderAt('/');
    const productsLink = within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', {
      name: /^Products/,
    });
    expect(productsLink).toHaveAccessibleName('Products 3 low stock alerts');
  });

  it('clears an alert once the product is restocked', async () => {
    const user = renderAt('/products/prod_004');
    await restock(user, '20');
    await user.click(screen.getByRole('link', { name: 'Home' }));

    expect(alertsCard().getByText('2 products')).toBeInTheDocument();
    expect(alertsCard().queryByRole('link', { name: 'Ceramic Pour-Over Set' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Products/ })).toHaveAccessibleName('Products 2 low stock alerts');
  });

  it('shows an all-clear message and hides the badge when nothing is low', async () => {
    const user = renderAt('/');
    for (const title of ['Ceramic Pour-Over Set', 'Linen Throw Pillow', 'Everyday Hoodie']) {
      await user.click(alertsCard().getByRole('link', { name: title }));
      await restock(user, '20');
      await user.click(screen.getByRole('link', { name: 'Home' }));
    }

    expect(alertsCard().getByText('All active products are well stocked.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Products' })).toBeInTheDocument();
  });
});
