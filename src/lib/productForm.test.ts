import { describe, expect, it } from 'vitest';
import { products } from '../data/products';
import {
  calculateMargin,
  centsToInput,
  emptyProductForm,
  fromFormValues,
  hasErrors,
  parseMoneyToCents,
  parseWholeNumber,
  TITLE_MAX_LENGTH,
  toFormValues,
  validateProductForm,
  type ProductFormValues,
} from './productForm';

function validForm(overrides: Partial<ProductFormValues> = {}): ProductFormValues {
  return {
    title: 'Recycled Notebook',
    sku: 'ST-NTB-011',
    vendor: 'Paper Trail',
    category: 'Stationery',
    status: 'active',
    price: '12.50',
    compareAtPrice: '',
    cost: '4.00',
    inventory: '50',
    lowStockThreshold: '10',
    ...overrides,
  };
}

describe('parseMoneyToCents', () => {
  it('parses whole and decimal amounts', () => {
    expect(parseMoneyToCents('24')).toBe(2400);
    expect(parseMoneyToCents('24.5')).toBe(2450);
    expect(parseMoneyToCents('24.05')).toBe(2405);
    expect(parseMoneyToCents('0')).toBe(0);
  });

  it('accepts a dollar sign, thousands separators and surrounding spaces', () => {
    expect(parseMoneyToCents(' $1,024.99 ')).toBe(102499);
  });

  it('avoids floating point rounding errors', () => {
    expect(parseMoneyToCents('0.29')).toBe(29);
    expect(parseMoneyToCents('19.99')).toBe(1999);
  });

  it('rejects malformed input', () => {
    for (const input of ['', ' ', 'abc', '12.345', '-5', '1.2.3', '.50', '12.']) {
      expect(parseMoneyToCents(input)).toBeNull();
    }
  });
});

describe('parseWholeNumber', () => {
  it('parses non-negative integers', () => {
    expect(parseWholeNumber('0')).toBe(0);
    expect(parseWholeNumber(' 42 ')).toBe(42);
  });

  it('rejects decimals, negatives and text', () => {
    for (const input of ['', '1.5', '-1', 'ten', '1e3']) {
      expect(parseWholeNumber(input)).toBeNull();
    }
  });
});

describe('centsToInput', () => {
  it('formats cents with two decimals', () => {
    expect(centsToInput(2400)).toBe('24.00');
    expect(centsToInput(2405)).toBe('24.05');
    expect(centsToInput(5)).toBe('0.05');
    expect(centsToInput(0)).toBe('0.00');
  });

  it('round-trips with parseMoneyToCents', () => {
    for (const cents of [0, 1, 99, 100, 1999, 123456]) {
      expect(parseMoneyToCents(centsToInput(cents))).toBe(cents);
    }
  });
});

describe('validateProductForm', () => {
  it('accepts a valid form', () => {
    expect(validateProductForm(validForm(), products)).toEqual({});
  });

  it('requires title, SKU, category and price', () => {
    const errors = validateProductForm(
      validForm({ title: '  ', sku: '', category: '', price: '' }),
      products,
    );
    expect(errors.title).toBe('Title is required.');
    expect(errors.sku).toBe('SKU is required.');
    expect(errors.category).toBe('Category is required.');
    expect(errors.price).toBe('Price is required.');
  });

  it('limits the title length', () => {
    expect(validateProductForm(validForm({ title: 'a'.repeat(TITLE_MAX_LENGTH) }), products).title).toBeUndefined();
    expect(validateProductForm(validForm({ title: 'a'.repeat(TITLE_MAX_LENGTH + 1) }), products).title).toMatch(
      /characters or fewer/,
    );
  });

  it('rejects SKUs with invalid characters', () => {
    expect(validateProductForm(validForm({ sku: 'AB 12' }), products).sku).toMatch(/letters, numbers and hyphens/);
    expect(validateProductForm(validForm({ sku: 'AB_12' }), products).sku).toMatch(/letters, numbers and hyphens/);
  });

  it('rejects a SKU used by another product, ignoring case', () => {
    expect(validateProductForm(validForm({ sku: 'ts-cls-001' }), products).sku).toBe(
      'Another product already uses this SKU.',
    );
  });

  it('allows a product to keep its own SKU when editing', () => {
    const shirt = products.find((product) => product.id === 'prod_001')!;
    expect(validateProductForm(toFormValues(shirt), products, shirt.id)).toEqual({});
  });

  it('rejects an invalid price', () => {
    expect(validateProductForm(validForm({ price: '12.999' }), products).price).toMatch(/valid price/);
  });

  it('requires active products to have a price above zero', () => {
    expect(validateProductForm(validForm({ price: '0' }), products).price).toMatch(/greater than \$0\.00/);
    expect(validateProductForm(validForm({ price: '0', status: 'draft' }), products).price).toBeUndefined();
  });

  it('requires the compare-at price to be higher than the price', () => {
    expect(validateProductForm(validForm({ compareAtPrice: '12.50' }), products).compareAtPrice).toMatch(/higher/);
    expect(validateProductForm(validForm({ compareAtPrice: '10' }), products).compareAtPrice).toMatch(/higher/);
    expect(validateProductForm(validForm({ compareAtPrice: '15' }), products).compareAtPrice).toBeUndefined();
    expect(validateProductForm(validForm({ compareAtPrice: 'abc' }), products).compareAtPrice).toMatch(/valid price/);
  });

  it('treats cost as optional but validates it when given', () => {
    expect(validateProductForm(validForm({ cost: '' }), products).cost).toBeUndefined();
    expect(validateProductForm(validForm({ cost: 'free' }), products).cost).toMatch(/valid cost/);
  });

  it('requires whole numbers for inventory and low stock threshold', () => {
    const errors = validateProductForm(validForm({ inventory: '-1', lowStockThreshold: '2.5' }), products);
    expect(errors.inventory).toMatch(/whole number/);
    expect(errors.lowStockThreshold).toMatch(/whole number/);
  });
});

describe('calculateMargin', () => {
  it('returns the margin as a percentage of the price', () => {
    expect(calculateMargin(2400, 900)).toBe(62.5);
    expect(calculateMargin(1000, 1000)).toBe(0);
  });

  it('rounds to one decimal place', () => {
    expect(calculateMargin(3000, 1000)).toBe(66.7);
  });

  it('returns a negative margin when cost is above price', () => {
    expect(calculateMargin(1000, 1500)).toBe(-50);
  });

  it('returns null when the price is zero', () => {
    expect(calculateMargin(0, 500)).toBeNull();
  });
});

describe('hasErrors', () => {
  it('reports whether any field has an error', () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ title: 'Title is required.' })).toBe(true);
  });
});

describe('emptyProductForm', () => {
  it('starts as a draft that fails validation until filled in', () => {
    const form = emptyProductForm();
    expect(form.status).toBe('draft');
    expect(hasErrors(validateProductForm(form, products))).toBe(true);
  });
});

describe('toFormValues and fromFormValues', () => {
  it('round-trips an existing product', () => {
    for (const product of products) {
      expect(fromFormValues(toFormValues(product), product)).toEqual(product);
    }
  });

  it('trims text, upper-cases the SKU and converts numbers', () => {
    const product = fromFormValues(
      validForm({ title: '  Recycled Notebook ', sku: ' st-ntb-011 ', compareAtPrice: '15', cost: '' }),
      { id: 'prod_new', createdAt: '2026-09-29T09:00:00Z' },
    );
    expect(product).toEqual({
      id: 'prod_new',
      createdAt: '2026-09-29T09:00:00Z',
      title: 'Recycled Notebook',
      sku: 'ST-NTB-011',
      vendor: 'Paper Trail',
      category: 'Stationery',
      status: 'active',
      priceCents: 1250,
      compareAtPriceCents: 1500,
      costCents: 0,
      inventory: 50,
      lowStockThreshold: 10,
    });
  });
});
