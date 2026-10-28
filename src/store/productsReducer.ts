import type { Product } from '../types';

export type ProductsAction = { type: 'added'; product: Product } | { type: 'updated'; product: Product };

export function productsReducer(state: Product[], action: ProductsAction): Product[] {
  switch (action.type) {
    case 'added':
      if (state.some((product) => product.id === action.product.id)) {
        throw new Error(`A product with id ${action.product.id} already exists.`);
      }
      return [...state, action.product];
    case 'updated': {
      const index = state.findIndex((product) => product.id === action.product.id);
      if (index === -1) {
        return state;
      }
      const next = [...state];
      next[index] = action.product;
      return next;
    }
  }
}

const ID_PATTERN = /^prod_(\d+)$/;

/** Returns the next id in the prod_001 sequence, one above the highest existing id. */
export function nextProductId(products: Product[]): string {
  const highest = products.reduce((max, product) => {
    const match = ID_PATTERN.exec(product.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `prod_${String(highest + 1).padStart(3, '0')}`;
}
