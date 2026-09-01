import { VoucherType } from '../../../common/enums/voucher-type.enum';
import { VoucherScope } from '../../../common/enums/voucher-scope.enum';

export class AvailableVoucherResponseDto {
  id!: string;
  code!: string;
  discountType!: VoucherType;
  discountValue!: number;
  minOrderValue!: number;
  maxDiscountValue!: number | null;
  scope!: VoucherScope;
  shopId!: string | null;
  endDate!: Date;
  discountAmount!: number;

  constructor(partial: Partial<AvailableVoucherResponseDto>) {
    Object.assign(this, partial);
  }
}
