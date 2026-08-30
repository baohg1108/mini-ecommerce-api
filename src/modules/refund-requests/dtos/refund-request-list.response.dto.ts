import { RefundRequestStatus } from '../../../common/enums/refund-request-status.enum';

export class RefundRequestListItemDto {
  id!: string;
  orderId!: string;
  orderCode!: string;
  shopId!: string;
  shopName!: string;
  customerName!: string;
  customerEmail!: string;
  status!: RefundRequestStatus;
  reason!: string;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  createdAt!: Date;

  constructor(partial: Partial<RefundRequestListItemDto>) {
    Object.assign(this, partial);
  }
}

export class RefundRequestListMetaDto {
  page!: number;
  limit!: number;
  totalItems!: number;
  totalPages!: number;

  constructor(partial: Partial<RefundRequestListMetaDto>) {
    Object.assign(this, partial);
  }
}

export class RefundRequestListResponseDto {
  items: RefundRequestListItemDto[];
  meta: RefundRequestListMetaDto;

  constructor(
    items: RefundRequestListItemDto[],
    meta: RefundRequestListMetaDto,
  ) {
    this.items = items;
    this.meta = meta;
  }
}
