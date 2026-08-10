import { Module } from '@nestjs/common';
import {
  ProductVariantController,
  VariantController,
} from './product-variant.controller';
import { ProductVariantService } from './product-variant.service';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([ProductVariant, Product])],
  controllers: [ProductVariantController, VariantController],
  providers: [ProductVariantService],
  exports: [ProductVariantService],
})
export class ProductVariantModule {}
