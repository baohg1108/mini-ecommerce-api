import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { MomoService } from './momo/momo.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Order]), UsersModule],
  controllers: [PaymentController],
  providers: [PaymentService, MomoService],
  exports: [PaymentService],
})
export class PaymentModule {}
