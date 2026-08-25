import { RefundRequestStatus } from '../../../common/enums/refund-request-status.enum';

export class RefundRequestResponseDto {
  id!: string;
  orderId!: string;
  status!: RefundRequestStatus;
  reason!: string;
  rejectionReason?: string | null;
  reviewedAt?: Date | null;
  createdAt!: Date;

  constructor(partial: Partial<RefundRequestResponseDto>) {
    Object.assign(this, partial);
  }
}
