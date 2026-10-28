import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatTile from './StatTile';

function delta() {
  return screen.getByText(/vs last week|No data/);
}

describe('StatTile', () => {
  it('shows the label and value as a labelled group', () => {
    render(<StatTile label="Net sales" value="$105.00" change={12.5} comparisonLabel="last week" />);
    const tile = screen.getByRole('group', { name: 'Net sales' });
    expect(tile).toHaveTextContent('Net sales');
    expect(tile).toHaveTextContent('$105.00');
  });

  it('marks a rise as good news by default, in words as well as colour', () => {
    render(<StatTile label="Orders" value="12" change={12.5} comparisonLabel="last week" />);
    expect(delta()).toHaveTextContent('Up 12.5% vs last week');
    expect(delta()).toHaveClass('stat-delta-good');
  });

  it('marks a fall as bad news', () => {
    render(<StatTile label="Orders" value="4" change={-50} comparisonLabel="last week" />);
    expect(delta()).toHaveTextContent('Down 50% vs last week');
    expect(delta()).toHaveClass('stat-delta-bad');
  });

  it('treats a rise as bad news when up is not good', () => {
    render(<StatTile label="Refunds" value="$70.18" change={20} comparisonLabel="last week" upIsGood={false} />);
    expect(delta()).toHaveClass('stat-delta-bad');
  });

  it('stays neutral when nothing changed', () => {
    render(<StatTile label="Orders" value="4" change={0} comparisonLabel="last week" />);
    expect(delta()).toHaveTextContent('No change 0% vs last week');
    expect(delta()).toHaveClass('stat-delta-neutral');
  });

  it('says when there is nothing to compare with', () => {
    render(<StatTile label="Orders" value="4" change={null} comparisonLabel="last week" />);
    expect(delta()).toHaveTextContent('No data for last week');
  });
});
