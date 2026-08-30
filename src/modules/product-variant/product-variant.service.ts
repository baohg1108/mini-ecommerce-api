import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { CreateProductVariantDto } from './dtos/create-product-variant.dto';
import { UpdateProductVariantDto } from './dtos/update-product-variant.dto';
import { UpsertVariantsDto } from './dtos/upsert-variant.dto';
import {
  UpsertVariantsResultDto,
  VariantErrorDto,
} from './dtos/upsert-variant.response.dto';

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

  // FR-12: bulk create/update variants for a product
  // strategy: has id -> update; no id -> create. best-effort, per-item error isolation.
  async Upsert(
    productId: string,
    userId: string,
    dto: UpsertVariantsDto,
  ): Promise<UpsertVariantsResultDto> {
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

    // load all existing variants of this product once, to validate ownership
    // and detect sku duplicates without hitting DB per item
    const existingVariants = await this.variantRepo.find({
      where: { productId },
    });
    const existingById = new Map(existingVariants.map((v) => [v.id, v]));

    // sku -> variant across the WHOLE table (sku is globally unique)
    const skusInRequest = dto.variants.map((v) => v.sku);
    const conflictingBySku = skusInRequest.length
      ? await this.variantRepo
          .createQueryBuilder('variant')
          .where('variant.sku IN (:...skus)', { skus: skusInRequest })
          .getMany()
      : [];
    const conflictBySkuMap = new Map(conflictingBySku.map((v) => [v.sku, v]));

    const succeeded: ProductVariant[] = [];
    const failed: VariantErrorDto[] = [];

    for (let index = 0; index < dto.variants.length; index++) {
      const item = dto.variants[index];

      try {
        if (item.id) {
          // update path
          const existing = existingById.get(item.id);
          if (!existing) {
            throw new NotFoundException(
              'Variant not found or does not belong to this product',
            );
          }

          const skuOwner = conflictBySkuMap.get(item.sku);
          if (skuOwner && skuOwner.id !== existing.id) {
            throw new ConflictException('SKU already exists');
          }

          existing.sku = item.sku;
          existing.attributes = item.attributes ?? existing.attributes;
          existing.price = item.price;
          existing.stockQty = item.stockQty;
          existing.imageUrl = item.imageUrl ?? existing.imageUrl ?? null;

          const saved = await this.variantRepo.save(existing);
          succeeded.push(saved);
        } else {
          // create path
          const skuOwner = conflictBySkuMap.get(item.sku);
          if (skuOwner) {
            throw new ConflictException('SKU already exists');
          }

          const created = this.variantRepo.create({
            productId,
            sku: item.sku,
            attributes: item.attributes ?? {},
            price: item.price,
            stockQty: item.stockQty,
            imageUrl: item.imageUrl ?? null,
          });

          const saved = await this.variantRepo.save(created);
          succeeded.push(saved);
          // prevent a later item in the same batch from reusing this sku
          conflictBySkuMap.set(saved.sku, saved);
        }
      } catch (error) {
        failed.push({
          index,
          sku: item.sku,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new UpsertVariantsResultDto(succeeded, failed);
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

  // find all variants by product id
  async findByProduct(productId: string): Promise<ProductVariant[]> {
    const variants = await this.variantRepo.find({
      where: { productId },
    });

    return variants;
  }

  async commitStock(
    manager: EntityManager,
    variantId: string,
    quantity: number,
  ): Promise<void> {
    const variant = await manager
      .createQueryBuilder(ProductVariant, 'variant')
      .where('variant.id = :id', { id: variantId })
      .setLock('pessimistic_write')
      .getOne();

    if (!variant) {
      throw new NotFoundException(`Variant ${variantId} not found`);
    }

    if (variant.stockQty < quantity || variant.reservedQty < quantity) {
      throw new BadRequestException(
        `Stock inconsistency for variant ${variantId}`,
      );
    }

    variant.stockQty -= quantity;
    variant.reservedQty -= quantity;

    await manager.save(ProductVariant, variant);
  }

  /**
   * Giải phóng reservedQty khi đơn bị huỷ / thanh toán thất bại / hết hạn.
   * KHÔNG đụng stockQty vì hàng chưa từng bị trừ thật lúc checkout
   * (checkout chỉ tăng reservedQty, xem OrdersService.createOrderForShop).
   */
  async releaseReservedStock(
    manager: EntityManager,
    variantId: string,
    quantity: number,
  ): Promise<void> {
    const variant = await manager
      .createQueryBuilder(ProductVariant, 'variant')
      .where('variant.id = :id', { id: variantId })
      .setLock('pessimistic_write')
      .getOne();

    if (!variant) return; // variant có thể đã bị xoá, bỏ qua thay vì throw

    variant.reservedQty = Math.max(0, variant.reservedQty - quantity);
    await manager.save(ProductVariant, variant);
  }
  async restock(
    manager: EntityManager,
    variantId: string,
    quantity: number,
  ): Promise<void> {
    const variant = await manager
      .createQueryBuilder(ProductVariant, 'variant')
      .where('variant.id = :id', { id: variantId })
      .setLock('pessimistic_write')
      .getOne();

    if (!variant) return; // variant có thể đã bị xoá, bỏ qua thay vì throw

    variant.stockQty += quantity;
    await manager.save(ProductVariant, variant);
  }
}
