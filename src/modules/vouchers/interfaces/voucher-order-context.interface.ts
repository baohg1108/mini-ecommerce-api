export interface VoucherOrderContext {
  orderAmount: number;
  shopId?: string | null;
}
export interface ShopSubtotal {
  shopId: string;
  subtotal: number;
}
