import type { Product, ProductStatus } from '../types';

/** Form fields are kept as strings so the inputs can hold partial or invalid text. */
export interface ProductFormValues {
  title: string;
  sku: string;
  vendor: string;
  category: string;
  status: ProductStatus;
  price: string;
  compareAtPrice: string;
  cost: string;
  inventory: string;
  lowStockThreshold: string;
}

export type ProductFormErrors = Partial<Record<keyof ProductFormValues, string>>;

export const TITLE_MAX_LENGTH = 120;
const SKU_PATTERN = /^[A-Z0-9-]+$/i;
const MONEY_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/;
const WHOLE_NUMBER_PATTERN = /^\d+$/;

/**
 * Parses a money string such as "24", "24.5", "$1,024.99" into integer cents.
 * Returns null for empty, negative or malformed input, or more than two decimals.
 */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.trim().replace(/^\$/, '').replace(/,/g, '');
  const match = MONEY_PATTERN.exec(cleaned);
  if (!match) {
    return null;
  }
  const dollars = Number(match[1]);
  const cents = Number((match[2] ?? '').padEnd(2, '0'));
  return dollars * 100 + cents;
}

export function parseWholeNumber(input: string): number | null {
  const cleaned = input.trim();
  return WHOLE_NUMBER_PATTERN.test(cleaned) ? Number(cleaned) : null;
}

export function centsToInput(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const remainder = String(cents % 100).padStart(2, '0');
  return `${dollars}.${remainder}`;
}

export function emptyProductForm(): ProductFormValues {
  return {
    title: '',
    sku: '',
    vendor: '',
    category: '',
    status: 'draft',
    price: '',
    compareAtPrice: '',
    cost: '',
    inventory: '0',
    lowStockThreshold: '10',
  };
}

export function toFormValues(product: Product): ProductFormValues {
  return {
    title: product.title,
    sku: product.sku,
    vendor: product.vendor,
    category: product.category,
    status: product.status,
    price: centsToInput(product.priceCents),
    compareAtPrice: product.compareAtPriceCents === null ? '' : centsToInput(product.compareAtPriceCents),
    cost: centsToInput(product.costCents),
    inventory: String(product.inventory),
    lowStockThreshold: String(product.lowStockThreshold),
  };
}

/**
 * Validates the form. `existingProducts` is used to keep SKUs unique; pass
 * `currentId` when editing so the product does not clash with itself.
 */
export function validateProductForm(
  values: ProductFormValues,
  existingProducts: Product[],
  currentId?: string,
): ProductFormErrors {
  const errors: ProductFormErrors = {};

  const title = values.title.trim();
  if (!title) {
    errors.title = 'Title is required.';
  } else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `Title must be ${TITLE_MAX_LENGTH} characters or fewer.`;
  }

  const sku = values.sku.trim();
  if (!sku) {
    errors.sku = 'SKU is required.';
  } else if (!SKU_PATTERN.test(sku)) {
    errors.sku = 'SKU can only contain letters, numbers and hyphens.';
  } else if (
    existingProducts.some(
      (product) => product.id !== currentId && product.sku.toLowerCase() === sku.toLowerCase(),
    )
  ) {
    errors.sku = 'Another product already uses this SKU.';
  }

  if (!values.category.trim()) {
    errors.category = 'Category is required.';
  }

  const price = parseMoneyToCents(values.price);
  if (!values.price.trim()) {
    errors.price = 'Price is required.';
  } else if (price === null) {
    errors.price = 'Enter a valid price, for example 24.99.';
  } else if (values.status === 'active' && price === 0) {
    errors.price = 'Active products must have a price greater than $0.00.';
  }

  if (values.compareAtPrice.trim()) {
    const compareAt = parseMoneyToCents(values.compareAtPrice);
    if (compareAt === null) {
      errors.compareAtPrice = 'Enter a valid price, for example 29.99.';
    } else if (price !== null && compareAt <= price) {
      errors.compareAtPrice = 'Compare-at price must be higher than the price.';
    }
  }

  if (values.cost.trim() && parseMoneyToCents(values.cost) === null) {
    errors.cost = 'Enter a valid cost, for example 9.50.';
  }

  if (parseWholeNumber(values.inventory) === null) {
    errors.inventory = 'Inventory must be a whole number of 0 or more.';
  }

  if (parseWholeNumber(values.lowStockThreshold) === null) {
    errors.lowStockThreshold = 'Low stock threshold must be a whole number of 0 or more.';
  }

  return errors;
}

/**
 * Profit margin as a percentage of the price, rounded to one decimal place.
 * Returns null when the price is zero, since the margin is undefined.
 */
export function calculateMargin(priceCents: number, costCents: number): number | null {
  if (priceCents <= 0) {
    return null;
  }
  return Math.round(((priceCents - costCents) / priceCents) * 1000) / 10;
}

export function hasErrors(errors: ProductFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Builds a product from valid form values. Call only after validation passes.
 */
export function fromFormValues(
  values: ProductFormValues,
  base: Pick<Product, 'id' | 'createdAt'>,
): Product {
  const compareAt = values.compareAtPrice.trim() ? parseMoneyToCents(values.compareAtPrice) : null;
  return {
    id: base.id,
    createdAt: base.createdAt,
    title: values.title.trim(),
    sku: values.sku.trim().toUpperCase(),
    vendor: values.vendor.trim(),
    category: values.category.trim(),
    status: values.status,
    priceCents: parseMoneyToCents(values.price) ?? 0,
    compareAtPriceCents: compareAt,
    costCents: values.cost.trim() ? (parseMoneyToCents(values.cost) ?? 0) : 0,
    inventory: parseWholeNumber(values.inventory) ?? 0,
    lowStockThreshold: parseWholeNumber(values.lowStockThreshold) ?? 0,
  };
}
