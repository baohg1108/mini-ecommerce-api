import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  BadRequestException,
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
import { SearchProductDto } from './dtos/search-product.dto'; // Đã bỏ ProductSortBy thừa

describe('Product Module Services (ProductService & ProductImageService)', () => {
  let productService: ProductService;
  let productImageService: ProductImageService;

  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

  // --- MOCKS ---
  const mockQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };

  const mockProductRepo = {
    findOne: jest.fn(),
    create: jest
      .fn()
      .mockImplementation((dto: CreateProductDto): Partial<Product> => {
        return { id: 'prod-1', ...dto };
      }),
    save: jest
      .fn()
      .mockImplementation(
        (prod: Partial<Product>): Promise<Partial<Product>> => {
          return Promise.resolve({ id: 'prod-1', ...prod });
        },
      ),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockShopRepo = {
    findOne: jest.fn(),
  };

  const mockImageRepo = {
    count: jest.fn(),
    create: jest
      .fn()
      .mockImplementation(
        (img: Partial<ProductImage>): Partial<ProductImage> => img,
      ),
    save: jest.fn().mockImplementation((data: any) => Promise.resolve(data)),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockCloudinaryService = {
    uploadMultiple: jest.fn(),
    extractPublicId: jest.fn().mockReturnValue('public_id_1'),
    deleteFiles: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest
      .fn()
      .mockImplementation(
        async (cb: (manager: EntityManager) => Promise<Product>) => {
          const manager = {
            findOne: mockProductRepo.findOne,
            save: mockProductRepo.save,
          } as unknown as EntityManager;
          const result = await cb(manager);
          return result;
        },
      ),
  };

  beforeEach(async () => {
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

    jest.clearAllMocks();
  });

  const mockShop = {
    id: 'shop-1',
    userId: 'seller-1',
    status: ShopStatus.ACTIVE,
  };
  const mockProduct = {
    id: 'prod-1',
    shopId: 'shop-1',
    name: 'Phone',
    status: ProductStatus.PENDING,
  };

  // ==========================================
  // 1. PRODUCT SERVICE TESTS
  // ==========================================
  describe('ProductService', () => {
    describe('Happy Paths (Success Flows)', () => {
      it('should create a new product successfully', async () => {
        mockShopRepo.findOne.mockResolvedValue(mockShop);
        mockProductRepo.findOne.mockResolvedValueOnce(null);
        mockProductRepo.findOne.mockResolvedValueOnce({
          id: 'prod-1',
          name: 'Test',
        });

        const dto = {
          categoryId: validUUID,
          name: 'Test',
          slug: 'test',
          basePrice: 1000,
        } as unknown as CreateProductDto;
        const result = await productService.create('seller-1', dto);

        expect(mockProductRepo.save).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('should update product successfully', async () => {
        mockShopRepo.findOne.mockResolvedValue(mockShop);
        mockProductRepo.findOne.mockResolvedValue({
          ...mockProduct,
          status: ProductStatus.ACTIVE,
        });
        const dto = { name: 'Updated' } as unknown as CreateProductDto;
        await productService.update('seller-1', 'prod-1', dto);
        expect(mockProductRepo.save).toHaveBeenCalled();
      });

      it('should hide and unhide product successfully', async () => {
        mockShopRepo.findOne.mockResolvedValue(mockShop);

        mockProductRepo.findOne.mockResolvedValueOnce({
          ...mockProduct,
          status: ProductStatus.ACTIVE,
        });
        await productService.hide('seller-1', 'prod-1');
        expect(mockProductRepo.save).toHaveBeenCalled();

        mockProductRepo.findOne.mockResolvedValueOnce({
          ...mockProduct,
          status: ProductStatus.HIDDEN,
          statusBeforeHide: ProductStatus.ACTIVE,
        });
        await productService.unhide('seller-1', 'prod-1');
        expect(mockProductRepo.save).toHaveBeenCalled();
      });

      it('should return paginated data for admin and public', async () => {
        mockProductRepo.findAndCount.mockResolvedValue([[{ id: 'prod-1' }], 1]);

        const adminRes = await productService.findForAdmin({
          page: 1,
          limit: 10,
        });
        expect(adminRes.total).toBe(1);

        const publicRes = await productService.findPublicByShop('shop-1', {
          page: 1,
          limit: 10,
        });
        expect(publicRes.total).toBe(1);
      });

      it('should return admin product details successfully', async () => {
        mockProductRepo.findOne.mockResolvedValue(mockProduct);
        const result = await productService.findOneForAdmin('prod-1');
        expect(result).toBeDefined();
      });

      it('should execute full transaction when admin approves/rejects/removes product', async () => {
        // Đảm bảo status là PENDING để thỏa mãn điều kiện của hàm approve và reject
        mockProductRepo.findOne.mockResolvedValueOnce({
          ...mockProduct,
          status: ProductStatus.PENDING,
          shop: mockShop,
        });
        await productService.approve('admin-1', 'prod-1');

        mockProductRepo.findOne.mockResolvedValueOnce({
          ...mockProduct,
          status: ProductStatus.PENDING,
          shop: mockShop,
        });
        await productService.reject('admin-1', 'prod-1', 'Bad');

        // Riêng removeByAdmin yêu cầu status là ACTIVE/HIDDEN/OUT_OF_STOCK
        mockProductRepo.findOne.mockResolvedValueOnce({
          ...mockProduct,
          status: ProductStatus.ACTIVE,
          shop: mockShop,
        });
        await productService.removeByAdmin('prod-1', 'Violation');

        expect(mockProductRepo.save).toHaveBeenCalledTimes(3);
        expect(mockNotificationsService.create).toHaveBeenCalledTimes(3);
      });

      it('should return empty search response if no items found (Cover lines 420-424)', async () => {
        mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([[], 0]);
        const dto = { page: 1, limit: 10 } as unknown as SearchProductDto;
        const result = await productService.search(dto);
        expect(result.total).toBe(0); // Kiểm tra total = 0 thay vì dùng .data
      });
    });

    describe('Negative Tests (Exceptions)', () => {
      it('TC-333: Hide Product - should throw 400 if status is pending', async () => {
        mockShopRepo.findOne.mockResolvedValue(mockShop);
        mockProductRepo.findOne.mockResolvedValue(mockProduct);
        await expect(productService.hide('seller-1', 'prod-1')).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should throw NotFoundException if product ID does not exist in get detail', async () => {
        mockProductRepo.findOne.mockResolvedValue(null);
        await expect(
          productService.findOneProductDetail('invalid-id'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ==========================================
  // 2. PRODUCT IMAGE SERVICE TESTS
  // ==========================================
  describe('ProductImageService', () => {
    describe('Happy Paths (Success Flows)', () => {
      it('should upload images successfully and assign primary to first image', async () => {
        mockShopRepo.findOne.mockResolvedValue(mockShop);
        mockProductRepo.findOne.mockResolvedValue(mockProduct);
        mockImageRepo.count.mockResolvedValue(0);
        mockCloudinaryService.uploadMultiple.mockResolvedValue([
          { secure_url: 'http://img.com/1' },
        ]);

        const files = [{}] as unknown as Express.Multer.File[];
        const result = await productImageService.uploadImages(
          'seller-1',
          'prod-1',
          files,
        );

        expect(mockCloudinaryService.uploadMultiple).toHaveBeenCalled();
        expect(mockImageRepo.save).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('should attach images by URLs successfully', async () => {
        mockShopRepo.findOne.mockResolvedValue(mockShop);
        mockProductRepo.findOne.mockResolvedValue(mockProduct);
        mockImageRepo.count.mockResolvedValue(1);

        const items = [{ url: 'http://img.com/2', publicId: '2' }];
        await productImageService.attachImages('seller-1', 'prod-1', items);

        expect(mockImageRepo.save).toHaveBeenCalled();
      });

      it('should fetch images by product id', async () => {
        mockImageRepo.find.mockResolvedValue([{ id: 'img-1' }]);
        const result = await productImageService.findByProduct('prod-1');
        expect(result.length).toBe(1);
      });

      it('should set an image as primary', async () => {
        mockShopRepo.findOne.mockResolvedValue(mockShop);
        mockProductRepo.findOne.mockResolvedValue(mockProduct);
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
        expect(mockImageRepo.save).toHaveBeenCalled();
      });

      it('should skip setting primary if image is already primary', async () => {
        mockShopRepo.findOne.mockResolvedValue(mockShop);
        mockProductRepo.findOne.mockResolvedValue(mockProduct);
        mockImageRepo.findOne.mockResolvedValue({
          id: 'img-1',
          productId: 'prod-1',
          isPrimary: true,
        });

        await productImageService.setPrimary('seller-1', 'prod-1', 'img-1');
        expect(mockImageRepo.update).not.toHaveBeenCalled();
      });

      it('should reorder images successfully', async () => {
        mockShopRepo.findOne.mockResolvedValue(mockShop);
        mockProductRepo.findOne.mockResolvedValue(mockProduct);
        mockImageRepo.find.mockResolvedValue([
          { id: 'img-1' },
          { id: 'img-2' },
        ]);

        await productImageService.reorder('seller-1', 'prod-1', [
          'img-2',
          'img-1',
        ]);
        expect(mockImageRepo.save).toHaveBeenCalled();
      });

      it('should remove image and assign a new primary if the removed one was primary', async () => {
        mockShopRepo.findOne.mockResolvedValue(mockShop);
        mockProductRepo.findOne.mockResolvedValue(mockProduct);

        mockImageRepo.findOne.mockResolvedValueOnce({
          id: 'img-1',
          productId: 'prod-1',
          isPrimary: true,
        });
        mockImageRepo.findOne.mockResolvedValueOnce({
          id: 'img-2',
          productId: 'prod-1',
          isPrimary: false,
        });

        await productImageService.remove('seller-1', 'prod-1', 'img-1');

        expect(mockImageRepo.remove).toHaveBeenCalled();
        expect(mockImageRepo.save).toHaveBeenCalled();
      });
    });

    describe('Negative Tests (Exceptions)', () => {
      it('should throw ForbiddenException if image does not belong to product', async () => {
        mockShopRepo.findOne.mockResolvedValue(mockShop);
        mockProductRepo.findOne.mockResolvedValue(mockProduct);
        mockImageRepo.findOne.mockResolvedValue({
          id: 'img-1',
          productId: 'other-prod',
        });

        await expect(
          productImageService.remove('seller-1', 'prod-1', 'img-1'),
        ).rejects.toThrow(ForbiddenException);
      });
    });
  });
});
