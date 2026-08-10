import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { CreateProductVariantDto } from './dtos/create-product-variant.dto';
import { UpdateProductVariantDto } from './dtos/update-product-variant.dto';

@Injectable()
export class ProductVariantService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // create variant for product
  async create(
    productId: string,
    userId: string,
    dto: CreateProductVariantDto,
  ): Promise<ProductVariant> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: { shop: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.shop?.userId !== userId) {
      throw new NotFoundException('Product not found');
    }

    const existingVariant = await this.variantRepo.findOne({
      where: { sku: dto.sku },
    });

    if (existingVariant) {
      throw new ConflictException('SKU already exists');
    }

    const variant = this.variantRepo.create({
      productId,
      sku: dto.sku,
      attributes: dto.attributes ?? {},
      price: dto.price,
      stockQty: dto.stockQty,
      imageUrl: dto.imageUrl ?? null,
    });

    return this.variantRepo.save(variant);
  }

  // find variant by id
  async findById(id: string): Promise<ProductVariant> {
    const variant = await this.variantRepo.findOne({
      where: { id },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    return variant;
  }

  // find variant by sku
  async findBySku(sku: string): Promise<ProductVariant> {
    const variant = await this.variantRepo.findOne({
      where: { sku },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    return variant;
  }

  // update variant
  async update(
    id: string,
    userId: string,
    dto: UpdateProductVariantDto,
  ): Promise<ProductVariant> {
    const variant = await this.variantRepo.findOne({
      where: { id },
      relations: { product: { shop: true } },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    if (variant.product.shop?.userId !== userId) {
      throw new NotFoundException('Product not found');
    }

    if (dto.sku !== undefined && dto.sku !== variant.sku) {
      const existingVariant = await this.variantRepo.findOne({
        where: { sku: dto.sku },
      });

      if (existingVariant) {
        throw new ConflictException('SKU already exists');
      }

      variant.sku = dto.sku;
    }

    if (dto.attributes !== undefined) {
      variant.attributes = dto.attributes;
    }

    if (dto.price !== undefined) {
      variant.price = dto.price;
    }

    if (dto.stockQty !== undefined) {
      variant.stockQty = dto.stockQty;
    }

    if (dto.imageUrl !== undefined) {
      variant.imageUrl = dto.imageUrl;
    }

    return this.variantRepo.save(variant);
  }
}
