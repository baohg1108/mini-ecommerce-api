import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../../modules/users/entities/user.entity';
import { AdminSeedService } from './admin.seed.service';
import { Shop } from '../../modules/shops/entities/shop.entity';
import { Category } from '../../modules/categogies/entities/category.entity';
import { Product } from '../../modules/products/entities/product.entity';
import { ProductVariant } from '../../modules/product-variant/entities/product-variant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Shop, Category, Product, ProductVariant]),
  ],
  providers: [AdminSeedService],
  exports: [AdminSeedService],
})
export class SeedModule {}
