import { Request } from 'express';
import { Order } from '../../modules/orders/entities/order.entity';
import { OrderItem } from '../../modules/orders/entities/order-item.entity';

export interface RequestWithUser extends Request {
  user: {
    sub: string;
    email?: string;
    role?: string;
  };
  order?: Order;
  orderItem?: OrderItem;
}
