import { useRef, useState, type FormEvent } from 'react';
import type { Product, ProductStatus } from '../types';
import { getCategories, getVendors } from '../lib/products';
import {
  calculateMargin,
  hasErrors,
  parseMoneyToCents,
  validateProductForm,
  type ProductFormValues,
} from '../lib/productForm';
import TextField from './TextField';

const FIELD_ORDER: (keyof ProductFormValues)[] = [
  'title',
  'sku',
  'price',
  'compareAtPrice',
  'cost',
  'inventory',
  'lowStockThreshold',
  'status',
  'vendor',
  'category',
];

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

interface ProductFormProps {
  initialValues: ProductFormValues;
  existingProducts: Product[];
  currentId?: string;
  submitLabel: string;
  onSubmit: (values: ProductFormValues) => void;
  onCancel: () => void;
}

export default function ProductForm({
  initialValues,
  existingProducts,
  currentId,
  submitLabel,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState<Partial<Record<keyof ProductFormValues, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const errors = validateProductForm(values, existingProducts, currentId);
  const errorFor = (field: keyof ProductFormValues) => (submitted || touched[field] ? errors[field] : undefined);

  const priceCents = parseMoneyToCents(values.price);
  const costCents = parseMoneyToCents(values.cost);
  const margin = priceCents !== null && costCents !== null ? calculateMargin(priceCents, costCents) : null;

  function update(field: keyof ProductFormValues) {
    return (value: string) => setValues((current) => ({ ...current, [field]: value }));
  }

  function touch(field: keyof ProductFormValues) {
    return () => setTouched((current) => ({ ...current, [field]: true }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (hasErrors(errors)) {
      const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
      if (firstInvalid) {
        formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      }
      return;
    }
    onSubmit(values);
  }

  return (
    <form ref={formRef} className="product-form" noValidate onSubmit={handleSubmit}>
      <div className="form-main">
        <section className="card form-section">
          <TextField
            id="title"
            label="Title"
            required
            value={values.title}
            onChange={update('title')}
            onBlur={touch('title')}
            error={errorFor('title')}
            placeholder="Short sleeve t-shirt"
          />
          <TextField
            id="sku"
            label="SKU"
            required
            value={values.sku}
            onChange={update('sku')}
            onBlur={touch('sku')}
            error={errorFor('sku')}
            hint="Letters, numbers and hyphens, for example TS-CLS-001."
          />
        </section>

        <section className="card form-section">
          <h2>Pricing</h2>
          <div className="form-grid">
            <TextField
              id="price"
              label="Price"
              required
              prefix="$"
              inputMode="decimal"
              value={values.price}
              onChange={update('price')}
              onBlur={touch('price')}
              error={errorFor('price')}
              placeholder="0.00"
            />
            <TextField
              id="compareAtPrice"
              label="Compare-at price"
              prefix="$"
              inputMode="decimal"
              value={values.compareAtPrice}
              onChange={update('compareAtPrice')}
              onBlur={touch('compareAtPrice')}
              error={errorFor('compareAtPrice')}
              placeholder="0.00"
              hint="Shown crossed out to indicate a sale."
            />
            <TextField
              id="cost"
              label="Cost per item"
              prefix="$"
              inputMode="decimal"
              value={values.cost}
              onChange={update('cost')}
              onBlur={touch('cost')}
              error={errorFor('cost')}
              placeholder="0.00"
              hint="Customers won't see this."
            />
            <div className="field">
              <span className="field-label">Margin</span>
              <output className="field-output" htmlFor="price cost" aria-label="Margin">
                {margin === null ? '—' : `${margin}%`}
              </output>
            </div>
          </div>
        </section>

        <section className="card form-section">
          <h2>Inventory</h2>
          <div className="form-grid">
            <TextField
              id="inventory"
              label="Quantity"
              required
              inputMode="numeric"
              value={values.inventory}
              onChange={update('inventory')}
              onBlur={touch('inventory')}
              error={errorFor('inventory')}
            />
            <TextField
              id="lowStockThreshold"
              label="Low stock alert at"
              required
              inputMode="numeric"
              value={values.lowStockThreshold}
              onChange={update('lowStockThreshold')}
              onBlur={touch('lowStockThreshold')}
              error={errorFor('lowStockThreshold')}
            />
          </div>
        </section>
      </div>

      <aside className="form-side">
        <section className="card form-section">
          <div className="field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              className="select select-block"
              value={values.status}
              onChange={(event) => update('status')(event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="card form-section">
          <h2>Organization</h2>
          <TextField
            id="vendor"
            label="Vendor"
            list="vendor-options"
            value={values.vendor}
            onChange={update('vendor')}
            onBlur={touch('vendor')}
            error={errorFor('vendor')}
          />
          <datalist id="vendor-options">
            {getVendors(existingProducts).map((vendor) => (
              <option key={vendor} value={vendor} />
            ))}
          </datalist>
          <TextField
            id="category"
            label="Category"
            required
            list="category-options"
            value={values.category}
            onChange={update('category')}
            onBlur={touch('category')}
            error={errorFor('category')}
          />
          <datalist id="category-options">
            {getCategories(existingProducts).map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </section>
      </aside>

      <div className="form-actions">
        <button type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
