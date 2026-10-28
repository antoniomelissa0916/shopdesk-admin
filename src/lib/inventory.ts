import type { Product } from '../types';

export type AdjustmentType = 'add' | 'remove' | 'set';
export type AdjustmentReason = 'received' | 'correction' | 'damaged' | 'returned' | 'other';

export const ADJUSTMENT_TYPE_LABELS: Record<AdjustmentType, string> = {
  add: 'Add stock',
  remove: 'Remove stock',
  set: 'Set quantity to',
};

export const ADJUSTMENT_REASON_LABELS: Record<AdjustmentReason, string> = {
  received: 'Received new stock',
  correction: 'Stock count correction',
  damaged: 'Damaged or lost',
  returned: 'Customer return',
  other: 'Other',
};

export const MAX_INVENTORY = 1_000_000;

export interface AdjustmentRequest {
  type: AdjustmentType;
  quantity: number;
  reason: AdjustmentReason;
}

export interface InventoryAdjustment {
  id: string;
  productId: string;
  /** Change in stock: positive when added, negative when removed. */
  delta: number;
  previousQuantity: number;
  newQuantity: number;
  reason: AdjustmentReason;
  createdAt: string;
}

export function calculateNewQuantity(current: number, request: Pick<AdjustmentRequest, 'type' | 'quantity'>): number {
  switch (request.type) {
    case 'add':
      return current + request.quantity;
    case 'remove':
      return current - request.quantity;
    case 'set':
      return request.quantity;
  }
}

/** Returns a message explaining why the adjustment can't be made, or null if it can. */
export function validateAdjustment(current: number, request: Pick<AdjustmentRequest, 'type' | 'quantity'>): string | null {
  const { type, quantity } = request;
  if (!Number.isInteger(quantity) || quantity < 0) {
    return 'Enter a whole number of 0 or more.';
  }
  if (type !== 'set' && quantity === 0) {
    return 'Enter a quantity greater than 0.';
  }
  if (type === 'remove' && quantity > current) {
    return `Only ${current} in stock, so you can't remove ${quantity}.`;
  }
  if (type === 'set' && quantity === current) {
    return `The quantity is already ${current}.`;
  }
  if (calculateNewQuantity(current, request) > MAX_INVENTORY) {
    return `Stock can't be more than ${MAX_INVENTORY.toLocaleString('en-US')}.`;
  }
  return null;
}

/**
 * Applies a stock change to a product and returns the updated product along
 * with a record of the change. Throws if the change is not valid.
 */
export function applyAdjustment(
  product: Product,
  request: AdjustmentRequest,
  meta: Pick<InventoryAdjustment, 'id' | 'createdAt'>,
): { product: Product; adjustment: InventoryAdjustment } {
  const error = validateAdjustment(product.inventory, request);
  if (error) {
    throw new Error(error);
  }
  const newQuantity = calculateNewQuantity(product.inventory, request);
  return {
    product: { ...product, inventory: newQuantity },
    adjustment: {
      id: meta.id,
      productId: product.id,
      delta: newQuantity - product.inventory,
      previousQuantity: product.inventory,
      newQuantity,
      reason: request.reason,
      createdAt: meta.createdAt,
    },
  };
}

export function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}
