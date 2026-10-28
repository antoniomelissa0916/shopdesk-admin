import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react';
import { orders as seedOrders } from '../data/orders';
import { applyDiscountToOrder, removeDiscountFromOrder } from '../lib/discountRules';
import { fulfillOrder as markFulfilled } from '../lib/fulfillment';
import { calculateOrderTotals, findDiscount } from '../lib/orderTotals';
import { applyRefund, type RefundRequest } from '../lib/refunds';
import type { Order } from '../types';
import { useDiscounts } from './DiscountsContext';
import { ordersReducer } from './ordersReducer';

interface OrdersContextValue {
  orders: Order[];
  getOrder: (id: string) => Order | undefined;
  fulfillOrder: (id: string) => void;
  refundOrder: (id: string, amountCents: number, request: RefundRequest) => void;
  /** Applies a discount code to an unpaid order. Returns an error message if the code can't be used. */
  applyDiscount: (id: string, code: string) => string | null;
  removeDiscount: (id: string) => void;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

interface OrdersProviderProps {
  children: ReactNode;
  initialOrders?: Order[];
}

export function OrdersProvider({ children, initialOrders = seedOrders }: OrdersProviderProps) {
  const [orders, dispatch] = useReducer(ordersReducer, initialOrders);
  const { discounts, now, recordUse } = useDiscounts();

  const findOrder = useCallback((id: string) => orders.find((order) => order.id === id), [orders]);

  const fulfillOrder = useCallback(
    (id: string) => {
      const order = findOrder(id);
      if (order) {
        dispatch({ type: 'updated', order: markFulfilled(order) });
      }
    },
    [findOrder],
  );

  const refundOrder = useCallback(
    (id: string, amountCents: number, request: RefundRequest) => {
      const order = findOrder(id);
      if (order) {
        const totals = calculateOrderTotals(order, findDiscount(order.discountCode, discounts));
        dispatch({ type: 'updated', order: applyRefund(order, totals, amountCents, request) });
      }
    },
    [findOrder, discounts],
  );

  const applyDiscount = useCallback(
    (id: string, code: string) => {
      const order = findOrder(id);
      if (!order) {
        return 'This order no longer exists.';
      }
      const result = applyDiscountToOrder(order, code, discounts, now());
      if (!result.ok) {
        return result.message;
      }
      dispatch({ type: 'updated', order: result.order });
      recordUse(result.discount.code, 1);
      return null;
    },
    [findOrder, discounts, now, recordUse],
  );

  const removeDiscount = useCallback(
    (id: string) => {
      const order = findOrder(id);
      if (order?.discountCode) {
        dispatch({ type: 'updated', order: removeDiscountFromOrder(order) });
        recordUse(order.discountCode, -1);
      }
    },
    [findOrder, recordUse],
  );

  const value = useMemo(
    () => ({ orders, getOrder: findOrder, fulfillOrder, refundOrder, applyDiscount, removeDiscount }),
    [orders, findOrder, fulfillOrder, refundOrder, applyDiscount, removeDiscount],
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders(): OrdersContextValue {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders must be used inside an OrdersProvider.');
  }
  return context;
}
