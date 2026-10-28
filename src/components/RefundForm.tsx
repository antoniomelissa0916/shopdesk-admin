import { useState, type FormEvent } from 'react';
import { formatMoney } from '../lib/format';
import type { OrderTotals } from '../lib/orderTotals';
import {
  calculateRefund,
  getRefundableCents,
  getRemainingQuantity,
  REFUND_ERROR_MESSAGES,
  validateRefund,
  type RefundRequest,
} from '../lib/refunds';
import type { Order } from '../types';

interface RefundFormProps {
  order: Order;
  totals: OrderTotals;
  onRefund: (amountCents: number, request: RefundRequest) => void;
  onCancel: () => void;
}

/** Empty inputs count as zero; anything that is not a number stays NaN so validation can reject it. */
function toQuantity(input: string): number {
  return input.trim() === '' ? 0 : Number(input);
}

export default function RefundForm({ order, totals, onRefund, onCancel }: RefundFormProps) {
  const [quantities, setQuantities] = useState<string[]>(() => order.lineItems.map(() => '0'));
  const [refundShipping, setRefundShipping] = useState(false);

  const request: RefundRequest = {
    lines: quantities.map((value, lineIndex) => ({ lineIndex, quantity: toQuantity(value) })),
    refundShipping,
  };
  const breakdown = calculateRefund(order, totals, request);
  const error = validateRefund(order, totals, request, breakdown.totalCents);
  const refundable = getRefundableCents(totals.totalCents, order.refundedCents);

  function setQuantity(index: number, value: string) {
    setQuantities((current) => current.map((existing, i) => (i === index ? value : existing)));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!error && breakdown.totalCents > 0) {
      onRefund(breakdown.totalCents, request);
    }
  }

  return (
    <form className="card detail-section refund-form" aria-labelledby="refund-heading" onSubmit={handleSubmit}>
      <h2 id="refund-heading">Refund items</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Product</th>
            <th scope="col" className="numeric">
              Price
            </th>
            <th scope="col" className="numeric">
              Quantity to refund
            </th>
          </tr>
        </thead>
        <tbody>
          {order.lineItems.map((item, index) => {
            const remaining = getRemainingQuantity(item);
            return (
              <tr key={`${item.productId}-${index}`}>
                <td>
                  <div className="cell-title">{item.title}</div>
                  <div className="cell-subtitle">{item.sku}</div>
                </td>
                <td className="numeric">{formatMoney(item.unitPriceCents)}</td>
                <td className="numeric">
                  {remaining === 0 ? (
                    <span className="detail-note">All {item.quantity} refunded</span>
                  ) : (
                    <>
                      <input
                        type="number"
                        className="quantity-input"
                        min={0}
                        max={remaining}
                        step={1}
                        aria-label={`Quantity of ${item.title} to refund`}
                        value={quantities[index]}
                        onChange={(event) => setQuantity(index, event.target.value)}
                      />{' '}
                      <span className="detail-note">
                        of {remaining}
                        {remaining < item.quantity && ` (${item.quantity - remaining} already refunded)`}
                      </span>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totals.shippingCents > 0 && !order.shippingRefunded && (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={refundShipping}
            onChange={(event) => setRefundShipping(event.target.checked)}
          />
          Refund shipping ({formatMoney(totals.shippingCents)})
        </label>
      )}

      <dl className="summary-list" aria-label="Refund summary">
        <div>
          <dt>Items</dt>
          <dd className="summary-detail" />
          <dd>{formatMoney(breakdown.itemsCents)}</dd>
        </div>
        {breakdown.discountCents > 0 && (
          <div>
            <dt>Discount</dt>
            <dd className="summary-detail">{order.discountCode}</dd>
            <dd>−{formatMoney(breakdown.discountCents)}</dd>
          </div>
        )}
        <div>
          <dt>Tax</dt>
          <dd className="summary-detail" />
          <dd>{formatMoney(breakdown.taxCents)}</dd>
        </div>
        {breakdown.shippingCents > 0 && (
          <div>
            <dt>Shipping</dt>
            <dd className="summary-detail" />
            <dd>{formatMoney(breakdown.shippingCents)}</dd>
          </div>
        )}
        <div className="summary-total">
          <dt>Refund amount</dt>
          <dd className="summary-detail">{formatMoney(refundable)} available</dd>
          <dd>{formatMoney(breakdown.totalCents)}</dd>
        </div>
      </dl>

      {error && error !== 'nothing_selected' && (
        <p className="field-error" role="alert">
          {REFUND_ERROR_MESSAGES[error]}
        </p>
      )}

      <div className="form-actions">
        <button type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button-primary" disabled={error !== null}>
          Refund {formatMoney(breakdown.totalCents)}
        </button>
      </div>
    </form>
  );
}
