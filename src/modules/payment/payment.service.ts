import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
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

    return saved;
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
}
