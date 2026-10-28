import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Tabs from './Tabs';

type Id = 'open' | 'closed';

const tabs = [
  { id: 'open' as Id, label: 'Open', count: 4 },
  { id: 'closed' as Id, label: 'Closed' },
];

describe('Tabs', () => {
  it('renders a labelled tab list with counts where given', () => {
    render(<Tabs tabs={tabs} selected="open" onSelect={vi.fn()} label="Filter tickets" />);

    expect(screen.getByRole('tablist', { name: 'Filter tickets' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Open/ })).toHaveTextContent('Open4');
    expect(screen.getByRole('tab', { name: 'Closed' })).toHaveTextContent(/^Closed$/);
  });

  it('marks only the selected tab', () => {
    render(<Tabs tabs={tabs} selected="closed" onSelect={vi.fn()} label="Filter tickets" />);

    expect(screen.getByRole('tab', { name: 'Closed' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /^Open/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('reports the id of the clicked tab', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Tabs tabs={tabs} selected="open" onSelect={onSelect} label="Filter tickets" />);

    await user.click(screen.getByRole('tab', { name: 'Closed' }));
    expect(onSelect).toHaveBeenCalledWith('closed');
  });
});
