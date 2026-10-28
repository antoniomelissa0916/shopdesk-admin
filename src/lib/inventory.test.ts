import { describe, expect, it } from 'vitest';
import { products } from '../data/products';
import {
  applyAdjustment,
  calculateNewQuantity,
  formatDelta,
  MAX_INVENTORY,
  validateAdjustment,
} from './inventory';

const hoodie = products.find((product) => product.id === 'prod_002')!; // 12 in stock
const meta = { id: 'adj_1', createdAt: '2026-09-30T12:00:00Z' };

describe('calculateNewQuantity', () => {
  it('adds, removes or sets stock', () => {
    expect(calculateNewQuantity(12, { type: 'add', quantity: 8 })).toBe(20);
    expect(calculateNewQuantity(12, { type: 'remove', quantity: 5 })).toBe(7);
    expect(calculateNewQuantity(12, { type: 'set', quantity: 30 })).toBe(30);
  });
});

describe('validateAdjustment', () => {
  it('accepts valid changes', () => {
    expect(validateAdjustment(12, { type: 'add', quantity: 1 })).toBeNull();
    expect(validateAdjustment(12, { type: 'remove', quantity: 12 })).toBeNull();
    expect(validateAdjustment(12, { type: 'set', quantity: 0 })).toBeNull();
  });

  it('requires a whole, non-negative number', () => {
    expect(validateAdjustment(12, { type: 'add', quantity: 1.5 })).toMatch(/whole number/);
    expect(validateAdjustment(12, { type: 'add', quantity: -3 })).toMatch(/whole number/);
    expect(validateAdjustment(12, { type: 'add', quantity: Number.NaN })).toMatch(/whole number/);
  });

  it('requires adding or removing at least one unit', () => {
    expect(validateAdjustment(12, { type: 'add', quantity: 0 })).toMatch(/greater than 0/);
    expect(validateAdjustment(12, { type: 'remove', quantity: 0 })).toMatch(/greater than 0/);
  });

  it('does not allow stock to go below zero', () => {
    expect(validateAdjustment(12, { type: 'remove', quantity: 13 })).toBe(
      "Only 12 in stock, so you can't remove 13.",
    );
  });

  it('rejects setting the quantity it already has', () => {
    expect(validateAdjustment(12, { type: 'set', quantity: 12 })).toBe('The quantity is already 12.');
  });

  it('caps stock at the maximum', () => {
    expect(validateAdjustment(MAX_INVENTORY, { type: 'add', quantity: 1 })).toMatch(/can't be more than 1,000,000/);
    expect(validateAdjustment(0, { type: 'set', quantity: MAX_INVENTORY })).toBeNull();
  });
});

describe('applyAdjustment', () => {
  it('updates the product and records the change', () => {
    const { product, adjustment } = applyAdjustment(hoodie, { type: 'add', quantity: 24, reason: 'received' }, meta);

    expect(product.inventory).toBe(36);
    expect({ ...product, inventory: hoodie.inventory }).toEqual(hoodie);
    expect(adjustment).toEqual({
      id: 'adj_1',
      productId: 'prod_002',
      delta: 24,
      previousQuantity: 12,
      newQuantity: 36,
      reason: 'received',
      createdAt: '2026-09-30T12:00:00Z',
    });
  });

  it('records a negative change when stock is removed or lowered', () => {
    expect(applyAdjustment(hoodie, { type: 'remove', quantity: 2, reason: 'damaged' }, meta).adjustment.delta).toBe(-2);
    expect(applyAdjustment(hoodie, { type: 'set', quantity: 10, reason: 'correction' }, meta).adjustment.delta).toBe(
      -2,
    );
  });

  it('does not change the original product', () => {
    applyAdjustment(hoodie, { type: 'set', quantity: 99, reason: 'correction' }, meta);
    expect(hoodie.inventory).toBe(12);
  });

  it('throws with the validation message for an invalid change', () => {
    expect(() => applyAdjustment(hoodie, { type: 'remove', quantity: 50, reason: 'other' }, meta)).toThrow(
      "Only 12 in stock, so you can't remove 50.",
    );
  });
});

describe('formatDelta', () => {
  it('shows a plus sign for increases', () => {
    expect(formatDelta(5)).toBe('+5');
    expect(formatDelta(-5)).toBe('-5');
    expect(formatDelta(0)).toBe('0');
  });
});
