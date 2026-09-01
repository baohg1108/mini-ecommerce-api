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
