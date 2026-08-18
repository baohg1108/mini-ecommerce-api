import { OrderStatus } from '../../../common/enums/order-status.enum';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';
import { OrderItemResponseDto } from './order-item.response.dto';
import { PaymentResponseDto } from '../../payment/dtos/payment.response.dto';

export class OrderResponseDto {
  id!: string;
  orderCode!: string;
  shopId!: string;
  status!: OrderStatus;
  paymentMethod!: PaymentMethod;
  subtotalAmount!: string;
  discountAmount!: string;
  shippingFee!: string;
  totalAmount!: string;
  items!: OrderItemResponseDto[];
  payment?: PaymentResponseDto;
  createdAt!: Date;

  constructor(partial: Partial<OrderResponseDto>) {
    Object.assign(this, partial);
  }
}
