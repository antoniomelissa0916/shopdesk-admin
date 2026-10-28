import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { paginate } from '../lib/pagination';
import Pagination from './Pagination';

const items = Array.from({ length: 12 }, (_, index) => index + 1);

describe('Pagination', () => {
  it('summarises the current page', () => {
    render(<Pagination page={paginate(items, 2, 5)} onPageChange={vi.fn()} itemLabel="orders" />);
    expect(screen.getByText('Showing 6–10 of 12 orders')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('reports the requested page when a button is clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={paginate(items, 2, 5)} onPageChange={onPageChange} />);

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange.mock.calls).toEqual([[3], [1]]);
  });

  it('disables both buttons when everything fits on one page', () => {
    render(<Pagination page={paginate(items, 1, 25)} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('describes an empty list', () => {
    render(<Pagination page={paginate([], 1, 5)} onPageChange={vi.fn()} itemLabel="customers" />);
    expect(screen.getByText('No customers')).toBeInTheDocument();
  });

  it('only shows the page size selector when it can be changed', async () => {
    const user = userEvent.setup();
    const onPageSizeChange = vi.fn();
    const { rerender } = render(<Pagination page={paginate(items, 1, 5)} onPageChange={vi.fn()} />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    rerender(
      <Pagination
        page={paginate(items, 1, 5)}
        onPageChange={vi.fn()}
        pageSizeOptions={[5, 10]}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    await user.selectOptions(screen.getByRole('combobox', { name: 'Per page' }), '10');
    expect(onPageSizeChange).toHaveBeenCalledWith(10);
  });
});
