import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { Shop } from '../shops/entities/shop.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewEligibilityGuard } from '../../common/guards/review-eligibility.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, Order, OrderItem, Product, Shop]),
    UsersModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewEligibilityGuard],
  exports: [ReviewsService],
})
export class ReviewsModule {}
