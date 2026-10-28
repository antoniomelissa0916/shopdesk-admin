import Icon, { type IconName } from './Icon';

interface StatTileProps {
  label: string;
  value: string;
  /** Percentage change against the previous period, or null when there is nothing to compare with. */
  change: number | null;
  comparisonLabel: string;
  /** Whether a rise is good news (sales) or bad news (refunds). */
  upIsGood?: boolean;
  icon?: IconName;
}

export default function StatTile({ label, value, change, comparisonLabel, upIsGood = true, icon }: StatTileProps) {
  let delta;
  if (change === null) {
    delta = <span className="stat-delta">No data for {comparisonLabel}</span>;
  } else {
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
    const tone =
      direction === 'flat' ? 'neutral' : (direction === 'up') === upIsGood ? 'good' : 'bad';
    const arrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '–';
    const words = direction === 'up' ? 'Up' : direction === 'down' ? 'Down' : 'No change';
    delta = (
      <span className={`stat-delta stat-delta-${tone}`}>
        <span aria-hidden="true">{arrow} </span>
        <span className="visually-hidden">{words} </span>
        {Math.abs(change)}% vs {comparisonLabel}
      </span>
    );
  }

  return (
    <div className="card stat-tile" role="group" aria-label={label}>
      <span className="stat-label">
        {icon && (
          <span className="stat-icon">
            <Icon name={icon} size={16} />
          </span>
        )}
        {label}
      </span>
      <span className="stat-value">{value}</span>
      {delta}
    </div>
  );
}
