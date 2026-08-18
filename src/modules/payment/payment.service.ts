import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
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

  async markSuccess(
    manager: EntityManager,
    orderId: string,
    data: {
      gatewayTxnId?: string;
      gatewayResponseCode?: string;
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
    if (data.rawCallbackPayload)
      payment.rawCallbackPayload = data.rawCallbackPayload;

    return manager.save(Payment, payment);
  }

  async markFailed(manager: EntityManager, orderId: string): Promise<Payment> {
    const payment = await manager.findOne(Payment, { where: { orderId } });

    if (!payment) {
      throw new NotFoundException(`Payment for order ${orderId} not found`);
    }

    payment.status = PaymentStatus.FAILED;
    return manager.save(Payment, payment);
  }
}
