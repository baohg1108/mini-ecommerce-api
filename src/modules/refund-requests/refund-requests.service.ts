import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { RefundRequest } from './entities/refund-request.entity';
import { Order } from '../orders/entities/order.entity';
import { Shop } from '../shops/entities/shop.entity';
import { CreateRefundRequestDto } from './dtos/create-refund-request.dto';
import { RejectRefundRequestDto } from './dtos/reject-refund-request.dto';
import { RefundRequestResponseDto } from './dtos/refund-request.response.dto';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { RefundRequestStatus } from '../../common/enums/refund-request-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { AppException } from '../../common/exceptions/app.exception';
import { UsersService } from '../users/users.service';

const REFUND_WINDOW_DAYS = 7;

const ELIGIBLE_ORDER_STATUSES = [OrderStatus.DELIVERED, OrderStatus.COMPLETED];

@Injectable()
export class RefundRequestsService {
  constructor(
    @InjectRepository(RefundRequest)
    private readonly refundRequestRepository: Repository<RefundRequest>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
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

    // TODO: integrate Notification Service - notify seller/admin of new refund request

    return this.toResponse(saved);
  }

  async approve(
    refundRequestId: string,
    currentUserId: string,
  ): Promise<RefundRequestResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const { refundRequest, order } = await this.loadForReview(
        manager,
        refundRequestId,
      );

      await this.assertCanReview(manager, order, currentUserId);

      refundRequest.status = RefundRequestStatus.APPROVED;
      refundRequest.reviewedBy = currentUserId;
      refundRequest.reviewedAt = new Date();

      const saved = await manager.save(RefundRequest, refundRequest);

      order.status = OrderStatus.REFUNDED;
      await manager.save(Order, order);

      // TODO: SCRUM-67 - trigger actual refund processing via payment gateway
      // TODO: integrate Notification Service - notify customer that refund was approved

      return this.toResponse(saved);
    });
  }

  async reject(
    refundRequestId: string,
    currentUserId: string,
    dto: RejectRefundRequestDto,
  ): Promise<RefundRequestResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const { refundRequest, order } = await this.loadForReview(
        manager,
        refundRequestId,
      );

      await this.assertCanReview(manager, order, currentUserId);

      refundRequest.status = RefundRequestStatus.REJECTED;
      refundRequest.reviewedBy = currentUserId;
      refundRequest.reviewedAt = new Date();
      refundRequest.rejectionReason = dto.rejectionReason;

      const saved = await manager.save(RefundRequest, refundRequest);

      // TODO: integrate Notification Service - notify customer with rejection reason

      return this.toResponse(saved);
    });
  }

  private async loadForReview(
    manager: EntityManager,
    refundRequestId: string,
  ): Promise<{ refundRequest: RefundRequest; order: Order }> {
    const refundRequest = await manager.findOne(RefundRequest, {
      where: { id: refundRequestId },
    });

    if (!refundRequest) {
      throw new AppException(
        'REFUND-404',
        'Refund request not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (refundRequest.status !== RefundRequestStatus.PENDING) {
      throw new AppException(
        'REFUND-409-PROCESSED',
        `This refund request has already been ${refundRequest.status}`,
        HttpStatus.CONFLICT,
      );
    }

    const order = await manager.findOne(Order, {
      where: { id: refundRequest.orderId },
    });

    if (!order) {
      throw new AppException(
        'ORD-404',
        'Order associated with this refund request was not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return { refundRequest, order };
  }

  private async assertCanReview(
    manager: EntityManager,
    order: Order,
    currentUserId: string,
  ): Promise<void> {
    const currentUser = await this.usersService.findUserById(currentUserId);

    if (!currentUser) {
      throw new AppException(
        'AUTH-401',
        'Current user not found',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (currentUser.role === UserRole.ADMIN) {
      return;
    }

    if (currentUser.role === UserRole.SELLER) {
      const shop = await manager.findOne(Shop, {
        where: { id: order.shopId },
      });

      if (shop && shop.userId === currentUserId) {
        return;
      }
    }

    throw new AppException(
      'REFUND-403',
      'You are not allowed to review this refund request',
      HttpStatus.FORBIDDEN,
    );
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
