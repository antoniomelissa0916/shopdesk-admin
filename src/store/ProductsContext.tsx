import { createContext, useCallback, useContext, useMemo, useReducer, useState, type ReactNode } from 'react';
import { products as seedProducts } from '../data/products';
import { applyAdjustment, type AdjustmentRequest, type InventoryAdjustment } from '../lib/inventory';
import { fromFormValues, type ProductFormValues } from '../lib/productForm';
import type { Product } from '../types';
import { nextProductId, productsReducer } from './productsReducer';

interface ProductsContextValue {
  products: Product[];
  getProduct: (id: string) => Product | undefined;
  addProduct: (values: ProductFormValues) => Product;
  updateProduct: (id: string, values: ProductFormValues) => Product | undefined;
  adjustInventory: (id: string, request: AdjustmentRequest) => InventoryAdjustment | undefined;
  /** Stock changes for a product, newest first. */
  getAdjustments: (id: string) => InventoryAdjustment[];
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

const currentTime = () => new Date();

interface ProductsProviderProps {
  children: ReactNode;
  initialProducts?: Product[];
  now?: () => Date;
}

export function ProductsProvider({
  children,
  initialProducts = seedProducts,
  now = currentTime,
}: ProductsProviderProps) {
  const [products, dispatch] = useReducer(productsReducer, initialProducts);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);

  const getProduct = useCallback((id: string) => products.find((product) => product.id === id), [products]);

  const addProduct = useCallback(
    (values: ProductFormValues) => {
      const product = fromFormValues(values, { id: nextProductId(products), createdAt: now().toISOString() });
      dispatch({ type: 'added', product });
      return product;
    },
    [products, now],
  );

  const updateProduct = useCallback(
    (id: string, values: ProductFormValues) => {
      const existing = products.find((product) => product.id === id);
      if (!existing) {
        return undefined;
      }
      const product = fromFormValues(values, existing);
      dispatch({ type: 'updated', product });
      return product;
    },
    [products],
  );

  const adjustInventory = useCallback(
    (id: string, request: AdjustmentRequest) => {
      const existing = products.find((product) => product.id === id);
      if (!existing) {
        return undefined;
      }
      const { product, adjustment } = applyAdjustment(existing, request, {
        id: `adj_${adjustments.length + 1}`,
        createdAt: now().toISOString(),
      });
      dispatch({ type: 'updated', product });
      setAdjustments((current) => [adjustment, ...current]);
      return adjustment;
    },
    [products, adjustments.length, now],
  );

  const getAdjustments = useCallback(
    (id: string) => adjustments.filter((adjustment) => adjustment.productId === id),
    [adjustments],
  );

  const value = useMemo(
    () => ({ products, getProduct, addProduct, updateProduct, adjustInventory, getAdjustments }),
    [products, getProduct, addProduct, updateProduct, adjustInventory, getAdjustments],
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts(): ProductsContextValue {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts must be used inside a ProductsProvider.');
  }
  return context;
}
