import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ObjectLiteral } from 'typeorm';

import { ProductService } from './product.service';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { Shop } from '../shops/entities/shop.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ProductStatus } from '../../common/enums/product-status.enum';
import { ShopStatus } from '../../common/enums/shop-status.enum';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { ProductSortBy, SearchProductDto } from './dtos/search-product.dto';
import { ProductListItemDto } from './dtos/public-product-response.dto';

interface MockQueryBuilder {
  leftJoin: jest.Mock<MockQueryBuilder, any[]>;
  addSelect: jest.Mock<MockQueryBuilder, any[]>;
  where: jest.Mock<MockQueryBuilder, any[]>;
  andWhere: jest.Mock<MockQueryBuilder, any[]>;
  orderBy: jest.Mock<MockQueryBuilder, any[]>;
  skip: jest.Mock<MockQueryBuilder, any[]>;
  take: jest.Mock<MockQueryBuilder, any[]>;
  leftJoinAndSelect: jest.Mock<MockQueryBuilder, any[]>;
  // dùng `unknown[]` thay vì `Partial<Product>[]` vì dữ liệu giả lập trong
  // test "fetches images..." chỉ cần {id, images} chứ không cần đủ field
  // của Product/ProductImage — tránh lỗi TS2739 (thiếu field bắt buộc).
  getManyAndCount: jest.Mock<Promise<[unknown[], number]>, any[]>;
  getMany: jest.Mock<Promise<unknown[]>, any[]>;
}

/** Query builder giả lập có thể chain (.where().andWhere().orderBy()...) dùng cho search() */
const createMockQueryBuilder = (
  overrides: {
    getManyAndCount?: [unknown[], number];
    getMany?: unknown[];
  } = {},
): MockQueryBuilder => {
  const qb = {} as MockQueryBuilder;
  qb.leftJoin = jest.fn<MockQueryBuilder, any[]>().mockReturnValue(qb);
  qb.addSelect = jest.fn<MockQueryBuilder, any[]>().mockReturnValue(qb);
  qb.where = jest.fn<MockQueryBuilder, any[]>().mockReturnValue(qb);
  qb.andWhere = jest.fn<MockQueryBuilder, any[]>().mockReturnValue(qb);
  qb.orderBy = jest.fn<MockQueryBuilder, any[]>().mockReturnValue(qb);
  qb.skip = jest.fn<MockQueryBuilder, any[]>().mockReturnValue(qb);
  qb.take = jest.fn<MockQueryBuilder, any[]>().mockReturnValue(qb);
  qb.leftJoinAndSelect = jest.fn<MockQueryBuilder, any[]>().mockReturnValue(qb);
  qb.getManyAndCount = jest
    .fn<Promise<[unknown[], number]>, any[]>()
    .mockResolvedValue(overrides.getManyAndCount ?? [[], 0]);
  qb.getMany = jest
    .fn<Promise<unknown[]>, any[]>()
    .mockResolvedValue(overrides.getMany ?? []);
  return qb;
};

/** Kiểu mock repository tường minh theo từng method thay vì `jest.Mock` trần
 *  (jest.Mock không generic mặc định là jest.Mock<any, any>, khiến mọi giá trị
 *  đi qua .mockResolvedValue()/.mockReturnValue() và mọi object literal truyền
 *  vào toHaveBeenCalledWith(expect.objectContaining({...})) đều bị coi là `any`). */
interface MockRepository<T extends ObjectLiteral = ObjectLiteral> {
  findOne: jest.Mock<Promise<T | null>, any[]>;
  find: jest.Mock<Promise<T[]>, any[]>;
  findAndCount: jest.Mock<Promise<[T[], number]>, any[]>;
  findOneOrFail: jest.Mock<Promise<T>, any[]>;
  create: jest.Mock<T, any[]>;
  save: jest.Mock<Promise<T>, any[]>;
  softDelete: jest.Mock<Promise<unknown>, any[]>;
  createQueryBuilder: jest.Mock<MockQueryBuilder, any[]>;
}

const createMockRepository = <
  T extends ObjectLiteral = ObjectLiteral,
>(): MockRepository<T> => ({
  findOne: jest.fn<Promise<T | null>, any[]>(),
  find: jest.fn<Promise<T[]>, any[]>(),
  findAndCount: jest.fn<Promise<[T[], number]>, any[]>(),
  findOneOrFail: jest.fn<Promise<T>, any[]>(),
  create: jest.fn<T, any[]>(),
  save: jest.fn<Promise<T>, any[]>(),
  softDelete: jest.fn<Promise<unknown>, any[]>(),
  createQueryBuilder: jest.fn<MockQueryBuilder, any[]>(),
});

describe('ProductService', () => {
  let service: ProductService;
  let productRepo: MockRepository<Product>;
  let shopRepo: MockRepository<Shop>;
  let imageRepo: MockRepository<ProductImage>;
  let cloudinaryService: { extractPublicId: jest.Mock; deleteFiles: jest.Mock };

  const mockShop = {
    id: 'shop-id-1',
    userId: 'seller-id-1',
    status: ShopStatus.ACTIVE,
  } as unknown as Shop;

  const baseProduct = {
    id: 'product-id-1',
    shopId: mockShop.id,
    categoryId: 'category-id-1',
    name: 'Samsung Galaxy S30',
    slug: 'samsung-galaxy-s30',
    description: null,
    basePrice: 15000000,
    status: ProductStatus.PENDING,
    rejectionReason: null,
    approvedBy: null,
    approvedAt: null,
    removedReason: null,
    avgRating: 0,
    reviewCount: 0,
    soldCount: 0,
    statusBeforeHide: null,
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as Product;

  const baseImage: ProductImage = {
    id: 'img-1',
    productId: baseProduct.id,
    product: baseProduct,
    imageUrl: 'https://cdn/img1.jpg',
    displayOrder: 0,
    isPrimary: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: createMockRepository<Product>(),
        },
        {
          provide: getRepositoryToken(Shop),
          useValue: createMockRepository<Shop>(),
        },
        {
          provide: getRepositoryToken(ProductImage),
          useValue: createMockRepository<ProductImage>(),
        },
        {
          provide: CloudinaryService,
          useValue: {
            extractPublicId: jest.fn(),
            deleteFiles: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productRepo = module.get<MockRepository<Product>>(
      getRepositoryToken(Product),
    );
    shopRepo = module.get<MockRepository<Shop>>(getRepositoryToken(Shop));
    imageRepo = module.get<MockRepository<ProductImage>>(
      getRepositoryToken(ProductImage),
    );
    cloudinaryService = module.get<{
      extractPublicId: jest.Mock;
      deleteFiles: jest.Mock;
    }>(CloudinaryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateProductDto = {
      categoryId: 'category-id-1',
      name: 'Samsung Galaxy S30',
      slug: 'samsung-galaxy-s30',
      basePrice: 15000000,
    };

    it('creates a product successfully when shop is active', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...baseProduct });
      productRepo.create.mockReturnValue({ ...baseProduct });
      productRepo.save.mockResolvedValue({ ...baseProduct });

      const result = await service.create('seller-id-1', createDto);

      expect(shopRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'seller-id-1' },
      });
      expect(productRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          shopId: mockShop.id,
          categoryId: createDto.categoryId,
          name: createDto.name,
          slug: createDto.slug,
          status: ProductStatus.PENDING,
        }),
      );
      expect(result.name).toBe('Samsung Galaxy S30');
    });

    it('defaults description to null when not provided', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...baseProduct });
      productRepo.create.mockReturnValue({ ...baseProduct });
      productRepo.save.mockResolvedValue({ ...baseProduct });

      await service.create('seller-id-1', createDto);

      expect(productRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: null }),
      );
    });

    it('seller has no shop -> NotFoundException', async () => {
      shopRepo.findOne.mockResolvedValue(null);

      await expect(service.create('seller-id-1', createDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(productRepo.create).not.toHaveBeenCalled();
    });

    it('shop is not active -> ForbiddenException', async () => {
      shopRepo.findOne.mockResolvedValue({
        ...mockShop,
        status: ShopStatus.PENDING,
      });

      await expect(service.create('seller-id-1', createDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(productRepo.create).not.toHaveBeenCalled();
    });

    it('duplicate slug within the same shop -> ConflictException', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValueOnce({ ...baseProduct });

      await expect(service.create('seller-id-1', createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(productRepo.create).not.toHaveBeenCalled();
    });

    it('checks slug uniqueness scoped to the seller shop only', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...baseProduct });
      productRepo.create.mockReturnValue({ ...baseProduct });
      productRepo.save.mockResolvedValue({ ...baseProduct });

      await service.create('seller-id-1', createDto);

      expect(productRepo.findOne).toHaveBeenNthCalledWith(1, {
        where: { shopId: mockShop.id, slug: createDto.slug },
      });
    });
  });

  describe('update', () => {
    const updateDto: UpdateProductDto = {
      name: 'New name',
    };

    it('updates an owned product and resets ACTIVE back to PENDING', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne
        .mockResolvedValueOnce({
          ...baseProduct,
          status: ProductStatus.ACTIVE,
          rejectionReason: null,
          approvedBy: 'admin-1',
          approvedAt: new Date('2026-01-01'),
        })
        .mockResolvedValueOnce({
          ...baseProduct,
          name: 'New name',
          status: ProductStatus.PENDING,
        });
      productRepo.save.mockResolvedValue({} as Product);

      const result = await service.update(
        'seller-id-1',
        baseProduct.id,
        updateDto,
      );

      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ProductStatus.PENDING,
          rejectionReason: null,
          approvedBy: null,
          approvedAt: null,
        }),
      );
      expect(result.status).toBe(ProductStatus.PENDING);
      expect(result.name).toBe('New name');
    });

    it('updates an owned product and resets REJECTED back to PENDING', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne
        .mockResolvedValueOnce({
          ...baseProduct,
          status: ProductStatus.REJECTED,
          rejectionReason: 'Ảnh mờ',
          approvedBy: 'admin-1',
          approvedAt: null,
        })
        .mockResolvedValueOnce({
          ...baseProduct,
          name: 'New name',
          status: ProductStatus.PENDING,
        });
      productRepo.save.mockResolvedValue({} as Product);

      const result = await service.update(
        'seller-id-1',
        baseProduct.id,
        updateDto,
      );

      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ProductStatus.PENDING,
          rejectionReason: null,
          approvedBy: null,
          approvedAt: null,
        }),
      );
      expect(result.status).toBe(ProductStatus.PENDING);
    });

    it('keeps PENDING as-is (no reset branch triggered)', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne
        .mockResolvedValueOnce({
          ...baseProduct,
          status: ProductStatus.PENDING,
        })
        .mockResolvedValueOnce({
          ...baseProduct,
          status: ProductStatus.PENDING,
        });
      productRepo.save.mockResolvedValue({} as Product);

      const result = await service.update(
        'seller-id-1',
        baseProduct.id,
        updateDto,
      );

      expect(result.status).toBe(ProductStatus.PENDING);
    });

    it('product not owned by seller -> ForbiddenException', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValueOnce({
        ...baseProduct,
        shopId: 'other-shop-id',
      });

      await expect(
        service.update('seller-id-1', baseProduct.id, updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('product does not exist -> NotFoundException', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.update('seller-id-1', 'not-exist', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('seller has no shop -> NotFoundException', async () => {
      shopRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('seller-id-1', baseProduct.id, updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMyProducts', () => {
    it('returns paginated products for the seller shop', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findAndCount.mockResolvedValue([[baseProduct], 1]);

      const result = await service.findMyProducts('seller-id-1', {
        page: 1,
        limit: 20,
      });

      expect(productRepo.findAndCount).toHaveBeenCalledWith({
        where: { shopId: mockShop.id },
        relations: { images: true },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('seller has no shop -> NotFoundException', async () => {
      shopRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findMyProducts('seller-id-1', { page: 1, limit: 20 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('applies correct skip/take for page 2', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findMyProducts('seller-id-1', { page: 2, limit: 10 });

      expect(productRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('returns an empty list with total 0 when the shop has no products', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findMyProducts('seller-id-1', {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findPublicByShop (FR-18)', () => {
    it('returns only ACTIVE products of the given shop, paginated', async () => {
      const activeProduct = { ...baseProduct, status: ProductStatus.ACTIVE };
      productRepo.findAndCount.mockResolvedValue([[activeProduct], 1]);

      const result = await service.findPublicByShop(mockShop.id, {
        page: 1,
        limit: 20,
      });

      expect(productRepo.findAndCount).toHaveBeenCalledWith({
        where: { shopId: mockShop.id, status: ProductStatus.ACTIVE },
        relations: { images: true },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies correct skip/take for page 2', async () => {
      productRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findPublicByShop(mockShop.id, { page: 2, limit: 10 });

      expect(productRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('does not require the seller to be logged in (no shop ownership check)', async () => {
      productRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findPublicByShop(mockShop.id, { page: 1, limit: 20 });

      expect(shopRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findForAdmin', () => {
    it('returns only PENDING products, ordered ASC, paginated', async () => {
      productRepo.findAndCount.mockResolvedValue([[baseProduct], 1]);

      const result = await service.findForAdmin({ page: 1, limit: 20 });

      expect(productRepo.findAndCount).toHaveBeenCalledWith({
        where: { status: ProductStatus.PENDING },
        relations: { images: true },
        order: { createdAt: 'ASC' },
        skip: 0,
        take: 20,
      });
      expect(result.total).toBe(1);
    });

    it('applies correct skip/take for page 2', async () => {
      productRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findForAdmin({ page: 2, limit: 10 });

      expect(productRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('returns an empty list with total 0 when there is nothing pending', async () => {
      productRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findForAdmin({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findOneProductDetail', () => {
    it('returns product details when found', async () => {
      productRepo.findOne.mockResolvedValue({ ...baseProduct });

      const result = await service.findOneProductDetail(baseProduct.id);

      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: { id: baseProduct.id },
        relations: { images: true },
      });
      expect(result).toBeDefined();
      expect(result.id).toBe(baseProduct.id);
    });

    it('product not found -> NotFoundException', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.findOneProductDetail('not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('approve', () => {
    it('approves a pending product successfully', async () => {
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.PENDING,
      });
      productRepo.save.mockImplementation((data: Product) =>
        Promise.resolve(data),
      );
      productRepo.findOneOrFail.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.ACTIVE,
        approvedBy: 'admin-1',
      });

      const result = await service.approve('admin-1', baseProduct.id);

      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ProductStatus.ACTIVE,
          approvedBy: 'admin-1',
          approvedAt: expect.any(Date) as Date,
          rejectionReason: null,
        }),
      );
      expect(result.status).toBe(ProductStatus.ACTIVE);
      expect(result.approvedBy).toBe('admin-1');
    });

    it('product not pending -> BadRequestException', async () => {
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.ACTIVE,
      });

      await expect(service.approve('admin-1', baseProduct.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('product does not exist -> NotFoundException', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.approve('admin-1', 'not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reject', () => {
    it('rejects a pending product with a reason', async () => {
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.PENDING,
      });
      productRepo.save.mockImplementation((data: Product) =>
        Promise.resolve(data),
      );
      productRepo.findOneOrFail.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.REJECTED,
        rejectionReason: 'Invalid images',
      });

      const result = await service.reject(
        'admin-1',
        baseProduct.id,
        'Invalid images',
      );

      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ProductStatus.REJECTED,
          rejectionReason: 'Invalid images',
          approvedBy: 'admin-1',
          approvedAt: null,
        }),
      );
      expect(result.status).toBe(ProductStatus.REJECTED);
      expect(result.rejectionReason).toBe('Invalid images');
    });

    it('product not pending -> BadRequestException', async () => {
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.ACTIVE,
      });

      await expect(
        service.reject('admin-1', baseProduct.id, 'reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('product does not exist -> NotFoundException', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(
        service.reject('admin-1', 'not-exist', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeByAdmin', () => {
    it('removes an active product with a reason', async () => {
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.ACTIVE,
      });
      productRepo.save.mockImplementation((data: Product) =>
        Promise.resolve(data),
      );

      const result = await service.removeByAdmin(baseProduct.id, 'Fraud');

      expect(result.status).toBe(ProductStatus.REMOVED);
      expect(result.removedReason).toBe('Fraud');
    });

    it('removes a HIDDEN product with a reason (also a removable status)', async () => {
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.HIDDEN,
      });
      productRepo.save.mockImplementation((data: Product) =>
        Promise.resolve(data),
      );

      const result = await service.removeByAdmin(
        baseProduct.id,
        'Policy violation',
      );

      expect(result.status).toBe(ProductStatus.REMOVED);
    });

    it('removes an OUT_OF_STOCK product with a reason (also a removable status)', async () => {
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.OUT_OF_STOCK,
      });
      productRepo.save.mockImplementation((data: Product) =>
        Promise.resolve(data),
      );

      const result = await service.removeByAdmin(
        baseProduct.id,
        'Out of stock too long',
      );

      expect(result.status).toBe(ProductStatus.REMOVED);
    });

    it('product in a non-removable status (PENDING) -> BadRequestException', async () => {
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.PENDING,
      });

      await expect(
        service.removeByAdmin(baseProduct.id, 'Fraud'),
      ).rejects.toThrow(BadRequestException);
    });

    it('product in a non-removable status (REJECTED) -> BadRequestException', async () => {
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.REJECTED,
      });

      await expect(
        service.removeByAdmin(baseProduct.id, 'Fraud'),
      ).rejects.toThrow(BadRequestException);
    });

    it('product already REMOVED -> BadRequestException (idempotency)', async () => {
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.REMOVED,
      });

      await expect(
        service.removeByAdmin(baseProduct.id, 'Fraud'),
      ).rejects.toThrow(BadRequestException);
    });

    it('product does not exist -> NotFoundException', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.removeByAdmin('not-exist', 'Fraud')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes an owned product and cleans up cloudinary images', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValue({ ...baseProduct });
      imageRepo.find.mockResolvedValue([
        { ...baseImage, id: 'img-1', imageUrl: 'https://cdn/img1.jpg' },
      ]);
      cloudinaryService.extractPublicId.mockReturnValue('public-id-1');
      cloudinaryService.deleteFiles.mockResolvedValue(undefined);
      productRepo.softDelete.mockResolvedValue({});

      await service.remove('seller-id-1', baseProduct.id);

      expect(cloudinaryService.deleteFiles).toHaveBeenCalledWith([
        'public-id-1',
      ]);
      expect(productRepo.softDelete).toHaveBeenCalledWith(baseProduct.id);
    });

    it('filters out images whose publicId cannot be extracted before calling cloudinary', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValue({ ...baseProduct });
      imageRepo.find.mockResolvedValue([
        { ...baseImage, id: 'img-1', imageUrl: 'https://cdn/img1.jpg' },
        { ...baseImage, id: 'img-2', imageUrl: 'not-a-cloudinary-url' },
      ]);
      cloudinaryService.extractPublicId
        .mockReturnValueOnce('public-id-1')
        .mockReturnValueOnce(null);
      cloudinaryService.deleteFiles.mockResolvedValue(undefined);
      productRepo.softDelete.mockResolvedValue({});

      await service.remove('seller-id-1', baseProduct.id);

      expect(cloudinaryService.deleteFiles).toHaveBeenCalledWith([
        'public-id-1',
      ]);
    });

    it('skips cloudinary cleanup when all publicIds are null', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValue({ ...baseProduct });
      imageRepo.find.mockResolvedValue([
        { ...baseImage, id: 'img-1', imageUrl: 'not-a-cloudinary-url' },
      ]);
      cloudinaryService.extractPublicId.mockReturnValue(null);
      productRepo.softDelete.mockResolvedValue({});

      await service.remove('seller-id-1', baseProduct.id);

      expect(cloudinaryService.deleteFiles).not.toHaveBeenCalled();
      expect(productRepo.softDelete).toHaveBeenCalledWith(baseProduct.id);
    });

    it('skips cloudinary cleanup when there are no images', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValue({ ...baseProduct });
      imageRepo.find.mockResolvedValue([]);
      productRepo.softDelete.mockResolvedValue({});

      await service.remove('seller-id-1', baseProduct.id);

      expect(cloudinaryService.deleteFiles).not.toHaveBeenCalled();
      expect(productRepo.softDelete).toHaveBeenCalledWith(baseProduct.id);
    });

    it('product not owned by seller -> ForbiddenException', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        shopId: 'other-shop-id',
      });

      await expect(
        service.remove('seller-id-1', baseProduct.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('product does not exist -> NotFoundException', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('seller-id-1', 'not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('seller has no shop -> NotFoundException', async () => {
      shopRepo.findOne.mockResolvedValue(null);

      await expect(
        service.remove('seller-id-1', baseProduct.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('hide', () => {
    it('hides an active product and remembers its previous status', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.ACTIVE,
      });
      productRepo.save.mockImplementation((data: Product) =>
        Promise.resolve(data),
      );

      const result = await service.hide('seller-id-1', baseProduct.id);

      expect(result.status).toBe(ProductStatus.HIDDEN);
      expect(result.statusBeforeHide).toBe(ProductStatus.ACTIVE);
    });

    it('hides an OUT_OF_STOCK product and remembers its previous status', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.OUT_OF_STOCK,
      });
      productRepo.save.mockImplementation((data: Product) =>
        Promise.resolve(data),
      );

      const result = await service.hide('seller-id-1', baseProduct.id);

      expect(result.status).toBe(ProductStatus.HIDDEN);
      expect(result.statusBeforeHide).toBe(ProductStatus.OUT_OF_STOCK);
    });

    it('product not active/out-of-stock (PENDING) -> BadRequestException', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.PENDING,
      });

      await expect(service.hide('seller-id-1', baseProduct.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('product already HIDDEN -> BadRequestException (idempotency)', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.HIDDEN,
      });

      await expect(service.hide('seller-id-1', baseProduct.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('product does not exist -> NotFoundException', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.hide('seller-id-1', 'not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('product not owned by seller -> ForbiddenException', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.ACTIVE,
        shopId: 'other-shop-id',
      });

      await expect(service.hide('seller-id-1', baseProduct.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('unhide', () => {
    it('restores a hidden product to its previous status', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.HIDDEN,
        statusBeforeHide: ProductStatus.ACTIVE,
      });
      productRepo.save.mockImplementation((data: Product) =>
        Promise.resolve(data),
      );

      const result = await service.unhide('seller-id-1', baseProduct.id);

      expect(result.status).toBe(ProductStatus.ACTIVE);
      expect(result.statusBeforeHide).toBeNull();
    });

    it('falls back to ACTIVE when statusBeforeHide is null (legacy/migrated data)', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.HIDDEN,
        statusBeforeHide: null,
      });
      productRepo.save.mockImplementation((data: Product) =>
        Promise.resolve(data),
      );

      const result = await service.unhide('seller-id-1', baseProduct.id);

      expect(result.status).toBe(ProductStatus.ACTIVE);
      expect(result.statusBeforeHide).toBeNull();
    });

    it('product not hidden -> BadRequestException', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.ACTIVE,
      });

      await expect(
        service.unhide('seller-id-1', baseProduct.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('product does not exist -> NotFoundException', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.unhide('seller-id-1', 'not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('product not owned by seller -> ForbiddenException', async () => {
      shopRepo.findOne.mockResolvedValue({ ...mockShop });
      productRepo.findOne.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.HIDDEN,
        statusBeforeHide: ProductStatus.ACTIVE,
        shopId: 'other-shop-id',
      });

      await expect(
        service.unhide('seller-id-1', baseProduct.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('search', () => {
    const baseDto: SearchProductDto = {
      page: 1,
      limit: 20,
    };

    it('always filters by status=active regardless of other filters', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      productRepo.createQueryBuilder.mockReturnValue(qb);

      await service.search(baseDto);

      expect(productRepo.createQueryBuilder).toHaveBeenCalledWith('product');
      expect(qb.where).toHaveBeenCalledWith('product.status = :status', {
        status: 'active',
      });
    });

    it('applies keyword filter (ILIKE name OR variant sku) when provided', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      productRepo.createQueryBuilder.mockReturnValue(qb);

      await service.search({ ...baseDto, keyword: 'áo thun' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE :keyword'),
        { keyword: '%áo thun%' },
      );
    });

    it('does not apply keyword filter when keyword is not provided', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      productRepo.createQueryBuilder.mockReturnValue(qb);

      await service.search(baseDto);

      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('applies categoryId, shopId, minPrice, maxPrice and minRating filters together', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      productRepo.createQueryBuilder.mockReturnValue(qb);

      await service.search({
        ...baseDto,
        categoryId: 'cat-1',
        shopId: 'shop-1',
        minPrice: 100000,
        maxPrice: 500000,
        minRating: 4,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'product.categoryId = :categoryId',
        { categoryId: 'cat-1' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('product.shopId = :shopId', {
        shopId: 'shop-1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'product.basePrice >= :minPrice',
        { minPrice: 100000 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'product.basePrice <= :maxPrice',
        { maxPrice: 500000 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'product.avgRating >= :minRating',
        { minRating: 4 },
      );
      expect(qb.andWhere).toHaveBeenCalledTimes(5);
    });

    it.each([
      [ProductSortBy.PRICE_ASC, 'product.basePrice', 'ASC'],
      [ProductSortBy.PRICE_DESC, 'product.basePrice', 'DESC'],
      [ProductSortBy.BEST_SELLING, 'product.soldCount', 'DESC'],
      [ProductSortBy.RATING, 'product.avgRating', 'DESC'],
      [ProductSortBy.NEWEST, 'product.createdAt', 'DESC'],
    ])(
      'applies the correct ORDER BY for sortBy=%s',
      async (sortBy, column, direction) => {
        const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
        productRepo.createQueryBuilder.mockReturnValue(qb);

        await service.search({ ...baseDto, sortBy });

        expect(qb.orderBy).toHaveBeenCalledWith(column, direction);
      },
    );

    it('defaults to NEWEST (createdAt DESC) when sortBy is not provided', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      productRepo.createQueryBuilder.mockReturnValue(qb);

      await service.search(baseDto);

      expect(qb.orderBy).toHaveBeenCalledWith('product.createdAt', 'DESC');
    });

    it('applies skip/take according to page and limit', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      productRepo.createQueryBuilder.mockReturnValue(qb);

      await service.search({ ...baseDto, page: 3, limit: 10 });

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('returns an empty result and does NOT query images when there is no match', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      productRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.search(baseDto);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      // chỉ gọi createQueryBuilder 1 lần cho query chính, KHÔNG gọi lần 2 để lấy ảnh
      expect(productRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
    });

    it('fetches images separately and maps items to ProductListItemDto when there are results', async () => {
      const foundProducts = [
        { ...baseProduct, id: 'p1', status: ProductStatus.ACTIVE },
        { ...baseProduct, id: 'p2', status: ProductStatus.ACTIVE },
      ];
      const qb = createMockQueryBuilder({
        getManyAndCount: [foundProducts, 2],
        getMany: [
          {
            id: 'p1',
            images: [{ id: 'img-1', imageUrl: 'url1', isPrimary: true }],
          },
          { id: 'p2', images: [] },
        ],
      });
      productRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.search(baseDto);

      expect(productRepo.createQueryBuilder).toHaveBeenCalledTimes(2);
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.images',
        'images',
      );
      expect(qb.where).toHaveBeenCalledWith('product.id IN (:...productIds)', {
        productIds: ['p1', 'p2'],
      });
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toBeInstanceOf(ProductListItemDto);
      expect(result.total).toBe(2);
    });

    it('computes totalPages correctly via SearchProductResponseDto', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 23] });
      productRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.search({ ...baseDto, limit: 10 });

      expect(result.total).toBe(23);
      expect(result.totalPages).toBe(3);
    });
  });

  describe('error propagation', () => {
    it('create: propagates the error when shopRepository throws', async () => {
      shopRepo.findOne.mockRejectedValue(new Error('DB error'));

      await expect(
        service.create('seller-id-1', {
          categoryId: 'category-id-1',
          name: 'Test',
          slug: 'test',
          basePrice: 100000,
        }),
      ).rejects.toThrow('DB error');
    });

    it('approve: propagates the error when productRepository throws', async () => {
      productRepo.findOne.mockRejectedValue(new Error('DB down'));

      await expect(service.approve('admin-1', baseProduct.id)).rejects.toThrow(
        'DB down',
      );
    });

    it('findOneProductDetail: propagates the error when productRepository throws', async () => {
      productRepo.findOne.mockRejectedValue(new Error('DB error'));

      await expect(
        service.findOneProductDetail(baseProduct.id),
      ).rejects.toThrow('DB error');
    });

    it('search: propagates the error when the query builder throws', async () => {
      const qb = createMockQueryBuilder();
      qb.getManyAndCount = jest
        .fn<Promise<[unknown[], number]>, any[]>()
        .mockRejectedValue(new Error('DB error'));
      productRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.search({ page: 1, limit: 20 })).rejects.toThrow(
        'DB error',
      );
    });
  });
});
