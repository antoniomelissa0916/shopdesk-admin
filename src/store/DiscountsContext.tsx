import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { discounts as seedDiscounts } from '../data/discounts';
import { fromDiscountForm, type DiscountFormValues } from '../lib/discountRules';
import { findDiscount } from '../lib/orderTotals';
import type { Discount } from '../types';

interface DiscountsContextValue {
  discounts: Discount[];
  now: () => Date;
  addDiscount: (values: DiscountFormValues) => Discount;
  /** Adds (+1) or gives back (-1) a use of a code. */
  recordUse: (code: string, change: 1 | -1) => void;
}

const DiscountsContext = createContext<DiscountsContextValue | null>(null);

const currentTime = () => new Date();

interface DiscountsProviderProps {
  children: ReactNode;
  initialDiscounts?: Discount[];
  now?: () => Date;
}

export function DiscountsProvider({
  children,
  initialDiscounts = seedDiscounts,
  now = currentTime,
}: DiscountsProviderProps) {
  const [discounts, setDiscounts] = useState(initialDiscounts);

  const addDiscount = useCallback((values: DiscountFormValues) => {
    const discount = fromDiscountForm(values);
    setDiscounts((current) => [...current, discount]);
    return discount;
  }, []);

  const recordUse = useCallback((code: string, change: 1 | -1) => {
    setDiscounts((current) => {
      const target = findDiscount(code, current);
      if (!target) {
        return current;
      }
      return current.map((discount) =>
        discount === target ? { ...discount, timesUsed: Math.max(discount.timesUsed + change, 0) } : discount,
      );
    });
  }, []);

  const value = useMemo(() => ({ discounts, now, addDiscount, recordUse }), [discounts, now, addDiscount, recordUse]);

  return <DiscountsContext.Provider value={value}>{children}</DiscountsContext.Provider>;
}

export function useDiscounts(): DiscountsContextValue {
  const context = useContext(DiscountsContext);
  if (!context) {
    throw new Error('useDiscounts must be used inside a DiscountsProvider.');
  }
  return context;
}
