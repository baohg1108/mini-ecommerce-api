import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { ProductVariantService } from '../product-variant/product-variant.service';
import { PaymentHistoryQueryDto } from './dtos/payment-history-query.dto';
import {
  PaymentHistoryItemDto,
  PaymentHistoryMetaDto,
  PaymentHistoryResponseDto,
} from './dtos/payment-history.response';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
    private readonly productVariantService: ProductVariantService,
  ) {}

  async createForOrder(
    manager: EntityManager,
    order: Order,
    method: PaymentMethod,
  ): Promise<Payment> {
    if (!order?.id) {
      throw new NotFoundException(
        'Cannot create payment: order does not exist',
      );
    }

    const existingOrder = await manager.findOne(Order, {
      where: { id: order.id },
    });

    if (!existingOrder) {
      throw new NotFoundException(`Order ${order.id} not found`);
    }

    const payment = manager.create(Payment, {
      orderId: existingOrder.id,
      method,
      amount: existingOrder.totalAmount,
      status: PaymentStatus.PENDING,
    });

    return manager.save(Payment, payment);
  }

  async findByOrderId(orderId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { orderId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment for order ${orderId} not found`);
    }

    return payment;
  }

  async findByGatewayOrderId(gatewayOrderId: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({ where: { gatewayOrderId } });
  }

  async attachGatewayOrderId(
    paymentId: string,
    gatewayOrderId: string,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    payment.gatewayOrderId = gatewayOrderId;
    return this.paymentRepository.save(payment);
  }

  async markSuccess(
    manager: EntityManager,
    orderId: string,
    data: {
      gatewayTxnId?: string;
      gatewayResponseCode?: string;
      gatewaySignature?: string;
      rawCallbackPayload?: Record<string, unknown>;
    },
  ): Promise<Payment> {
    const payment = await manager
      .createQueryBuilder(Payment, 'payment')
      .where('payment.orderId = :orderId', { orderId })
      .setLock('pessimistic_write')
      .getOne();

    if (!payment) {
      throw new NotFoundException(`Payment for order ${orderId} not found`);
    }
    if (payment.status !== PaymentStatus.PENDING) {
      return payment;
    }

    payment.status = PaymentStatus.SUCCESS;
    payment.paidAt = new Date();
    if (data.gatewayTxnId) payment.gatewayTxnId = data.gatewayTxnId;
    if (data.gatewayResponseCode)
      payment.gatewayResponseCode = data.gatewayResponseCode;
    if (data.gatewaySignature) payment.gatewaySignature = data.gatewaySignature;
    if (data.rawCallbackPayload)
      payment.rawCallbackPayload = data.rawCallbackPayload;

    const saved = await manager.save(Payment, payment);

    await manager.update(
      Order,
      { id: orderId },
      { status: OrderStatus.PAID_PENDING_CONFIRMATION },
    );

    // Thanh toán đã thành công -> trừ tồn kho thật (stockQty) và giải phóng
    // phần đã reserve tương ứng cho từng item của đơn hàng.
    const orderItems = await manager.find(OrderItem, { where: { orderId } });
    for (const item of orderItems) {
      await this.productVariantService.commitStock(
        manager,
        item.variantId,
        item.quantity,
      );
    }

    return saved;
  }

  async markFailed(
    manager: EntityManager,
    orderId: string,
    data?: {
      gatewayResponseCode?: string;
      gatewaySignature?: string;
      rawCallbackPayload?: Record<string, unknown>;
    },
  ): Promise<Payment> {
    const payment = await manager
      .createQueryBuilder(Payment, 'payment')
      .where('payment.orderId = :orderId', { orderId })
      .setLock('pessimistic_write')
      .getOne();

    if (!payment) {
      throw new NotFoundException(`Payment for order ${orderId} not found`);
    }

    payment.status = PaymentStatus.FAILED;
    if (data?.gatewayResponseCode)
      payment.gatewayResponseCode = data.gatewayResponseCode;
    if (data?.gatewaySignature)
      payment.gatewaySignature = data.gatewaySignature;
    if (data?.rawCallbackPayload)
      payment.rawCallbackPayload = data.rawCallbackPayload;

    const saved = await manager.save(Payment, payment);

    await manager.update(
      Order,
      { id: orderId },
      { status: OrderStatus.PAYMENT_FAILED },
    );

    // Thanh toán thất bại -> giải phóng phần đã reserve, KHÔNG đụng stockQty
    // vì hàng chưa từng bị trừ thật lúc checkout.
    const orderItems = await manager.find(OrderItem, { where: { orderId } });
    for (const item of orderItems) {
      await this.productVariantService.releaseReservedStock(
        manager,
        item.variantId,
        item.quantity,
      );
    }

    return saved;
  }

  async markSuccessByOrderId(
    orderId: string,
    data: {
      gatewayTxnId?: string;
      gatewayResponseCode?: string;
      gatewaySignature?: string;
      rawCallbackPayload?: Record<string, unknown>;
    },
  ): Promise<Payment> {
    return this.dataSource.transaction(async (manager) => {
      return this.markSuccess(manager, orderId, data);
    });
  }

  async markFailedByOrderId(
    orderId: string,
    data?: {
      gatewayResponseCode?: string;
      gatewaySignature?: string;
      rawCallbackPayload?: Record<string, unknown>;
    },
  ): Promise<Payment> {
    return this.dataSource.transaction(async (manager) => {
      return this.markFailed(manager, orderId, data);
    });
  }

  async markSuccessByGatewayOrderId(
    gatewayOrderId: string,
    data: {
      gatewayTxnId?: string;
      gatewayResponseCode?: string;
      gatewaySignature?: string;
      rawCallbackPayload?: Record<string, unknown>;
    },
  ): Promise<Payment | null> {
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { gatewayOrderId },
      });
      if (!payment) return null;
      return this.markSuccess(manager, payment.orderId, data);
    });
  }

  async markFailedByGatewayOrderId(
    gatewayOrderId: string,
    data?: {
      gatewayResponseCode?: string;
      gatewaySignature?: string;
      rawCallbackPayload?: Record<string, unknown>;
    },
  ): Promise<Payment | null> {
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { gatewayOrderId },
      });
      if (!payment) return null;
      return this.markFailed(manager, payment.orderId, data);
    });
  }

  async getPaymentHistory(
    userId: string,
    query: PaymentHistoryQueryDto,
  ): Promise<PaymentHistoryResponseDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;

    const qb = this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.order', 'order')
      .where('order.user_id = :userId', { userId });

    if (query.status) {
      qb.andWhere('payment.status = :status', { status: query.status });
    }

    qb.orderBy('payment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [payments, totalItems] = await qb.getManyAndCount();

    const items = payments.map((payment) => new PaymentHistoryItemDto(payment));

    const meta: PaymentHistoryMetaDto = {
      page,
      limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
    };

    return new PaymentHistoryResponseDto(items, meta);
  }
}
