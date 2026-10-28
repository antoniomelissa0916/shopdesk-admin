import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../App';

function renderCustomersPage() {
  render(
    <MemoryRouter initialEntries={['/customers']}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

function visibleNames(): string[] {
  const table = screen.queryByRole('table');
  if (!table) {
    return [];
  }
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getByRole('link').textContent ?? '');
}

function rowFor(name: string) {
  return within(screen.getByRole('link', { name }).closest('tr') as HTMLElement);
}

const searchBox = () => screen.getByRole('searchbox', { name: 'Search customers' });

async function search(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.clear(searchBox());
  await user.type(searchBox(), text);
}

describe('CustomersPage', () => {
  describe('initial view', () => {
    it('shows the first page of customers sorted by last name', () => {
      renderCustomersPage();
      expect(screen.getByText('6 customers')).toBeInTheDocument();
      expect(visibleNames()).toEqual(['Maya Chen', 'Aisha Khan', 'Lucas Martin', 'Liam Okafor', 'Sofia Rossi']);
      expect(screen.getByText('Showing 1–5 of 6 customers')).toBeInTheDocument();
    });

    it('shows email, tags, subscription, location, orders and amount spent', () => {
      renderCustomersPage();
      const aisha = rowFor('Aisha Khan');
      expect(aisha.getByText('aisha.khan@example.com')).toBeInTheDocument();
      expect(aisha.getByText('vip')).toBeInTheDocument();
      expect(aisha.getByText('repeat')).toBeInTheDocument();
      expect(aisha.getByText('Not subscribed')).toBeInTheDocument();
      expect(aisha.getByText('Chicago, IL, US')).toBeInTheDocument();
      expect(aisha.getByText('1 order')).toBeInTheDocument();
      expect(aisha.getByText('$76.35')).toBeInTheDocument();
    });

    it('counts refunded orders but not the refunded money', () => {
      renderCustomersPage();
      const maya = rowFor('Maya Chen');
      expect(maya.getByText('2 orders')).toBeInTheDocument();
      expect(maya.getByText('$76.70')).toBeInTheDocument();
      expect(maya.getByText('Subscribed')).toBeInTheDocument();
    });

    it('links each customer to their page', () => {
      renderCustomersPage();
      expect(screen.getByRole('link', { name: 'Liam Okafor' })).toHaveAttribute('href', '/customers/cust_002');
    });
  });

  describe('subscription tabs', () => {
    it('shows a count on each tab', () => {
      renderCustomersPage();
      expect(screen.getByRole('tab', { name: /^All/ })).toHaveTextContent('All6');
      expect(screen.getByRole('tab', { name: /^Subscribed/ })).toHaveTextContent('Subscribed3');
      expect(screen.getByRole('tab', { name: /^Not subscribed/ })).toHaveTextContent('Not subscribed3');
    });

    it('filters by email subscription', async () => {
      const user = renderCustomersPage();
      await user.click(screen.getByRole('tab', { name: /^Subscribed/ }));
      expect(visibleNames()).toEqual(['Maya Chen', 'Sofia Rossi', 'Noah Williams']);

      await user.click(screen.getByRole('tab', { name: /^Not subscribed/ }));
      expect(visibleNames()).toEqual(['Aisha Khan', 'Lucas Martin', 'Liam Okafor']);
    });
  });

  describe('search', () => {
    it('finds customers by email, phone, city and tag', async () => {
      const user = renderCustomersPage();

      await search(user, 'okafor@');
      expect(visibleNames()).toEqual(['Liam Okafor']);

      await search(user, '555 0199');
      expect(visibleNames()).toEqual(['Sofia Rossi']);

      await search(user, 'austin');
      expect(visibleNames()).toEqual(['Lucas Martin']);

      await search(user, 'wholesale');
      expect(visibleNames()).toEqual(['Sofia Rossi']);
    });

    it('combines search with the selected tab', async () => {
      const user = renderCustomersPage();
      await search(user, 'vip');
      expect(visibleNames()).toEqual(['Maya Chen', 'Aisha Khan']);

      await user.click(screen.getByRole('tab', { name: /^Not subscribed/ }));
      expect(visibleNames()).toEqual(['Aisha Khan']);
    });

    it('shows an empty state and hides pagination when nothing matches', async () => {
      const user = renderCustomersPage();
      await search(user, 'nobody here');

      expect(screen.getByText('No customers match your filters.')).toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    const sortBy = (user: ReturnType<typeof userEvent.setup>, label: string) =>
      user.selectOptions(screen.getByRole('combobox', { name: 'Sort customers' }), label);

    it('sorts by amount spent', async () => {
      const user = renderCustomersPage();
      await sortBy(user, 'Amount spent: high to low');
      expect(visibleNames()).toEqual(['Sofia Rossi', 'Lucas Martin', 'Maya Chen', 'Aisha Khan', 'Liam Okafor']);

      await sortBy(user, 'Amount spent: low to high');
      expect(visibleNames()[0]).toBe('Noah Williams');
    });

    it('sorts by newest customers', async () => {
      const user = renderCustomersPage();
      await sortBy(user, 'Newest customers');
      expect(visibleNames()).toEqual(['Lucas Martin', 'Aisha Khan', 'Noah Williams', 'Sofia Rossi', 'Liam Okafor']);
    });

    it('sorts by most orders', async () => {
      const user = renderCustomersPage();
      await sortBy(user, 'Most orders');
      expect(visibleNames()[0]).toBe('Maya Chen');
    });

    it('sorts by last name in reverse', async () => {
      const user = renderCustomersPage();
      await sortBy(user, 'Last name Z–A');
      expect(visibleNames()[0]).toBe('Noah Williams');
    });
  });

  describe('pagination', () => {
    it('shows the remaining customers on the next page', async () => {
      const user = renderCustomersPage();
      await user.click(screen.getByRole('button', { name: 'Next' }));

      expect(visibleNames()).toEqual(['Noah Williams']);
      expect(screen.getByText('Showing 6–6 of 6 customers')).toBeInTheDocument();
    });

    it('returns to the first page when the tab or sort changes', async () => {
      const user = renderCustomersPage();
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await user.click(screen.getByRole('tab', { name: /^Subscribed/ }));
      expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: /^All/ }));
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await user.selectOptions(screen.getByRole('combobox', { name: 'Sort customers' }), 'Most orders');
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });
  });
});
