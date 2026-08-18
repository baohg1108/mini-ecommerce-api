import { PaymentMethod } from '../../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';

export class PaymentResponseDto {
  id!: string;
  orderId!: string;
  method!: PaymentMethod;
  status!: PaymentStatus;
  amount!: string;
  gatewayTxnId?: string;
  paidAt?: Date;

  constructor(partial: Partial<PaymentResponseDto>) {
    Object.assign(this, partial);
  }
}
