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

type User = ReturnType<typeof userEvent.setup>;

const inventory = () => within(screen.getByRole('region', { name: 'Inventory' }));

async function openAdjust(user: User) {
  await user.click(inventory().getByRole('button', { name: 'Adjust' }));
}

async function fillAdjust(user: User, change: string, quantity: string, reason?: string) {
  await user.selectOptions(screen.getByLabelText('Change'), change);
  await user.type(screen.getByLabelText('Quantity'), quantity);
  if (reason) {
    await user.selectOptions(screen.getByLabelText('Reason'), reason);
  }
}

describe('adjusting inventory', () => {
  it('adds stock and records the change', async () => {
    const user = renderAt('/products/prod_002');
    expect(inventory().getByText('12 in stock (low)')).toBeInTheDocument();

    await openAdjust(user);
    await fillAdjust(user, 'Add stock', '24');
    expect(screen.getByText('12 → 36')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(inventory().getByText('36 in stock')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Adjust stock' })).not.toBeInTheDocument();
    const history = within(screen.getByRole('list', { name: 'Recent stock changes' }));
    expect(history.getByText('+24')).toBeInTheDocument();
    expect(history.getByText('Received new stock')).toBeInTheDocument();
  });

  it('lists the newest change first', async () => {
    const user = renderAt('/products/prod_005');
    await openAdjust(user);
    await fillAdjust(user, 'Add stock', '10');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await openAdjust(user);
    await fillAdjust(user, 'Remove stock', '3', 'Damaged or lost');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const items = within(screen.getByRole('list', { name: 'Recent stock changes' })).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      '-3Damaged or lost74 → 71',
      '+10Received new stock64 → 74',
    ]);
  });

  it('sets an exact quantity after a stock count', async () => {
    const user = renderAt('/products/prod_002');
    await openAdjust(user);
    await fillAdjust(user, 'Set quantity to', '0', 'Stock count correction');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(inventory().getByText('Out of stock')).toBeInTheDocument();
    expect(screen.getByText('-12')).toBeInTheDocument();
  });

  it('restocks an out of stock product into the low stock range', async () => {
    const user = renderAt('/products/prod_004');
    await openAdjust(user);
    await fillAdjust(user, 'Add stock', '5');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(inventory().getByText('5 in stock (low)')).toBeInTheDocument();
  });

  it('blocks removing more than is in stock', async () => {
    const user = renderAt('/products/prod_002');
    await openAdjust(user);
    await fillAdjust(user, 'Remove stock', '13');

    expect(screen.getByText("Only 12 in stock, so you can't remove 13.")).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('keeps Save disabled until a quantity is entered', async () => {
    const user = renderAt('/products/prod_002');
    await openAdjust(user);

    expect(screen.getByText('Currently 12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('closes without changing stock when cancelled', async () => {
    const user = renderAt('/products/prod_002');
    await openAdjust(user);
    await fillAdjust(user, 'Add stock', '5');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(inventory().getByText('12 in stock (low)')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Recent stock changes' })).not.toBeInTheDocument();
  });

  it('shows the new stock level on the products list', async () => {
    const user = renderAt('/products/prod_002');
    await openAdjust(user);
    await fillAdjust(user, 'Add stock', '100');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('link', { name: 'Back to products' }));

    const row = screen.getByRole('link', { name: 'Everyday Hoodie' }).closest('tr') as HTMLElement;
    expect(within(row).getByText('112 in stock')).toBeInTheDocument();
  });
});
