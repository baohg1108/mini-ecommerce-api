import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Shop } from '../shops/entities/shop.entity';
import { ProductStatus } from '../../common/enums/product-status.enum';
import { ShopStatus } from '../../common/enums/shop-status.enum';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { ProductDetailsResponseDto } from './dtos/product-details.response.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ProductImage } from './entities/product-image.entity';
import { SearchProductDto, ProductSortBy } from './dtos/search-product.dto';
import { SearchProductResponseDto } from './dtos/search-product.response.dto';
import { ProductListItemDto } from './dtos/public-product-response.dto';
import { NotificationsService } from '../notifications/notifications.service';
@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  // FR-11: create product
  async create(sellerId: string, dto: CreateProductDto): Promise<Product> {
    const shop = await this.shopRepo.findOne({ where: { userId: sellerId } });
    if (!shop) {
      throw new NotFoundException("You don't have a shop yet");
    }
    if (shop.status !== ShopStatus.ACTIVE) {
      throw new ForbiddenException(
        'Shop is not active or is locked, cannot list products',
      );
    }

    const existingProduct = await this.productRepo.findOne({
      where: { shopId: shop.id, slug: dto.slug },
    });
    if (existingProduct) {
      throw new ConflictException(
        'A product with this slug already exists in your shop',
      );
    }

    const product = this.productRepo.create({
      shopId: shop.id,
      categoryId: dto.categoryId,
      name: dto.name,
      slug: dto.slug,
      description: dto.description ?? null,
      basePrice: dto.basePrice,
      status: ProductStatus.PENDING,
    });

    const saved = await this.productRepo.save(product);

    return this.productRepo.findOne({
      where: { id: saved.id },
      relations: { images: true },
    }) as Promise<Product>;
  }

  // FR-13: update or hide product
  async update(
    sellerId: string,
    productId: string,
    dto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOwnedBySeller(sellerId, productId);

    Object.assign(product, dto);

    if (
      product.status === ProductStatus.ACTIVE ||
      product.status === ProductStatus.REJECTED
    ) {
      product.status = ProductStatus.PENDING;
      product.rejectionReason = null;
      product.approvedBy = null;
      product.approvedAt = null;
    }

    await this.productRepo.save(product);

    return this.productRepo.findOne({
      where: { id: product.id },
      relations: { images: true },
    }) as Promise<Product>;
  }

  // FR-13: list my products
  async findMyProducts(
    sellerId: string,
    query: PaginationQueryDto,
  ): Promise<{ data: Product[]; total: number }> {
    const shop = await this.shopRepo.findOne({ where: { userId: sellerId } });
    if (!shop) throw new NotFoundException("You don't have a shop yet");

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await this.productRepo.findAndCount({
      where: { shopId: shop.id },
      relations: { images: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  // FR-18: public - list active products of a shop
  async findPublicByShop(
    shopId: string,
    query: PaginationQueryDto,
  ): Promise<{ data: Product[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await this.productRepo.findAndCount({
      where: { shopId, status: ProductStatus.ACTIVE },
      relations: { images: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  // FR-14: admin review products
  async findForAdmin(
    query: PaginationQueryDto,
  ): Promise<{ data: Product[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await this.productRepo.findAndCount({
      where: { status: ProductStatus.PENDING },
      relations: { images: true },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async findOneProductDetail(id: string): Promise<ProductDetailsResponseDto> {
    const product = await this.productRepo.findOne({
      where: { id, status: ProductStatus.ACTIVE },
      relations: { images: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return new ProductDetailsResponseDto(product);
  }

  async findOneForAdmin(id: string): Promise<ProductDetailsResponseDto> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: { images: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return new ProductDetailsResponseDto(product);
  }

  async approve(adminId: string, productId: string): Promise<Product> {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id: productId },
        relations: { images: true, shop: true },
      });
      if (!product) throw new NotFoundException('No products found');
      if (product.status !== ProductStatus.PENDING) {
        throw new BadRequestException(
          'You can only approve or reject products that are in pending approval status',
        );
      }
      product.status = ProductStatus.ACTIVE;
      product.approvedBy = adminId;
      product.approvedAt = new Date();
      product.rejectionReason = null;
      const saved = await manager.save(Product, product);

      // FR-41: notify the seller when their product is approved
      await this.notificationsService.create(
        manager,
        product.shop.userId,
        'Your product has been approved',
        `Your product "${product.name}" has been approved and is now publicly visible.`,
      );

      return saved;
    });
  }

  // FR-14: reject product
  async reject(
    adminId: string,
    productId: string,
    rejectionReason: string,
  ): Promise<Product> {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id: productId },
        relations: { images: true, shop: true },
      });
      if (!product) throw new NotFoundException('No products found');
      if (product.status !== ProductStatus.PENDING) {
        throw new BadRequestException(
          'You can only approve or reject products that are in pending approval status',
        );
      }
      product.status = ProductStatus.REJECTED;
      product.rejectionReason = rejectionReason;
      product.approvedBy = adminId;
      product.approvedAt = null;
      const saved = await manager.save(Product, product);

      // FR-41: notify the seller when their product is rejected
      await this.notificationsService.create(
        manager,
        product.shop.userId,
        'Your product has been rejected',
        `Your product "${product.name}" has been rejected. Reason: ${rejectionReason}`,
      );

      return saved;
    });
  }

  // FR-14: remove product by admin (policy violation)
  async removeByAdmin(productId: string, reason: string): Promise<Product> {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id: productId },
        relations: { images: true, shop: true },
      });
      if (!product) throw new NotFoundException('No products found');

      if (
        ![
          ProductStatus.ACTIVE,
          ProductStatus.HIDDEN,
          ProductStatus.OUT_OF_STOCK,
        ].includes(product.status)
      ) {
        throw new BadRequestException('This product cannot be removed');
      }

      product.status = ProductStatus.REMOVED;
      product.removedReason = reason;
      const saved = await manager.save(Product, product);

      // FR-41: notify the seller when their product is removed for violation
      await this.notificationsService.create(
        manager,
        product.shop.userId,
        'Your product has been removed',
        `Your product "${product.name}" has been removed for violating our policies. Reason: ${reason}`,
      );

      return saved;
    });
  }

  // FR-13: delete product
  async remove(sellerId: string, productId: string): Promise<void> {
    const product = await this.findOwnedBySeller(sellerId, productId);

    const images = await this.imageRepo.find({
      where: { productId: product.id },
    });

    if (images.length > 0) {
      const publicIds = images
        .map((img) => this.cloudinaryService.extractPublicId(img.imageUrl))
        .filter((id): id is string => !!id);

      if (publicIds.length > 0) {
        await this.cloudinaryService.deleteFiles(publicIds);
      }
    }

    await this.productRepo.softDelete(product.id);
  }

  async hide(sellerId: string, productId: string): Promise<Product> {
    const product = await this.findOwnedBySeller(sellerId, productId);

    if (
      product.status !== ProductStatus.ACTIVE &&
      product.status !== ProductStatus.OUT_OF_STOCK
    ) {
      throw new BadRequestException(
        'Only active or out-of-stock products can be hidden',
      );
    }

    product.statusBeforeHide = product.status;
    product.status = ProductStatus.HIDDEN;
    return this.productRepo.save(product);
  }

  async unhide(sellerId: string, productId: string): Promise<Product> {
    const product = await this.findOwnedBySeller(sellerId, productId);

    if (product.status !== ProductStatus.HIDDEN) {
      throw new BadRequestException('Only hidden products can be unhidden');
    }

    product.status = product.statusBeforeHide ?? ProductStatus.ACTIVE;
    product.statusBeforeHide = null;
    return this.productRepo.save(product);
  }

  private async findOwnedBySeller(
    sellerId: string,
    productId: string,
  ): Promise<Product> {
    const shop = await this.shopRepo.findOne({ where: { userId: sellerId } });
    if (!shop) throw new NotFoundException("You don't have a shop yet");

    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('No products found');
    if (product.shopId !== shop.id) {
      throw new ForbiddenException('Product does not belong to your shop');
    }
    return product;
  }

  private async findPendingOrThrow(productId: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: { images: true },
    });
    if (!product) throw new NotFoundException('No products found');
    if (product.status !== ProductStatus.PENDING) {
      throw new BadRequestException(
        'You can only approve or reject products that are in pending approval status',
      );
    }
    return product;
  }

  // UC-06 + FR-16: search & filter product using QueryBuilder
  async search(dto: SearchProductDto): Promise<SearchProductResponseDto> {
    const {
      keyword,
      categoryId,
      shopId,
      minPrice,
      maxPrice,
      minRating,
      sortBy = ProductSortBy.NEWEST,
      page,
      limit,
    } = dto;

    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .addSelect(['category.id', 'category.name', 'category.slug'])
      .where('product.status = :status', { status: 'active' });

    if (keyword) {
      qb.andWhere(
        `(product.name ILIKE :keyword OR EXISTS (
      SELECT 1 FROM product_variants v
      WHERE v.product_id = product.id AND v.sku ILIKE :keyword
    ))`,
        { keyword: `%${keyword}%` },
      );
    }
    if (categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId });
    }
    if (shopId) {
      qb.andWhere('product.shopId = :shopId', { shopId });
    }
    if (minPrice !== undefined) {
      qb.andWhere('product.basePrice >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      qb.andWhere('product.basePrice <= :maxPrice', { maxPrice });
    }
    if (minRating !== undefined) {
      qb.andWhere('product.avgRating >= :minRating', { minRating });
    }

    switch (sortBy) {
      case ProductSortBy.PRICE_ASC:
        qb.orderBy('product.basePrice', 'ASC');
        break;
      case ProductSortBy.PRICE_DESC:
        qb.orderBy('product.basePrice', 'DESC');
        break;
      case ProductSortBy.BEST_SELLING:
        qb.orderBy('product.soldCount', 'DESC');
        break;
      case ProductSortBy.RATING:
        qb.orderBy('product.avgRating', 'DESC');
        break;
      default:
        qb.orderBy('product.createdAt', 'DESC');
        break;
    }

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    if (items.length === 0) {
      return new SearchProductResponseDto([], total, page, limit);
    }

    const productIds = items.map((p) => p.id);
    const imagesMap = await this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.images', 'images')
      .where('product.id IN (:...productIds)', { productIds })
      .getMany();

    const imagesById = new Map(imagesMap.map((p) => [p.id, p.images]));

    const mappedItems = items.map((item) => {
      item.images = imagesById.get(item.id) ?? [];
      return new ProductListItemDto(item);
    });

    return new SearchProductResponseDto(mappedItems, total, page, limit);
  }
}
