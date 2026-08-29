import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { ProductVariantService } from '../product-variant/product-variant.service';
import {
  VnpayService,
  GatewayRefundResult as VnpayRefundResult,
} from './vnpay/vnpay.service';
import {
  MomoService,
  GatewayRefundResult as MomoRefundResult,
} from './momo/momo.service';
import { PaymentHistoryQueryDto } from './dtos/payment-history-query.dto';
import {
  PaymentHistoryItemDto,
  PaymentHistoryMetaDto,
  PaymentHistoryResponseDto,
} from './dtos/payment-history.response';

type GatewayRefundResult = VnpayRefundResult | MomoRefundResult;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
    private readonly productVariantService: ProductVariantService,
    private readonly vnpayService: VnpayService,
    private readonly momoService: MomoService,
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
    const payment = await manager.findOne(Payment, { where: { orderId } });

    if (!payment) {
      throw new NotFoundException(`Payment for order ${orderId} not found`);
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
    const payment = await manager.findOne(Payment, { where: { orderId } });

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

  async refundByOrderId(orderId: string, reason: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { orderId },
      relations: { order: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment for order ${orderId} not found`);
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      return payment;
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException(
        `Cannot refund a payment that is not in "success" status (current: ${payment.status})`,
      );
    }

    if (payment.method === PaymentMethod.VNPAY) {
      const result = await this.vnpayService.refund(
        payment.order,
        payment,
        reason,
      );
      return this.applyRefundResult(orderId, result);
    }

    if (payment.method === PaymentMethod.MOMO) {
      const result = await this.momoService.refund(
        payment.order,
        payment,
        reason,
      );
      return this.applyRefundResult(orderId, result);
    }

    throw new BadRequestException(
      `Refund via payment gateway is not supported for method "${payment.method}"`,
    );
  }

  private async applyRefundResult(
    orderId: string,
    result: GatewayRefundResult,
  ): Promise<Payment> {
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, { where: { orderId } });

      if (!payment) {
        throw new NotFoundException(`Payment for order ${orderId} not found`);
      }

      if (result.responseCode) payment.refundResponseCode = result.responseCode;
      if (result.gatewayTxnId) payment.refundGatewayTxnId = result.gatewayTxnId;
      if (result.raw) payment.rawRefundResponsePayload = result.raw;

      if (result.success) {
        payment.status = PaymentStatus.REFUNDED;
        payment.refundedAt = new Date();
        await manager.update(
          Order,
          { id: orderId },
          { status: OrderStatus.REFUNDED },
        );
      } else {
        this.logger.warn(
          `Refund failed for order ${orderId}: ${result.message ?? 'unknown error'}`,
        );
      }

      return manager.save(Payment, payment);
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
