import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';

import { ProductService } from './product.service';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { Shop } from '../shops/entities/shop.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ProductStatus } from '../../common/enums/product-status.enum';
import { ShopStatus } from '../../common/enums/shop-status.enum';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';

type MockRepository<T extends ObjectLiteral = any> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepository = <
  T extends ObjectLiteral = any,
>(): MockRepository<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  findOneOrFail: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  softDelete: jest.fn(),
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
    productRepo = module.get(getRepositoryToken(Product));
    shopRepo = module.get(getRepositoryToken(Shop));
    imageRepo = module.get(getRepositoryToken(ProductImage));
    cloudinaryService = module.get(CloudinaryService);
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
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo
        .findOne!.mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...baseProduct });
      productRepo.create!.mockReturnValue({ ...baseProduct });
      productRepo.save!.mockResolvedValue({ ...baseProduct });

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

    it('seller has no shop -> NotFoundException', async () => {
      shopRepo.findOne!.mockResolvedValue(null);

      await expect(service.create('seller-id-1', createDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(productRepo.create).not.toHaveBeenCalled();
    });

    it('shop is not active -> ForbiddenException', async () => {
      shopRepo.findOne!.mockResolvedValue({
        ...mockShop,
        status: ShopStatus.PENDING,
      });

      await expect(service.create('seller-id-1', createDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(productRepo.create).not.toHaveBeenCalled();
    });

    it('duplicate slug within the same shop -> ConflictException', async () => {
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo.findOne!.mockResolvedValueOnce({ ...baseProduct });

      await expect(service.create('seller-id-1', createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(productRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto: UpdateProductDto = {
      name: 'New name',
    };

    it('updates an owned product and resets ACTIVE back to PENDING', async () => {
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo
        .findOne!.mockResolvedValueOnce({
          ...baseProduct,
          status: ProductStatus.ACTIVE,
        })
        .mockResolvedValueOnce({
          ...baseProduct,
          name: 'New name',
          status: ProductStatus.PENDING,
        });
      productRepo.save!.mockResolvedValue({});

      const result = await service.update(
        'seller-id-1',
        baseProduct.id,
        updateDto,
      );

      expect(result.status).toBe(ProductStatus.PENDING);
      expect(result.name).toBe('New name');
    });

    it('product not owned by seller -> ForbiddenException', async () => {
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo.findOne!.mockResolvedValueOnce({
        ...baseProduct,
        shopId: 'other-shop-id',
      });

      await expect(
        service.update('seller-id-1', baseProduct.id, updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('product does not exist -> NotFoundException', async () => {
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo.findOne!.mockResolvedValueOnce(null);

      await expect(
        service.update('seller-id-1', 'not-exist', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('seller has no shop -> NotFoundException', async () => {
      shopRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.update('seller-id-1', baseProduct.id, updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMyProducts', () => {
    it('returns paginated products for the seller shop', async () => {
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo.findAndCount!.mockResolvedValue([[baseProduct], 1]);

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
      shopRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.findMyProducts('seller-id-1', { page: 1, limit: 20 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('applies correct skip/take for page 2', async () => {
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo.findAndCount!.mockResolvedValue([[], 0]);

      await service.findMyProducts('seller-id-1', { page: 2, limit: 10 });

      expect(productRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('returns an empty list with total 0 when the shop has no products', async () => {
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo.findAndCount!.mockResolvedValue([[], 0]);

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
      productRepo.findAndCount!.mockResolvedValue([[activeProduct], 1]);

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
      productRepo.findAndCount!.mockResolvedValue([[], 0]);

      await service.findPublicByShop(mockShop.id, { page: 2, limit: 10 });

      expect(productRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('does not require the seller to be logged in (no shop ownership check)', async () => {
      productRepo.findAndCount!.mockResolvedValue([[], 0]);

      await service.findPublicByShop(mockShop.id, { page: 1, limit: 20 });

      expect(shopRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findForAdmin', () => {
    it('returns only PENDING products, ordered ASC, paginated', async () => {
      productRepo.findAndCount!.mockResolvedValue([[baseProduct], 1]);

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
      productRepo.findAndCount!.mockResolvedValue([[], 0]);

      await service.findForAdmin({ page: 2, limit: 10 });

      expect(productRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('returns an empty list with total 0 when there is nothing pending', async () => {
      productRepo.findAndCount!.mockResolvedValue([[], 0]);

      const result = await service.findForAdmin({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findOneProductDetail', () => {
    it('returns product details when found', async () => {
      productRepo.findOne!.mockResolvedValue({ ...baseProduct });

      const result = await service.findOneProductDetail(baseProduct.id);

      expect(result).toBeDefined();
    });

    it('product not found -> NotFoundException', async () => {
      productRepo.findOne!.mockResolvedValue(null);

      await expect(service.findOneProductDetail('not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('approve', () => {
    it('approves a pending product successfully', async () => {
      productRepo.findOne!.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.PENDING,
      });
      productRepo.save!.mockImplementation((data: any) =>
        Promise.resolve(data),
      );
      productRepo.findOneOrFail!.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.ACTIVE,
        approvedBy: 'admin-1',
      });

      const result = await service.approve('admin-1', baseProduct.id);

      expect(result.status).toBe(ProductStatus.ACTIVE);
      expect(result.approvedBy).toBe('admin-1');
    });

    it('product not pending -> BadRequestException', async () => {
      productRepo.findOne!.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.ACTIVE,
      });

      await expect(service.approve('admin-1', baseProduct.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('product does not exist -> NotFoundException', async () => {
      productRepo.findOne!.mockResolvedValue(null);

      await expect(service.approve('admin-1', 'not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reject', () => {
    it('rejects a pending product with a reason', async () => {
      productRepo.findOne!.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.PENDING,
      });
      productRepo.save!.mockImplementation((data: any) =>
        Promise.resolve(data),
      );
      productRepo.findOneOrFail!.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.REJECTED,
        rejectionReason: 'Invalid images',
      });

      const result = await service.reject(
        'admin-1',
        baseProduct.id,
        'Invalid images',
      );

      expect(result.status).toBe(ProductStatus.REJECTED);
      expect(result.rejectionReason).toBe('Invalid images');
    });

    it('product not pending -> BadRequestException', async () => {
      productRepo.findOne!.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.ACTIVE,
      });

      await expect(
        service.reject('admin-1', baseProduct.id, 'reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('product does not exist -> NotFoundException', async () => {
      productRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.reject('admin-1', 'not-exist', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeByAdmin', () => {
    it('removes an active product with a reason', async () => {
      productRepo.findOne!.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.ACTIVE,
      });
      productRepo.save!.mockImplementation((data: any) =>
        Promise.resolve(data),
      );

      const result = await service.removeByAdmin(baseProduct.id, 'Fraud');

      expect(result.status).toBe(ProductStatus.REMOVED);
      expect(result.removedReason).toBe('Fraud');
    });

    it('removes a HIDDEN product with a reason (also a removable status)', async () => {
      productRepo.findOne!.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.HIDDEN,
      });
      productRepo.save!.mockImplementation((data: any) =>
        Promise.resolve(data),
      );

      const result = await service.removeByAdmin(
        baseProduct.id,
        'Policy violation',
      );

      expect(result.status).toBe(ProductStatus.REMOVED);
    });

    it('product in a non-removable status -> BadRequestException', async () => {
      productRepo.findOne!.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.PENDING,
      });

      await expect(
        service.removeByAdmin(baseProduct.id, 'Fraud'),
      ).rejects.toThrow(BadRequestException);
    });

    it('product does not exist -> NotFoundException', async () => {
      productRepo.findOne!.mockResolvedValue(null);

      await expect(service.removeByAdmin('not-exist', 'Fraud')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes an owned product and cleans up cloudinary images', async () => {
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo.findOne!.mockResolvedValue({ ...baseProduct });
      imageRepo.find!.mockResolvedValue([
        { id: 'img-1', imageUrl: 'https://cdn/img1.jpg' },
      ]);
      cloudinaryService.extractPublicId.mockReturnValue('public-id-1');
      cloudinaryService.deleteFiles.mockResolvedValue(undefined);
      productRepo.softDelete!.mockResolvedValue({});

      await service.remove('seller-id-1', baseProduct.id);

      expect(cloudinaryService.deleteFiles).toHaveBeenCalledWith([
        'public-id-1',
      ]);
      expect(productRepo.softDelete).toHaveBeenCalledWith(baseProduct.id);
    });

    it('skips cloudinary cleanup when there are no images', async () => {
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo.findOne!.mockResolvedValue({ ...baseProduct });
      imageRepo.find!.mockResolvedValue([]);
      productRepo.softDelete!.mockResolvedValue({});

      await service.remove('seller-id-1', baseProduct.id);

      expect(cloudinaryService.deleteFiles).not.toHaveBeenCalled();
      expect(productRepo.softDelete).toHaveBeenCalledWith(baseProduct.id);
    });

    it('product not owned by seller -> ForbiddenException', async () => {
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo.findOne!.mockResolvedValue({
        ...baseProduct,
        shopId: 'other-shop-id',
      });

      await expect(
        service.remove('seller-id-1', baseProduct.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('product does not exist -> NotFoundException', async () => {
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo.findOne!.mockResolvedValue(null);

      await expect(service.remove('seller-id-1', 'not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('seller has no shop -> NotFoundException', async () => {
      shopRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.remove('seller-id-1', baseProduct.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('hide', () => {
    it('hides an active product and remembers its previous status', async () => {
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo.findOne!.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.ACTIVE,
      });
      productRepo.save!.mockImplementation((data: any) =>
        Promise.resolve(data),
      );

      const result = await service.hide('seller-id-1', baseProduct.id);

      expect(result.status).toBe(ProductStatus.HIDDEN);
      expect(result.statusBeforeHide).toBe(ProductStatus.ACTIVE);
    });

    it('product not active/out-of-stock -> BadRequestException', async () => {
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo.findOne!.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.PENDING,
      });

      await expect(service.hide('seller-id-1', baseProduct.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('product does not exist -> NotFoundException', async () => {
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo.findOne!.mockResolvedValue(null);

      await expect(service.hide('seller-id-1', 'not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('product not owned by seller -> ForbiddenException', async () => {
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo.findOne!.mockResolvedValue({
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
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo.findOne!.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.HIDDEN,
        statusBeforeHide: ProductStatus.ACTIVE,
      });
      productRepo.save!.mockImplementation((data: any) =>
        Promise.resolve(data),
      );

      const result = await service.unhide('seller-id-1', baseProduct.id);

      expect(result.status).toBe(ProductStatus.ACTIVE);
      expect(result.statusBeforeHide).toBeNull();
    });

    it('product not hidden -> BadRequestException', async () => {
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo.findOne!.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.ACTIVE,
      });

      await expect(
        service.unhide('seller-id-1', baseProduct.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('product does not exist -> NotFoundException', async () => {
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo.findOne!.mockResolvedValue(null);

      await expect(service.unhide('seller-id-1', 'not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('product not owned by seller -> ForbiddenException', async () => {
      shopRepo.findOne!.mockResolvedValue({ ...mockShop });
      productRepo.findOne!.mockResolvedValue({
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

  describe('error propagation', () => {
    it('create: propagates the error when shopRepository throws', async () => {
      shopRepo.findOne!.mockRejectedValue(new Error('DB error'));

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
      productRepo.findOne!.mockRejectedValue(new Error('DB down'));

      await expect(service.approve('admin-1', baseProduct.id)).rejects.toThrow(
        'DB down',
      );
    });

    it('findOneProductDetail: propagates the error when productRepository throws', async () => {
      productRepo.findOne!.mockRejectedValue(new Error('DB error'));

      await expect(
        service.findOneProductDetail(baseProduct.id),
      ).rejects.toThrow('DB error');
    });
  });
});
