import { useState, type FormEvent } from 'react';
import {
  ADJUSTMENT_REASON_LABELS,
  ADJUSTMENT_TYPE_LABELS,
  calculateNewQuantity,
  validateAdjustment,
  type AdjustmentReason,
  type AdjustmentRequest,
  type AdjustmentType,
} from '../lib/inventory';

interface InventoryAdjustFormProps {
  currentQuantity: number;
  onSubmit: (request: AdjustmentRequest) => void;
  onCancel: () => void;
}

export default function InventoryAdjustForm({ currentQuantity, onSubmit, onCancel }: InventoryAdjustFormProps) {
  const [type, setType] = useState<AdjustmentType>('add');
  const [quantityInput, setQuantityInput] = useState('');
  const [reason, setReason] = useState<AdjustmentReason>('received');

  const quantity = quantityInput.trim() === '' ? Number.NaN : Number(quantityInput);
  const error = quantityInput.trim() === '' ? null : validateAdjustment(currentQuantity, { type, quantity });
  const canSave = quantityInput.trim() !== '' && error === null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSave) {
      onSubmit({ type, quantity, reason });
    }
  }

  return (
    <form className="adjust-form" aria-label="Adjust stock" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="adjust-type">Change</label>
        <select
          id="adjust-type"
          className="select select-block"
          value={type}
          onChange={(event) => setType(event.target.value as AdjustmentType)}
        >
          {(Object.keys(ADJUSTMENT_TYPE_LABELS) as AdjustmentType[]).map((value) => (
            <option key={value} value={value}>
              {ADJUSTMENT_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <div className={error ? 'field has-error' : 'field'}>
        <label htmlFor="adjust-quantity">Quantity</label>
        <div className="field-input">
          <input
            id="adjust-quantity"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={quantityInput}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'adjust-error' : 'adjust-preview'}
            onChange={(event) => setQuantityInput(event.target.value)}
          />
        </div>
        {error ? (
          <p id="adjust-error" className="field-error">
            {error}
          </p>
        ) : (
          <p id="adjust-preview" className="field-hint">
            {canSave
              ? `${currentQuantity} → ${calculateNewQuantity(currentQuantity, { type, quantity })}`
              : `Currently ${currentQuantity}`}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor="adjust-reason">Reason</label>
        <select
          id="adjust-reason"
          className="select select-block"
          value={reason}
          onChange={(event) => setReason(event.target.value as AdjustmentReason)}
        >
          {(Object.keys(ADJUSTMENT_REASON_LABELS) as AdjustmentReason[]).map((value) => (
            <option key={value} value={value}>
              {ADJUSTMENT_REASON_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="adjust-actions">
        <button type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button-primary" disabled={!canSave}>
          Save
        </button>
      </div>
    </form>
  );
}
