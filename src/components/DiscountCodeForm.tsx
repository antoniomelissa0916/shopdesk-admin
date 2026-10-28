import { useState, type FormEvent } from 'react';

interface DiscountCodeFormProps {
  /** Applies the code and returns an error message, or null if it worked. */
  onApply: (code: string) => string | null;
}

export default function DiscountCodeForm({ onApply }: DiscountCodeFormProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = onApply(code);
    setError(message);
    if (!message) {
      setCode('');
    }
  }

  return (
    <form className="discount-code-form" aria-label="Apply discount" onSubmit={handleSubmit}>
      <div className={error ? 'field has-error' : 'field'}>
        <label htmlFor="discount-code">Discount code</label>
        <div className="discount-code-row">
          <div className="field-input">
            <input
              id="discount-code"
              value={code}
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'discount-code-error' : undefined}
              onChange={(event) => {
                setCode(event.target.value);
                setError(null);
              }}
            />
          </div>
          <button type="submit" className="button">
            Apply
          </button>
        </div>
        {error && (
          <p id="discount-code-error" className="field-error">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
