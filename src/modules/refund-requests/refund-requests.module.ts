import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefundRequest } from './entities/refund-request.entity';
import { Order } from '../orders/entities/order.entity';
import { RefundRequestsService } from './refund-requests.service';
import { RefundRequestsController } from './refund-requests.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([RefundRequest, Order]), UsersModule],
  controllers: [RefundRequestsController],
  providers: [RefundRequestsService],
  exports: [RefundRequestsService],
})
export class RefundRequestsModule {}
