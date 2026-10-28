import type { Order } from '../types';

export type OrdersAction = { type: 'updated'; order: Order };

export function ordersReducer(state: Order[], action: OrdersAction): Order[] {
  switch (action.type) {
    case 'updated': {
      const index = state.findIndex((order) => order.id === action.order.id);
      if (index === -1) {
        return state;
      }
      const next = [...state];
      next[index] = action.order;
      return next;
    }
  }
}
