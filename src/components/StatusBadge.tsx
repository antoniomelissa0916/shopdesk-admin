export type BadgeTone = 'success' | 'info' | 'warning' | 'critical' | 'neutral';

interface StatusBadgeProps {
  tone: BadgeTone;
  children: string;
}

export default function StatusBadge({ tone, children }: StatusBadgeProps) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
