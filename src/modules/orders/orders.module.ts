import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PaymentModule } from '../payment/payment.module';
import { CartModule } from '../cart/cart.module';
import { UsersModule } from '../users/users.module';
import { ProductVariantModule } from '../product-variant/product-variant.module';
import { OrdersCleanupScheduler } from './orders-cleanup.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    PaymentModule,
    CartModule,
    UsersModule,
    ProductVariantModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersCleanupScheduler],
  exports: [OrdersService],
})
export class OrdersModule {}
