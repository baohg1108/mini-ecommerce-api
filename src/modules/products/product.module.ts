import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductController } from './product.controller';
import { ProductImageController } from './product-image/product-image.controller';

import { ProductService } from './product.service';
import { ProductImageService } from './product-image/product-image.service';

import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { Shop } from '../shops/entities/shop.entity';

import { UsersModule } from '../users/users.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage, Shop]),
    UsersModule,
    CloudinaryModule,
  ],
  controllers: [ProductController, ProductImageController],
  providers: [ProductService, ProductImageService],
  exports: [ProductService, ProductImageService],
})
export class ProductModule {}
