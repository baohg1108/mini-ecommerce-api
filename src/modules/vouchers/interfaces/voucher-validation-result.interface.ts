import { Voucher } from '../entities/voucher.entity';

export interface VoucherValidationResult {
  voucher: Voucher;
  discountAmount: number;
}
