import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefundRequest } from './entities/refund-request.entity';
import { Order } from '../orders/entities/order.entity';
import { CreateRefundRequestDto } from './dtos/create-refund-request.dto';
import { RefundRequestResponseDto } from './dtos/refund-request.response.dto';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { RefundRequestStatus } from '../../common/enums/refund-request-status.enum';
import { AppException } from '../../common/exceptions/app.exception';

const REFUND_WINDOW_DAYS = 7;

const ELIGIBLE_ORDER_STATUSES = [OrderStatus.DELIVERED, OrderStatus.COMPLETED];

@Injectable()
export class RefundRequestsService {
  constructor(
    @InjectRepository(RefundRequest)
    private readonly refundRequestRepository: Repository<RefundRequest>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async create(
    orderId: string,
    userId: string,
    dto: CreateRefundRequestDto,
  ): Promise<RefundRequestResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppException(
        'ORD-404',
        'Order not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (order.userId !== userId) {
      throw new AppException(
        'ORD-403',
        'You are not allowed to request a refund for this order',
        HttpStatus.FORBIDDEN,
      );
    }

    if (!ELIGIBLE_ORDER_STATUSES.includes(order.status)) {
      throw new AppException(
        'REFUND-409',
        `Refund can only be requested for orders in "delivered" or "completed" status (current: ${order.status})`,
        HttpStatus.CONFLICT,
      );
    }

    if (!order.deliveredAt) {
      throw new AppException(
        'REFUND-409',
        'Order does not have a delivery timestamp; refund eligibility cannot be determined',
        HttpStatus.CONFLICT,
      );
    }

    const deadline = new Date(order.deliveredAt);
    deadline.setDate(deadline.getDate() + REFUND_WINDOW_DAYS);

    if (new Date() > deadline) {
      throw new AppException(
        'REFUND-410',
        `Refund request window has expired (must be requested within ${REFUND_WINDOW_DAYS} days of delivery)`,
        HttpStatus.CONFLICT,
      );
    }

    const existingPending = await this.refundRequestRepository.findOne({
      where: { orderId, status: RefundRequestStatus.PENDING },
    });

    if (existingPending) {
      throw new AppException(
        'REFUND-409-DUP',
        'A refund request for this order is already pending review',
        HttpStatus.CONFLICT,
      );
    }

    const refundRequest = this.refundRequestRepository.create({
      orderId,
      userId,
      reason: dto.reason,
      status: RefundRequestStatus.PENDING,
    });

    const saved = await this.refundRequestRepository.save(refundRequest);

    // Notification implement ....

    return this.toResponse(saved);
  }

  private toResponse(entity: RefundRequest): RefundRequestResponseDto {
    return new RefundRequestResponseDto({
      id: entity.id,
      orderId: entity.orderId,
      status: entity.status,
      reason: entity.reason,
      rejectionReason: entity.rejectionReason,
      reviewedAt: entity.reviewedAt,
      createdAt: entity.createdAt,
    });
  }
}
