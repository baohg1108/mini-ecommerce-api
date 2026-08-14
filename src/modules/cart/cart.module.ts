import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { ProductVariant } from '../product-variant/entities/product-variant.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem, ProductVariant]),
    UsersModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
