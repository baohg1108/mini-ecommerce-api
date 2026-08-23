import { OrderStatus } from '../../../common/enums/order-status.enum';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';
import { OrderItemResponseDto } from './order-item.response.dto';

export class OrderCustomerDto {
  id!: string;
  fullName!: string;
  phone?: string;

  constructor(partial: Partial<OrderCustomerDto>) {
    Object.assign(this, partial);
  }
}

export class SellerOrderItemDto {
  orderId!: string;
  customer!: OrderCustomerDto;
  items!: OrderItemResponseDto[];
  totalAmount!: string;
  paymentMethod!: PaymentMethod;
  status!: OrderStatus;
  createdAt!: Date;

  constructor(partial: Partial<SellerOrderItemDto>) {
    Object.assign(this, partial);
  }
}

export class SellerOrderListMetaDto {
  page!: number;
  limit!: number;
  totalItems!: number;
  totalPages!: number;
}

export class SellerOrderListResponseDto {
  items!: SellerOrderItemDto[];
  meta!: SellerOrderListMetaDto;

  constructor(items: SellerOrderItemDto[], meta: SellerOrderListMetaDto) {
    this.items = items;
    this.meta = meta;
  }
}
