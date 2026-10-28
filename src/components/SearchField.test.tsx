import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SearchField from './SearchField';

function ControlledSearch({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <SearchField
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      label="Search items"
      placeholder="Search"
    />
  );
}

describe('SearchField', () => {
  it('is labelled for assistive technology', () => {
    render(<ControlledSearch />);
    expect(screen.getByRole('searchbox', { name: 'Search items' })).toHaveAttribute('placeholder', 'Search');
  });

  it('reports each change as the user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledSearch onChange={onChange} />);

    await user.type(screen.getByRole('searchbox'), 'mug');
    expect(onChange).toHaveBeenLastCalledWith('mug');
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('only shows the clear button when there is text', async () => {
    const user = userEvent.setup();
    render(<ControlledSearch />);
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();

    await user.type(screen.getByRole('searchbox'), 'mug');
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument();
  });

  it('empties the field when cleared', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledSearch onChange={onChange} />);

    await user.type(screen.getByRole('searchbox'), 'mug');
    await user.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(onChange).toHaveBeenLastCalledWith('');
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });
});
