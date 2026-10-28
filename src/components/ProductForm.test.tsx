import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { products } from '../data/products';
import { emptyProductForm, toFormValues } from '../lib/productForm';
import ProductForm from './ProductForm';

function renderForm(props: Partial<Parameters<typeof ProductForm>[0]> = {}) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(
    <ProductForm
      initialValues={emptyProductForm()}
      existingProducts={products}
      submitLabel="Save product"
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onSubmit, onCancel, user: userEvent.setup() };
}

describe('ProductForm', () => {
  it('shows errors and does not submit an empty form', async () => {
    const { onSubmit, user } = renderForm();
    await user.click(screen.getByRole('button', { name: 'Save product' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText('SKU is required.')).toBeInTheDocument();
    expect(screen.getByText('Price is required.')).toBeInTheDocument();
    expect(screen.getByText('Category is required.')).toBeInTheDocument();
  });

  it('moves focus to the first invalid field on submit', async () => {
    const { user } = renderForm();
    await user.type(screen.getByLabelText(/^Title/), 'Notebook');
    await user.click(screen.getByRole('button', { name: 'Save product' }));

    expect(screen.getByLabelText(/^SKU/)).toHaveFocus();
  });

  it('does not show errors before a field is touched', () => {
    renderForm();
    expect(screen.queryByText('Title is required.')).not.toBeInTheDocument();
  });

  it('shows a field error after leaving the field', async () => {
    const { user } = renderForm();
    await user.click(screen.getByLabelText(/^Title/));
    await user.tab();

    expect(screen.getByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Title/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('submits the entered values when the form is valid', async () => {
    const { onSubmit, user } = renderForm();
    await user.type(screen.getByLabelText(/^Title/), 'Recycled Notebook');
    await user.type(screen.getByLabelText(/^SKU/), 'ST-NTB-011');
    await user.type(screen.getByLabelText(/^Price/), '12.50');
    await user.type(screen.getByLabelText(/^Category/), 'Stationery');
    await user.click(screen.getByRole('button', { name: 'Save product' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Recycled Notebook',
        sku: 'ST-NTB-011',
        price: '12.50',
        category: 'Stationery',
        status: 'draft',
      }),
    );
  });

  it('rejects a SKU that is already in use', async () => {
    const { onSubmit, user } = renderForm();
    await user.type(screen.getByLabelText(/^SKU/), 'TS-CLS-001');
    await user.tab();

    expect(screen.getByText('Another product already uses this SKU.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('fills in an existing product when editing and lets it keep its SKU', async () => {
    const shirt = products[0];
    const { onSubmit, user } = renderForm({ initialValues: toFormValues(shirt), currentId: shirt.id });

    expect(screen.getByLabelText(/^Title/)).toHaveValue('Classic Cotton T-Shirt');
    expect(screen.getByLabelText(/^Price/)).toHaveValue('24.00');

    await user.click(screen.getByRole('button', { name: 'Save product' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows the margin from the price and cost', async () => {
    const { user } = renderForm();
    expect(screen.getByLabelText('Margin')).toHaveTextContent('—');

    await user.type(screen.getByLabelText(/^Price/), '24');
    await user.type(screen.getByLabelText(/^Cost per item/), '9');
    expect(screen.getByLabelText('Margin')).toHaveTextContent('62.5%');
  });

  it('calls onCancel when cancel is clicked', async () => {
    const { onCancel, onSubmit, user } = renderForm();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
