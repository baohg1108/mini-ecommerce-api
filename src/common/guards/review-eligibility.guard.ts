import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from '../../modules/orders/entities/order-item.entity';
import { Review } from '../../modules/reviews/entities/review.entity';
import { OrderStatus } from '../enums/order-status.enum';
import type { RequestWithUser } from '../types/request-with-user.type';

@Injectable()
export class ReviewEligibilityGuard implements CanActivate {
  constructor(
    @InjectRepository(OrderItem) private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const { orderItemId } = req.body as { orderItemId: string };
    const customerId = req.user.sub;

    const orderItem = await this.orderItemRepo.findOne({
      where: { id: orderItemId },
      relations: { order: true },
    });
    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    if (orderItem.order.userId !== customerId) {
      throw new ForbiddenException('You are not allowed to review this order');
    }

    if (
      ![OrderStatus.DELIVERED, OrderStatus.COMPLETED].includes(
        orderItem.order.status,
      )
    ) {
      throw new ForbiddenException(
        'Order must be delivered or completed before it can be reviewed',
      );
    }

    const existed = await this.reviewRepo.findOne({
      where: { orderItemId },
    });
    if (existed) {
      throw new ForbiddenException('This item has already been reviewed');
    }

    req.orderItem = orderItem;
    return true;
  }
}
