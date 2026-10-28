import type { ProductStatus } from '../types';
import StatusBadge, { type BadgeTone } from './StatusBadge';

const STATUS_TONES: Record<ProductStatus, BadgeTone> = {
  active: 'success',
  draft: 'info',
  archived: 'neutral',
};

const STATUS_LABELS: Record<ProductStatus, string> = {
  active: 'Active',
  draft: 'Draft',
  archived: 'Archived',
};

export default function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <StatusBadge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</StatusBadge>;
}
