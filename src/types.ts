// All money values are stored as integer cents to avoid floating point errors.

export type ProductStatus = 'active' | 'draft' | 'archived';

export interface Product {
  id: string;
  title: string;
  sku: string;
  vendor: string;
  category: string;
  status: ProductStatus;
  priceCents: number;
  compareAtPriceCents: number | null;
  costCents: number;
  inventory: number;
  lowStockThreshold: number;
  createdAt: string;
}

export interface Address {
  line1: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  acceptsMarketing: boolean;
  address: Address;
  tags: string[];
  createdAt: string;
}

export type DiscountType = 'percentage' | 'fixed_amount';

export interface Discount {
  code: string;
  type: DiscountType;
  /** A whole percentage (10 means 10%) or an amount in cents, depending on the type. */
  value: number;
  /** Smallest merchandise subtotal the code can be used on, or null for no minimum. */
  minimumSubtotalCents: number | null;
  startsAt: string;
  /** Last moment the code can be used, or null if it never expires. */
  endsAt: string | null;
  /** Total number of times the code can be used, or null for no limit. */
  usageLimit: number | null;
  timesUsed: number;
}

export type PaymentStatus ='pending' | 'paid' | 'partially_refunded' | 'refunded';
export type FulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled';

export interface OrderLineItem {
  productId: string;
  title: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
  /** Units of this line already refunded. Missing means none. */
  refundedQuantity?: number;
}

export interface Order {
  id: string;
  number: number;
  customerId: string;
  lineItems: OrderLineItem[];
  discountCode: string | null;
  shippingCents: number;
  taxRate: number;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  refundedCents: number;
  /** Whether the shipping charge has been refunded. Missing means it hasn't. */
  shippingRefunded?: boolean;
  createdAt: string;
}
