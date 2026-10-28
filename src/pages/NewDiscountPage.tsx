import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import TextField from '../components/TextField';
import { validateDiscountForm, type DiscountFormValues } from '../lib/discountRules';
import type { DiscountType } from '../types';
import { useDiscounts } from '../store/DiscountsContext';

export default function NewDiscountPage() {
  const navigate = useNavigate();
  const { discounts, now, addDiscount } = useDiscounts();
  const [values, setValues] = useState<DiscountFormValues>(() => ({
    code: '',
    type: 'percentage',
    value: '',
    minimumSubtotal: '',
    startsOn: now().toISOString().slice(0, 10),
    endsOn: '',
    usageLimit: '',
  }));
  const [submitted, setSubmitted] = useState(false);

  const errors = validateDiscountForm(values, discounts);
  const errorFor = (field: keyof DiscountFormValues) => (submitted ? errors[field] : undefined);
  const update = (field: keyof DiscountFormValues) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length === 0) {
      addDiscount(values);
      navigate('/discounts');
    }
  }

  return (
    <>
      <PageHeader title="Create discount" backLink={{ to: '/discounts', label: 'Back to discounts' }} />
      <form className="card form-section discount-form" noValidate onSubmit={handleSubmit}>
        <TextField
          id="code"
          label="Discount code"
          required
          value={values.code}
          onChange={update('code')}
          error={errorFor('code')}
          hint="Customers enter this at checkout, for example SPRING12."
        />

        <fieldset className="fieldset">
          <legend>Discount type</legend>
          {(
            [
              ['percentage', 'Percentage off'],
              ['fixed_amount', 'Fixed amount off'],
            ] as [DiscountType, string][]
          ).map(([type, label]) => (
            <label key={type} className="checkbox">
              <input
                type="radio"
                name="type"
                value={type}
                checked={values.type === type}
                onChange={() => update('type')(type)}
              />
              {label}
            </label>
          ))}
        </fieldset>

        <div className="form-grid">
          <TextField
            id="value"
            label={values.type === 'percentage' ? 'Percentage' : 'Amount'}
            required
            prefix={values.type === 'percentage' ? '%' : '$'}
            inputMode="decimal"
            value={values.value}
            onChange={update('value')}
            error={errorFor('value')}
          />
          <TextField
            id="minimumSubtotal"
            label="Minimum subtotal"
            prefix="$"
            inputMode="decimal"
            value={values.minimumSubtotal}
            onChange={update('minimumSubtotal')}
            error={errorFor('minimumSubtotal')}
            hint="Leave empty for no minimum."
          />
          <TextField
            id="startsOn"
            label="Start date"
            type="date"
            required
            value={values.startsOn}
            onChange={update('startsOn')}
            error={errorFor('startsOn')}
          />
          <TextField
            id="endsOn"
            label="End date"
            type="date"
            value={values.endsOn}
            onChange={update('endsOn')}
            error={errorFor('endsOn')}
            hint="Leave empty to never expire."
          />
          <TextField
            id="usageLimit"
            label="Usage limit"
            inputMode="numeric"
            value={values.usageLimit}
            onChange={update('usageLimit')}
            error={errorFor('usageLimit')}
            hint="Total uses allowed. Leave empty for no limit."
          />
        </div>

        <div className="form-actions">
          <button type="button" className="button" onClick={() => navigate('/discounts')}>
            Cancel
          </button>
          <button type="submit" className="button button-primary">
            Save discount
          </button>
        </div>
      </form>
    </>
  );
}
