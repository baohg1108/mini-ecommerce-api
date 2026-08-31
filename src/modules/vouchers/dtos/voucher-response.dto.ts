import { VoucherType } from '../../../common/enums/voucher-type.enum';
import { VoucherScope } from '../../../common/enums/voucher-scope.enum';
import { VoucherStatus } from '../../../common/enums/voucher-status.enum';

export class VoucherResponseDto {
  id!: string;
  code!: string;
  discountType!: VoucherType;
  discountValue!: number;
  minOrderValue!: number;
  maxDiscountValue!: number | null;
  startDate!: Date;
  endDate!: Date;
  usageLimit!: number;
  usedCount!: number;
  scope!: VoucherScope;
  shopId!: string | null;
  status!: VoucherStatus;
  createdBy!: string;
  createdAt!: Date;
}
