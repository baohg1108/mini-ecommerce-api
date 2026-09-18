import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductImageService } from './product-image/product-image.service';
import { Product } from './entities/product.entity';
import { Shop } from '../shops/entities/shop.entity';
import { ProductImage } from './entities/product-image.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProductStatus } from '../../common/enums/product-status.enum';
import { ShopStatus } from '../../common/enums/shop-status.enum';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { ProductDetailsResponseDto } from './dtos/product-details.response.dto';
import { SearchProductDto, ProductSortBy } from './dtos/search-product.dto';
import { SearchProductResponseDto } from './dtos/search-product.response.dto';

describe('Product Module Services (ProductService & ProductImageService)', () => {
  let productService: ProductService;
  let productImageService: ProductImageService;

  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

  const NON_ACTIVE_SHOP_STATUS = Object.values(ShopStatus).find(
    (s) => s !== ShopStatus.ACTIVE,
  ) as ShopStatus;

  const mockQueryBuilder = {
    leftJoin: jest.fn(),
    innerJoin: jest.fn(),
    leftJoinAndSelect: jest.fn(),
    addSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    orderBy: jest.fn(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
  };

  const mockProductRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockShopRepo = { findOne: jest.fn() };

  const mockImageRepo = {
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockCloudinaryService = {
    uploadMultiple: jest.fn(),
    extractPublicId: jest.fn(),
    deleteFiles: jest.fn(),
  };

  const mockNotificationsService = { create: jest.fn() };

  const mockDataSource = { transaction: jest.fn() };

  const setupDefaults = () => {
    (
      [
        'leftJoin',
        'innerJoin',
        'leftJoinAndSelect',
        'addSelect',
        'where',
        'andWhere',
        'skip',
        'take',
        'orderBy',
      ] as const
    ).forEach((k) => mockQueryBuilder[k].mockReturnThis());
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
    mockQueryBuilder.getMany.mockResolvedValue([]);

    mockProductRepo.create.mockImplementation((dto: object) => ({
      id: 'prod-1',
      ...dto,
    }));
    mockProductRepo.save.mockImplementation((...args: unknown[]) =>
      Promise.resolve({ id: 'prod-1', ...(args[args.length - 1] as object) }),
    );
    mockProductRepo.findAndCount.mockResolvedValue([[], 0]);
    mockProductRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    mockImageRepo.create.mockImplementation((img: object) => img);
    mockImageRepo.save.mockImplementation((data: unknown) =>
      Promise.resolve(data),
    );
    mockCloudinaryService.extractPublicId.mockReturnValue('public_id_1');

    mockDataSource.transaction.mockImplementation(
      async (cb: (manager: EntityManager) => Promise<unknown>) =>
        cb({
          findOne: mockProductRepo.findOne,
          save: mockProductRepo.save,
        } as unknown as EntityManager),
    );
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    setupDefaults();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        ProductImageService,
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
        { provide: getRepositoryToken(Shop), useValue: mockShopRepo },
        { provide: getRepositoryToken(ProductImage), useValue: mockImageRepo },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    productService = module.get<ProductService>(ProductService);
    productImageService = module.get<ProductImageService>(ProductImageService);
  });

  const mockShop = {
    id: 'shop-1',
    userId: 'seller-1',
    status: ShopStatus.ACTIVE,
  };
  const makeProduct = (
    over: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    id: 'prod-1',
    shopId: 'shop-1',
    name: 'Phone',
    status: ProductStatus.PENDING,
    ...over,
  });
  const asSeller = () =>
    mockShopRepo.findOne.mockResolvedValue({ ...mockShop });
  const makeListItem = (id: string): Record<string, unknown> => ({
    id,
    name: `Product ${id}`,
    slug: `product-${id}`,
    basePrice: 1000,
    avgRating: 4.5,
    soldCount: 10,
    shopId: 'shop-1',
    categoryId: validUUID,
    status: ProductStatus.ACTIVE,
    createdAt: new Date(),
    category: { id: validUUID, name: 'Cat', slug: 'cat' },
    shop: { id: 'shop-1', name: 'Shop' },
    images: [],
  });

  describe('ProductService', () => {
    describe('create', () => {
      it('PROD-UNIT-011: should create a new product successfully (happy path)', async () => {
        asSeller();
        mockProductRepo.findOne
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 'prod-1', name: 'Test', images: [] });
        const dto = {
          categoryId: validUUID,
          name: 'Test',
          slug: 'test',
          basePrice: 1000,
        } as unknown as CreateProductDto;

        const result = await productService.create('seller-1', dto);

        expect(mockShopRepo.findOne).toHaveBeenCalledWith({
          where: { userId: 'seller-1' },
        });
        expect(mockProductRepo.findOne).toHaveBeenNthCalledWith(1, {
          where: { shopId: 'shop-1', slug: 'test' },
        });
        expect(mockProductRepo.create).toHaveBeenCalledWith({
          shopId: 'shop-1',
          categoryId: validUUID,
          name: 'Test',
          slug: 'test',
          description: null,
          basePrice: 1000,
          status: ProductStatus.PENDING,
        });
        expect(mockProductRepo.save).toHaveBeenCalledTimes(1);
        expect(mockProductRepo.findOne).toHaveBeenNthCalledWith(2, {
          where: { id: 'prod-1' },
          relations: { images: true },
        });
        expect(result).toEqual({ id: 'prod-1', name: 'Test', images: [] });
      });

      it('PROD-UNIT-018: should throw NotFoundException if seller has no shop', async () => {
        mockShopRepo.findOne.mockResolvedValue(null);
        const dto = { slug: 'test' } as unknown as CreateProductDto;

        await expect(productService.create('seller-1', dto)).rejects.toThrow(
          NotFoundException,
        );
        expect(mockProductRepo.findOne).not.toHaveBeenCalled();
      });

      it('PROD-UNIT-019: should throw ForbiddenException if shop is not active', async () => {
        mockShopRepo.findOne.mockResolvedValue({
          ...mockShop,
          status: NON_ACTIVE_SHOP_STATUS,
        });
        const dto = { slug: 'test' } as unknown as CreateProductDto;

        await expect(productService.create('seller-1', dto)).rejects.toThrow(
          ForbiddenException,
        );
        expect(mockProductRepo.save).not.toHaveBeenCalled();
      });

      it('PROD-UNIT-020: should throw ConflictException if slug already exists in shop', async () => {
        asSeller();
        mockProductRepo.findOne.mockResolvedValue({ id: 'existing' });
        const dto = { slug: 'test' } as unknown as CreateProductDto;

        await expect(productService.create('seller-1', dto)).rejects.toThrow(
          ConflictException,
        );
        expect(mockProductRepo.create).not.toHaveBeenCalled();
        expect(mockProductRepo.save).not.toHaveBeenCalled();
      });

      it('PROD-UNIT-021: should keep description when provided', async () => {
        asSeller();
        mockProductRepo.findOne
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 'prod-1' });
        const dto = {
          categoryId: validUUID,
          name: 'Test',
          slug: 'test',
          description: 'A description',
          basePrice: 1000,
        } as unknown as CreateProductDto;

        await productService.create('seller-1', dto);

        expect(mockProductRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ description: 'A description' }),
        );
      });
    });

    describe('update', () => {
      it('PROD-UNIT-001: should update product and reset status to PENDING when product is ACTIVE', async () => {
        asSeller();
        const product = makeProduct({
          status: ProductStatus.ACTIVE,
          rejectionReason: 'old',
          approvedBy: 'admin-1',
          approvedAt: new Date(),
        });
        mockProductRepo.findOne.mockResolvedValue(product);
        const dto = { name: 'Updated Name' } as unknown as UpdateProductDto;

        const result = await productService.update('seller-1', 'prod-1', dto);

        expect(mockProductRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Updated Name',
            status: ProductStatus.PENDING,
            rejectionReason: null,
            approvedBy: null,
            approvedAt: null,
          }),
        );
        expect(mockProductRepo.findOne).toHaveBeenLastCalledWith({
          where: { id: 'prod-1' },
          relations: { images: true },
        });
        expect(result).toBeDefined();
      });

      it('PROD-UNIT-022: should reset status to PENDING when product is REJECTED', async () => {
        asSeller();
        const product = makeProduct({
          status: ProductStatus.REJECTED,
          rejectionReason: 'bad',
        });
        mockProductRepo.findOne.mockResolvedValue(product);

        await productService.update('seller-1', 'prod-1', {
          name: 'Fixed',
        });

        expect(mockProductRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ProductStatus.PENDING,
            rejectionReason: null,
          }),
        );
      });

      it('PROD-UNIT-023: should keep current status when product is neither ACTIVE nor REJECTED', async () => {
        asSeller();
        const product = makeProduct({
          status: ProductStatus.HIDDEN,
          approvedBy: 'admin-1',
        });
        mockProductRepo.findOne.mockResolvedValue(product);

        await productService.update('seller-1', 'prod-1', {
          name: 'Renamed',
        });

        expect(mockProductRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Renamed',
            status: ProductStatus.HIDDEN,
            approvedBy: 'admin-1',
          }),
        );
      });

      it('PROD-UNIT-024: should throw NotFoundException if seller has no shop', async () => {
        mockShopRepo.findOne.mockResolvedValue(null);

        await expect(
          productService.update('seller-1', 'prod-1', {}),
        ).rejects.toThrow(NotFoundException);
      });

      it('PROD-UNIT-025: should throw NotFoundException if product does not exist', async () => {
        asSeller();
        mockProductRepo.findOne.mockResolvedValue(null);

        await expect(
          productService.update('seller-1', 'prod-1', {}),
        ).rejects.toThrow(NotFoundException);
        expect(mockProductRepo.save).not.toHaveBeenCalled();
      });

      it('PROD-UNIT-026: should throw ForbiddenException if product belongs to another shop', async () => {
        asSeller();
        mockProductRepo.findOne.mockResolvedValue(
          makeProduct({ shopId: 'other-shop' }),
        );

        await expect(
          productService.update('seller-1', 'prod-1', {}),
        ).rejects.toThrow(ForbiddenException);
        expect(mockProductRepo.save).not.toHaveBeenCalled();
      });
    });

    describe('findMyProducts', () => {
      it('PROD-UNIT-002: should return paginated products of my shop', async () => {
        asSeller();
        mockProductRepo.findAndCount.mockResolvedValue([[{ id: 'prod-1' }], 1]);

        const result = await productService.findMyProducts('seller-1', {
          page: 1,
          limit: 10,
        });

        expect(result).toEqual({ data: [{ id: 'prod-1' }], total: 1 });
        expect(mockProductRepo.findAndCount).toHaveBeenCalledWith({
          where: { shopId: 'shop-1' },
          relations: { images: true },
          order: { createdAt: 'DESC' },
          skip: 0,
          take: 10,
        });
      });

      it('PROD-UNIT-027: should throw NotFoundException if seller has no shop', async () => {
        mockShopRepo.findOne.mockResolvedValue(null);

        await expect(
          productService.findMyProducts('seller-1', {
            page: 1,
            limit: 10,
          }),
        ).rejects.toThrow(NotFoundException);
        expect(mockProductRepo.findAndCount).not.toHaveBeenCalled();
      });

      it('PROD-UNIT-028: should use default page=1 and limit=20 when query is empty', async () => {
        asSeller();

        await productService.findMyProducts(
          'seller-1',
          {} as PaginationQueryDto,
        );

        expect(mockProductRepo.findAndCount).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 0, take: 20 }),
        );
      });
    });

    describe('findPublicByShop', () => {
      it('PROD-UNIT-013: should return active products of the given shop', async () => {
        mockProductRepo.findAndCount.mockResolvedValue([[{ id: 'prod-1' }], 1]);

        const result = await productService.findPublicByShop('shop-1', {
          page: 2,
          limit: 5,
        });

        expect(result).toEqual({ data: [{ id: 'prod-1' }], total: 1 });
        expect(mockProductRepo.findAndCount).toHaveBeenCalledWith({
          where: { shopId: 'shop-1', status: ProductStatus.ACTIVE },
          relations: { images: true },
          order: { createdAt: 'DESC' },
          skip: 5,
          take: 5,
        });
      });

      it('PROD-UNIT-029: should use default page=1 and limit=20 when query is empty', async () => {
        await productService.findPublicByShop(
          'shop-1',
          {} as PaginationQueryDto,
        );

        expect(mockProductRepo.findAndCount).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 0, take: 20 }),
        );
      });
    });

    describe('findForAdmin', () => {
      it('PROD-UNIT-012: should return PENDING products ordered by createdAt ASC', async () => {
        mockProductRepo.findAndCount.mockResolvedValue([[{ id: 'prod-1' }], 1]);

        const result = await productService.findForAdmin({
          page: 1,
          limit: 10,
        });

        expect(result.total).toBe(1);
        expect(mockProductRepo.findAndCount).toHaveBeenCalledWith({
          where: { status: ProductStatus.PENDING },
          relations: { images: true },
          order: { createdAt: 'ASC' },
          skip: 0,
          take: 10,
        });
      });

      it('PROD-UNIT-030: should use default page=1 and limit=20 when query is empty', async () => {
        await productService.findForAdmin({} as PaginationQueryDto);

        expect(mockProductRepo.findAndCount).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 0, take: 20 }),
        );
      });
    });

    describe('findOneProductDetail', () => {
      it('PROD-UNIT-031: should throw NotFoundException if product does not exist or is not active', async () => {
        mockProductRepo.findOne.mockResolvedValue(null);

        await expect(
          productService.findOneProductDetail('invalid-id'),
        ).rejects.toThrow(NotFoundException);
      });

      it('PROD-UNIT-032: should return product detail for an ACTIVE product', async () => {
        mockProductRepo.findOne.mockResolvedValue(
          makeProduct({ status: ProductStatus.ACTIVE }),
        );

        const result = await productService.findOneProductDetail('prod-1');

        expect(result).toBeInstanceOf(ProductDetailsResponseDto);
        expect(mockProductRepo.findOne).toHaveBeenCalledWith({
          where: { id: 'prod-1', status: ProductStatus.ACTIVE },
          relations: { images: true },
        });
      });
    });

    describe('findOneForAdmin', () => {
      it('PROD-UNIT-005: should return full product detail for admin regardless of status', async () => {
        mockProductRepo.findOne.mockResolvedValue(makeProduct());

        const result = await productService.findOneForAdmin('prod-1');

        expect(result).toBeInstanceOf(ProductDetailsResponseDto);
        expect(mockProductRepo.findOne).toHaveBeenCalledWith({
          where: { id: 'prod-1' },
          relations: { images: true },
        });
      });

      it('PROD-UNIT-033: should throw NotFoundException if product does not exist', async () => {
        mockProductRepo.findOne.mockResolvedValue(null);

        await expect(productService.findOneForAdmin('missing')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('approve', () => {
      it('PROD-UNIT-014: should approve PENDING product in a transaction and notify seller', async () => {
        mockProductRepo.findOne.mockResolvedValue({
          ...makeProduct({ status: ProductStatus.PENDING }),
          shop: { ...mockShop },
        });

        const result = await productService.approve('admin-1', 'prod-1');

        expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
        expect(mockProductRepo.findOne).toHaveBeenCalledWith(Product, {
          where: { id: 'prod-1' },
          relations: { images: true, shop: true },
        });
        expect(mockProductRepo.save).toHaveBeenCalledWith(
          Product,
          expect.objectContaining({
            status: ProductStatus.ACTIVE,
            approvedBy: 'admin-1',
            approvedAt: expect.any(Date) as unknown,
            rejectionReason: null,
          }),
        );
        expect(mockNotificationsService.create).toHaveBeenCalledWith(
          expect.anything(),
          'seller-1',
          'Your product has been approved',
          expect.stringContaining('Phone'),
        );
        expect(result).toEqual(expect.objectContaining({ id: 'prod-1' }));
      });

      it('PROD-UNIT-034: should throw NotFoundException if product does not exist', async () => {
        mockProductRepo.findOne.mockResolvedValue(null);

        await expect(
          productService.approve('admin-1', 'prod-1'),
        ).rejects.toThrow(NotFoundException);
        expect(mockNotificationsService.create).not.toHaveBeenCalled();
      });

      it('PROD-UNIT-035: should throw BadRequestException if product is not PENDING', async () => {
        mockProductRepo.findOne.mockResolvedValue({
          ...makeProduct({ status: ProductStatus.ACTIVE }),
          shop: { ...mockShop },
        });

        await expect(
          productService.approve('admin-1', 'prod-1'),
        ).rejects.toThrow(BadRequestException);
        expect(mockProductRepo.save).not.toHaveBeenCalled();
        expect(mockNotificationsService.create).not.toHaveBeenCalled();
      });
    });

    describe('reject', () => {
      it('PROD-UNIT-036: should reject PENDING product with reason and notify seller', async () => {
        mockProductRepo.findOne.mockResolvedValue({
          ...makeProduct({ status: ProductStatus.PENDING }),
          shop: { ...mockShop },
        });

        await productService.reject('admin-1', 'prod-1', 'Bad');

        expect(mockProductRepo.save).toHaveBeenCalledWith(
          Product,
          expect.objectContaining({
            status: ProductStatus.REJECTED,
            rejectionReason: 'Bad',
            approvedBy: 'admin-1',
            approvedAt: null,
          }),
        );
        expect(mockNotificationsService.create).toHaveBeenCalledWith(
          expect.anything(),
          'seller-1',
          'Your product has been rejected',
          expect.stringContaining('Reason: Bad'),
        );
      });

      it('PROD-UNIT-037: should throw NotFoundException if product does not exist', async () => {
        mockProductRepo.findOne.mockResolvedValue(null);

        await expect(
          productService.reject('admin-1', 'prod-1', 'Bad'),
        ).rejects.toThrow(NotFoundException);
      });

      it('PROD-UNIT-038: should throw BadRequestException if product is not PENDING', async () => {
        mockProductRepo.findOne.mockResolvedValue({
          ...makeProduct({ status: ProductStatus.ACTIVE }),
          shop: { ...mockShop },
        });

        await expect(
          productService.reject('admin-1', 'prod-1', 'Bad'),
        ).rejects.toThrow(BadRequestException);
        expect(mockProductRepo.save).not.toHaveBeenCalled();
      });
    });

    describe('removeByAdmin', () => {
      it('PROD-UNIT-039: should remove ACTIVE product for violation and notify seller', async () => {
        mockProductRepo.findOne.mockResolvedValue({
          ...makeProduct({ status: ProductStatus.ACTIVE }),
          shop: { ...mockShop },
        });

        await productService.removeByAdmin('prod-1', 'Violation');

        expect(mockProductRepo.save).toHaveBeenCalledWith(
          Product,
          expect.objectContaining({
            status: ProductStatus.REMOVED,
            removedReason: 'Violation',
          }),
        );
        expect(mockNotificationsService.create).toHaveBeenCalledWith(
          expect.anything(),
          'seller-1',
          'Your product has been removed',
          expect.stringContaining('Reason: Violation'),
        );
      });

      it('PROD-UNIT-040: should throw NotFoundException if product does not exist', async () => {
        mockProductRepo.findOne.mockResolvedValue(null);

        await expect(
          productService.removeByAdmin('prod-1', 'Violation'),
        ).rejects.toThrow(NotFoundException);
      });

      it('PROD-UNIT-041: should throw BadRequestException if product status is not removable', async () => {
        mockProductRepo.findOne.mockResolvedValue({
          ...makeProduct({ status: ProductStatus.PENDING }),
          shop: { ...mockShop },
        });

        await expect(
          productService.removeByAdmin('prod-1', 'Violation'),
        ).rejects.toThrow(BadRequestException);
        expect(mockProductRepo.save).not.toHaveBeenCalled();
        expect(mockNotificationsService.create).not.toHaveBeenCalled();
      });
    });

    describe('remove', () => {
      it('PROD-UNIT-003: should soft delete product and delete related images on Cloudinary', async () => {
        asSeller();
        mockProductRepo.findOne.mockResolvedValue(makeProduct());
        mockImageRepo.find.mockResolvedValue([
          { imageUrl: 'http://img/1' },
          { imageUrl: 'http://img/2' },
        ]);
        mockCloudinaryService.extractPublicId
          .mockReturnValueOnce('pid-1')
          .mockReturnValueOnce('pid-2');

        await productService.remove('seller-1', 'prod-1');

        expect(mockImageRepo.find).toHaveBeenCalledWith({
          where: { productId: 'prod-1' },
        });
        expect(mockCloudinaryService.deleteFiles).toHaveBeenCalledWith([
          'pid-1',
          'pid-2',
        ]);
        expect(mockProductRepo.softDelete).toHaveBeenCalledWith('prod-1');
      });

      it('PROD-UNIT-042: should only soft delete when product has no images', async () => {
        asSeller();
        mockProductRepo.findOne.mockResolvedValue(makeProduct());
        mockImageRepo.find.mockResolvedValue([]);

        await productService.remove('seller-1', 'prod-1');

        expect(mockCloudinaryService.extractPublicId).not.toHaveBeenCalled();
        expect(mockCloudinaryService.deleteFiles).not.toHaveBeenCalled();
        expect(mockProductRepo.softDelete).toHaveBeenCalledWith('prod-1');
      });

      it('PROD-UNIT-043: should skip Cloudinary deletion when no publicId can be extracted', async () => {
        asSeller();
        mockProductRepo.findOne.mockResolvedValue(makeProduct());
        mockImageRepo.find.mockResolvedValue([{ imageUrl: 'http://img/1' }]);
        mockCloudinaryService.extractPublicId.mockReturnValue(null);

        await productService.remove('seller-1', 'prod-1');

        expect(mockCloudinaryService.deleteFiles).not.toHaveBeenCalled();
        expect(mockProductRepo.softDelete).toHaveBeenCalledWith('prod-1');
      });
    });

    describe('hide / unhide', () => {
      it('PROD-UNIT-007: should hide then unhide product and restore previous status', async () => {
        asSeller();
        mockProductRepo.findOne.mockResolvedValueOnce(
          makeProduct({ status: ProductStatus.ACTIVE }),
        );

        const hidden = await productService.hide('seller-1', 'prod-1');

        expect(hidden).toEqual(
          expect.objectContaining({
            status: ProductStatus.HIDDEN,
            statusBeforeHide: ProductStatus.ACTIVE,
          }),
        );

        mockProductRepo.findOne.mockResolvedValueOnce(hidden);

        const restored = await productService.unhide('seller-1', 'prod-1');

        expect(restored).toEqual(
          expect.objectContaining({
            status: ProductStatus.ACTIVE,
            statusBeforeHide: null,
          }),
        );
      });

      it('PROD-UNIT-044: should hide OUT_OF_STOCK product and remember previous status', async () => {
        asSeller();
        mockProductRepo.findOne.mockResolvedValue(
          makeProduct({ status: ProductStatus.OUT_OF_STOCK }),
        );

        const result = await productService.hide('seller-1', 'prod-1');

        expect(result).toEqual(
          expect.objectContaining({
            status: ProductStatus.HIDDEN,
            statusBeforeHide: ProductStatus.OUT_OF_STOCK,
          }),
        );
      });

      it('PROD-UNIT-045: should throw BadRequestException when hiding a PENDING product', async () => {
        asSeller();
        mockProductRepo.findOne.mockResolvedValue(makeProduct());

        await expect(productService.hide('seller-1', 'prod-1')).rejects.toThrow(
          BadRequestException,
        );
        expect(mockProductRepo.save).not.toHaveBeenCalled();
      });

      it('PROD-UNIT-046: should throw BadRequestException when unhiding a non-hidden product', async () => {
        asSeller();
        mockProductRepo.findOne.mockResolvedValue(
          makeProduct({ status: ProductStatus.ACTIVE }),
        );

        await expect(
          productService.unhide('seller-1', 'prod-1'),
        ).rejects.toThrow(BadRequestException);
        expect(mockProductRepo.save).not.toHaveBeenCalled();
      });

      it('PROD-UNIT-047: should unhide to ACTIVE when statusBeforeHide is missing', async () => {
        asSeller();
        mockProductRepo.findOne.mockResolvedValue(
          makeProduct({
            status: ProductStatus.HIDDEN,
            statusBeforeHide: null,
          }),
        );

        const result = await productService.unhide('seller-1', 'prod-1');

        expect(result).toEqual(
          expect.objectContaining({
            status: ProductStatus.ACTIVE,
            statusBeforeHide: null,
          }),
        );
      });
    });

    describe('findPendingOrThrow (private)', () => {
      const callPrivate = (id: string) =>
        (
          productService as unknown as {
            findPendingOrThrow(id: string): Promise<Product>;
          }
        ).findPendingOrThrow(id);

      it('PROD-UNIT-048: should throw NotFoundException if product does not exist', async () => {
        mockProductRepo.findOne.mockResolvedValue(null);

        await expect(callPrivate('prod-1')).rejects.toThrow(NotFoundException);
      });

      it('PROD-UNIT-049: should throw BadRequestException if product is not PENDING', async () => {
        mockProductRepo.findOne.mockResolvedValue(
          makeProduct({ status: ProductStatus.ACTIVE }),
        );

        await expect(callPrivate('prod-1')).rejects.toThrow(
          BadRequestException,
        );
      });

      it('PROD-UNIT-050: should return product when it is PENDING', async () => {
        const product = makeProduct({ status: ProductStatus.PENDING });
        mockProductRepo.findOne.mockResolvedValue(product);

        await expect(callPrivate('prod-1')).resolves.toBe(product);
        expect(mockProductRepo.findOne).toHaveBeenCalledWith({
          where: { id: 'prod-1' },
          relations: { images: true },
        });
      });
    });

    describe('search', () => {
      it('PROD-UNIT-004: should apply all filters and sorting using QueryBuilder', async () => {
        const items = [makeListItem('p1')];
        mockQueryBuilder.getManyAndCount.mockResolvedValue([items, 1]);
        mockQueryBuilder.getMany.mockResolvedValue([
          { id: 'p1', images: [{ id: 'img-1' }] },
        ]);
        const dto = {
          keyword: 'phone',
          categoryId: validUUID,
          shopId: 'shop-1',
          minPrice: 100,
          maxPrice: 5000,
          minRating: 4,
          sortBy: ProductSortBy.PRICE_ASC,
          page: 1,
          limit: 10,
        } as unknown as SearchProductDto;

        const result = await productService.search(dto);

        expect(mockProductRepo.createQueryBuilder).toHaveBeenNthCalledWith(
          1,
          'product',
        );
        expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
          'product.shop',
          'shop',
          'shop.status = :shopStatus',
          { shopStatus: ShopStatus.ACTIVE },
        );
        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'product.status = :status',
          { status: 'active' },
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(6);
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          expect.stringContaining('product.name ILIKE :keyword'),
          { keyword: '%phone%' },
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'product.categoryId = :categoryId',
          { categoryId: validUUID },
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'product.shopId = :shopId',
          { shopId: 'shop-1' },
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'product.basePrice >= :minPrice',
          { minPrice: 100 },
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'product.basePrice <= :maxPrice',
          { maxPrice: 5000 },
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'product.avgRating >= :minRating',
          { minRating: 4 },
        );
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
          'product.basePrice',
          'ASC',
        );
        expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
        expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
        expect(result).toBeInstanceOf(SearchProductResponseDto);
        expect(result.total).toBe(1);
      });

      it('PROD-UNIT-006: should return empty result when no product matches', async () => {
        mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([[], 0]);
        const dto = { page: 1, limit: 10 } as unknown as SearchProductDto;

        const result = await productService.search(dto);

        expect(result.total).toBe(0);
        expect(result).toEqual(new SearchProductResponseDto([], 0, 1, 10));
        expect(mockProductRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
        expect(mockQueryBuilder.getMany).not.toHaveBeenCalled();
      });

      it.each([
        [
          'PROD-UNIT-051',
          ProductSortBy.PRICE_DESC,
          'product.basePrice',
          'DESC',
        ],
        [
          'PROD-UNIT-052',
          ProductSortBy.BEST_SELLING,
          'product.soldCount',
          'DESC',
        ],
        ['PROD-UNIT-053', ProductSortBy.RATING, 'product.avgRating', 'DESC'],
      ])(
        '%s: should order by expected column when sortBy=%s',
        async (_id, sortBy, column, direction) => {
          const dto = {
            sortBy,
            page: 1,
            limit: 10,
          } as unknown as SearchProductDto;

          await productService.search(dto);

          expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
            column,
            direction,
          );
        },
      );

      it('PROD-UNIT-054: should default to newest order and add no filter when only pagination is given', async () => {
        const dto = { page: 1, limit: 10 } as unknown as SearchProductDto;

        await productService.search(dto);

        expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
          'product.createdAt',
          'DESC',
        );
      });

      it('PROD-UNIT-055: should attach images to items and fall back to [] when a product has none', async () => {
        const items = [makeListItem('p1'), makeListItem('p2')];
        mockQueryBuilder.getManyAndCount.mockResolvedValue([items, 2]);
        mockQueryBuilder.getMany.mockResolvedValue([
          { id: 'p1', images: [{ id: 'img-1' }] },
        ]);
        const dto = { page: 1, limit: 10 } as unknown as SearchProductDto;

        const result = await productService.search(dto);

        expect(mockProductRepo.createQueryBuilder).toHaveBeenCalledTimes(2);
        expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
          'product.images',
          'images',
        );
        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'product.id IN (:...productIds)',
          { productIds: ['p1', 'p2'] },
        );
        expect(items[0].images).toEqual([{ id: 'img-1' }]);
        expect(items[1].images).toEqual([]);
        expect(result.total).toBe(2);
      });

      it('PROD-UNIT-056: should not ignore zero values of minPrice, maxPrice and minRating', async () => {
        const dto = {
          minPrice: 0,
          maxPrice: 0,
          minRating: 0,
          page: 1,
          limit: 10,
        } as unknown as SearchProductDto;

        await productService.search(dto);

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3);
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'product.basePrice >= :minPrice',
          { minPrice: 0 },
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'product.basePrice <= :maxPrice',
          { maxPrice: 0 },
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'product.avgRating >= :minRating',
          { minRating: 0 },
        );
      });
    });
  });

  // 2. PRODUCT IMAGE SERVICE
  describe('ProductImageService', () => {
    it('PROD-UNIT-008: should upload images and set isPrimary=true only for the first image when product has no image', async () => {
      asSeller();
      mockProductRepo.findOne.mockResolvedValue(makeProduct());
      mockImageRepo.count.mockResolvedValue(0);
      mockCloudinaryService.uploadMultiple.mockResolvedValue([
        { secure_url: 'http://img.com/1' },
        { secure_url: 'http://img.com/2' },
      ]);
      const files = [{}, {}] as unknown as Express.Multer.File[];

      const result = await productImageService.uploadImages(
        'seller-1',
        'prod-1',
        files,
      );

      expect(mockCloudinaryService.uploadMultiple).toHaveBeenCalled();
      expect(mockImageRepo.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ isPrimary: true }),
      );
      expect(mockImageRepo.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ isPrimary: false }),
      );
      expect(mockImageRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('PROD-UNIT-015: should attach images by URLs successfully', async () => {
      asSeller();
      mockProductRepo.findOne.mockResolvedValue(makeProduct());
      mockImageRepo.count.mockResolvedValue(1);
      const items = [{ url: 'http://img.com/2', publicId: '2' }];

      await productImageService.attachImages('seller-1', 'prod-1', items);

      expect(mockImageRepo.save).toHaveBeenCalled();
    });

    it('PROD-UNIT-057: should fetch images by product id', async () => {
      mockImageRepo.find.mockResolvedValue([{ id: 'img-1' }]);

      const result = await productImageService.findByProduct('prod-1');

      expect(result.length).toBe(1);
    });

    it('PROD-UNIT-009: should set another image as primary and unset the old one', async () => {
      asSeller();
      mockProductRepo.findOne.mockResolvedValue(makeProduct());
      mockImageRepo.findOne.mockResolvedValue({
        id: 'img-1',
        productId: 'prod-1',
        isPrimary: false,
      });

      await productImageService.setPrimary('seller-1', 'prod-1', 'img-1');

      expect(mockImageRepo.update).toHaveBeenCalledWith(
        { productId: 'prod-1', isPrimary: true },
        { isPrimary: false },
      );
      expect(mockImageRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'img-1', isPrimary: true }),
      );
    });

    it('PROD-UNIT-017: should skip DB update when image is already primary', async () => {
      asSeller();
      mockProductRepo.findOne.mockResolvedValue(makeProduct());
      mockImageRepo.findOne.mockResolvedValue({
        id: 'img-1',
        productId: 'prod-1',
        isPrimary: true,
      });

      const result = await productImageService.setPrimary(
        'seller-1',
        'prod-1',
        'img-1',
      );

      expect(mockImageRepo.update).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ id: 'img-1' }));
    });

    it('PROD-UNIT-016: should reorder images by updating displayOrder', async () => {
      asSeller();
      mockProductRepo.findOne.mockResolvedValue(makeProduct());
      const img1 = { id: 'img-1', displayOrder: 0 };
      const img2 = { id: 'img-2', displayOrder: 1 };
      mockImageRepo.find.mockResolvedValue([img1, img2]);

      await productImageService.reorder('seller-1', 'prod-1', [
        'img-2',
        'img-1',
      ]);

      expect(img2.displayOrder).toBeLessThan(img1.displayOrder);
      expect(mockImageRepo.save).toHaveBeenCalled();
    });

    it('PROD-UNIT-010: should remove primary image and promote the next image as primary', async () => {
      asSeller();
      mockProductRepo.findOne.mockResolvedValue(makeProduct());
      mockImageRepo.findOne
        .mockResolvedValueOnce({
          id: 'img-1',
          productId: 'prod-1',
          isPrimary: true,
          displayOrder: 0,
        })
        .mockResolvedValueOnce({
          id: 'img-2',
          productId: 'prod-1',
          isPrimary: false,
          displayOrder: 1,
        });

      await productImageService.remove('seller-1', 'prod-1', 'img-1');

      expect(mockImageRepo.remove).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'img-1' }),
      );
      expect(mockImageRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'img-2', isPrimary: true }),
      );
    });

    it('PROD-UNIT-058: should throw ForbiddenException if image does not belong to product', async () => {
      asSeller();
      mockProductRepo.findOne.mockResolvedValue(makeProduct());
      mockImageRepo.findOne.mockResolvedValue({
        id: 'img-1',
        productId: 'other-prod',
      });

      await expect(
        productImageService.remove('seller-1', 'prod-1', 'img-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockImageRepo.remove).not.toHaveBeenCalled();
    });
  });
});
