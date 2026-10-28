import type { FulfillmentStatus, PaymentStatus } from '../types';
import { FULFILLMENT_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../lib/orders';
import StatusBadge, { type BadgeTone } from './StatusBadge';

const PAYMENT_TONES: Record<PaymentStatus, BadgeTone> = {
  pending: 'warning',
  paid: 'neutral',
  partially_refunded: 'info',
  refunded: 'neutral',
};

const FULFILLMENT_TONES: Record<FulfillmentStatus, BadgeTone> = {
  unfulfilled: 'warning',
  partial: 'info',
  fulfilled: 'success',
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <StatusBadge tone={PAYMENT_TONES[status]}>{PAYMENT_STATUS_LABELS[status]}</StatusBadge>;
}

export function FulfillmentStatusBadge({ status }: { status: FulfillmentStatus }) {
  return <StatusBadge tone={FULFILLMENT_TONES[status]}>{FULFILLMENT_STATUS_LABELS[status]}</StatusBadge>;
}
