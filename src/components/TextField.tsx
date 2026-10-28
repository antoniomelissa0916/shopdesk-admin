import type { HTMLAttributes } from 'react';

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  prefix?: string;
  placeholder?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  list?: string;
  required?: boolean;
  type?: 'text' | 'date';
}

export default function TextField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  prefix,
  placeholder,
  inputMode,
  list,
  required = false,
  type = 'text',
}: TextFieldProps) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ');

  return (
    <div className={error ? 'field has-error' : 'field'}>
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <div className="field-input">
        {prefix && <span className="field-prefix">{prefix}</span>}
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          placeholder={placeholder}
          inputMode={inputMode}
          list={list}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
