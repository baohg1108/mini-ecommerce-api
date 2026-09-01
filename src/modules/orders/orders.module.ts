import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Shop } from '../shops/entities/shop.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PaymentModule } from '../payment/payment.module';
import { CartModule } from '../cart/cart.module';
import { UsersModule } from '../users/users.module';
import { ProductVariantModule } from '../product-variant/product-variant.module';
import { OrdersCleanupScheduler } from './orders-cleanup.scheduler';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Shop]),
    PaymentModule,
    CartModule,
    UsersModule,
    ProductVariantModule,
    VouchersModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersCleanupScheduler],
  exports: [OrdersService],
})
export class OrdersModule {}
