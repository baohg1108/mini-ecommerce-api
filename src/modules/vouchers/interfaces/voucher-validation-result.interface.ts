import { Voucher } from '../entities/voucher.entity';
export interface VoucherValidationResult {
  voucher: Voucher;
  discountAmount: number;
}
export interface VoucherCombinationResult {
  results: VoucherValidationResult[];
  totalDiscount: number;
  finalAmount: number;
}

export interface ShopVoucherAllocation {
  shopId: string;
  subtotal: number;
  shopVoucher?: { voucher: Voucher; discountAmount: number };
  systemDiscountAllocated: number;
  totalDiscount: number;
  finalAmount: number;
}

export interface CartVoucherApplicationResult {
  systemVoucher?: { voucher: Voucher; discountAmount: number };
  shopAllocations: ShopVoucherAllocation[];
  cartTotal: number;
  totalDiscount: number;
  finalAmount: number;
}
