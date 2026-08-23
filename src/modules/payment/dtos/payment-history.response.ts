import { PaymentMethod } from '../../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { Payment } from '../entities/payment.entity';

export class PaymentHistoryItemDto {
  paymentId!: string;
  orderId!: string;
  method!: PaymentMethod;
  amount!: string;
  status!: PaymentStatus;
  gatewayTransactionId?: string;
  paidAt?: Date;

  constructor(payment: Payment) {
    this.paymentId = payment.id;
    this.orderId = payment.orderId;
    this.method = payment.method;
    this.amount = payment.amount;
    this.status = payment.status;
    this.gatewayTransactionId = payment.gatewayTxnId;
    this.paidAt = payment.paidAt;
  }
}

export class PaymentHistoryMetaDto {
  page!: number;
  limit!: number;
  totalItems!: number;
  totalPages!: number;
}

export class PaymentHistoryResponseDto {
  items!: PaymentHistoryItemDto[];

  meta!: PaymentHistoryMetaDto;

  constructor(items: PaymentHistoryItemDto[], meta: PaymentHistoryMetaDto) {
    this.items = items;
    this.meta = meta;
  }
}
