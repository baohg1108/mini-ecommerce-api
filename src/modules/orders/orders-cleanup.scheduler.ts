import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, LessThan } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Payment } from '../payment/entities/payment.entity';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { ProductVariantService } from '../product-variant/product-variant.service';

// Số phút cho phép khách hàng thanh toán online trước khi đơn tự động bị huỷ.
// TODO: cân nhắc đưa ra ConfigService/env thay vì hardcode nếu cần chỉnh theo môi trường.
const PAYMENT_EXPIRY_MINUTES = 15;

@Injectable()
export class OrdersCleanupScheduler {
  private readonly logger = new Logger(OrdersCleanupScheduler.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly productVariantService: ProductVariantService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cancelExpiredPendingPaymentOrders(): Promise<void> {
    const expiredBefore = new Date(
      Date.now() - PAYMENT_EXPIRY_MINUTES * 60 * 1000,
    );

    const expiredOrders = await this.dataSource.manager.find(Order, {
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        createdAt: LessThan(expiredBefore),
      },
      relations: { items: true },
    });

    if (!expiredOrders.length) {
      return;
    }

    this.logger.log(
      `Found ${expiredOrders.length} expired pending-payment order(s) to cancel`,
    );

    for (const order of expiredOrders) {
      try {
        await this.cancelOneOrder(order.id);
      } catch (error) {
        this.logger.error(
          `Failed to cancel expired order ${order.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }
  }

  private async cancelOneOrder(orderId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        relations: { items: true },
      });

      if (!order) {
        return;
      }

      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        return;
      }

      order.status = OrderStatus.CANCELLED;
      order.cancelledAt = new Date();
      order.cancelReason = 'Payment timeout - automatically cancelled';
      await manager.save(Order, order);

      await manager.update(
        Payment,
        { orderId: order.id, status: PaymentStatus.PENDING },
        { status: PaymentStatus.FAILED },
      );

      const items = await manager.find(OrderItem, {
        where: { orderId: order.id },
      });

      for (const item of items) {
        await this.productVariantService.releaseReservedStock(
          manager,
          item.variantId,
          item.quantity,
        );
      }

      this.logger.log(`Cancelled expired order ${order.id}`);
    });
  }
}
