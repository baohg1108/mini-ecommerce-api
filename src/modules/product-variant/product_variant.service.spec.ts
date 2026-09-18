import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ProductVariantService } from './product-variant.service';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';

describe('ProductVariantService Unit Test Cases (Service Only)', () => {
  let service: ProductVariantService;

  const mockVariantRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockProductRepository = {
    findOne: jest.fn(),
  };

  const mockEntityManager = {
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductVariantService,
        {
          provide: getRepositoryToken(ProductVariant),
          useValue: mockVariantRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
      ],
    }).compile();

    service = module.get<ProductVariantService>(ProductVariantService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const productId = 'product-id-1';
    const userId = 'user-id-1';

    it('TC-378: should successfully create a product variant when payload is valid', async () => {
      const dto = {
        sku: 'AO-THUN-DEN-M',
        price: 199000,
        stockQty: 50,
        attributes: { color: 'black', size: 'M' },
        imageUrl: 'https://cdn.example.com/v1.png',
      };

      mockProductRepository.findOne.mockResolvedValue({
        id: productId,
        shop: { userId },
      });
      mockVariantRepository.findOne.mockResolvedValue(null);
      mockVariantRepository.create.mockReturnValue({ ...dto, productId });
      mockVariantRepository.save.mockResolvedValue({
        id: 'variant-id-1',
        ...dto,
        productId,
      });

      const result = await service.create(productId, userId, dto);

      expect(result).toHaveProperty('id', 'variant-id-1');
      expect(mockVariantRepository.save).toHaveBeenCalled();
    });

    it('TC-383: should throw NotFoundException if product does not exist', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(productId, userId, {
          sku: 'SKU-1',
          price: 10,
          stockQty: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('TC-384: should throw NotFoundException if product shop does not belong to user', async () => {
      mockProductRepository.findOne.mockResolvedValue({
        id: productId,
        shop: { userId: 'other-user' },
      });

      await expect(
        service.create(productId, userId, {
          sku: 'SKU-1',
          price: 10,
          stockQty: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('TC-386: should throw ConflictException if SKU already exists system-wide', async () => {
      mockProductRepository.findOne.mockResolvedValue({
        id: productId,
        shop: { userId },
      });
      mockVariantRepository.findOne.mockResolvedValue({
        id: 'existing-id',
        sku: 'AO-THUN-DEN-M',
      });

      await expect(
        service.create(productId, userId, {
          sku: 'AO-THUN-DEN-M',
          price: 10,
          stockQty: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Upsert', () => {
    const productId = 'product-id-1';
    const userId = 'user-id-1';

    it('TC-420: should throw NotFoundException if product is not found on upsert', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(
        service.Upsert(productId, userId, { variants: [] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('TC-450: should throw NotFoundException if shop user does not match on upsert', async () => {
      mockProductRepository.findOne.mockResolvedValue({
        id: productId,
        shop: { userId: 'other-user' },
      });

      await expect(
        service.Upsert(productId, userId, { variants: [] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('TC-427: should process batch variants and isolate failures correctly', async () => {
      mockProductRepository.findOne.mockResolvedValue({
        id: productId,
        shop: { userId },
      });

      const existingVariant = {
        id: 'variant-1',
        productId,
        sku: 'SKU-EXISTING-1',
        price: 100,
        stockQty: 10,
      };

      mockVariantRepository.find.mockResolvedValue([existingVariant]);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([existingVariant]),
      };
      mockVariantRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      mockVariantRepository.create.mockImplementation(
        (item: Partial<ProductVariant>) => item,
      );
      mockVariantRepository.save.mockImplementation(
        (item: Partial<ProductVariant>) =>
          Promise.resolve({ ...item, id: item.id ?? 'generated-id' }),
      );

      const dto = {
        variants: [
          { id: 'variant-1', sku: 'SKU-EXISTING-1', price: 120, stockQty: 15 },
          { id: 'invalid-uuid-item', sku: 'SKU-X', price: 50, stockQty: 5 },
        ],
      };

      const result = await service.Upsert(productId, userId, dto);

      expect(result.succeeded.length).toBe(1);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].reason).toContain('Variant not found');
    });

    it('PV-UNIT-020: should throw ConflictException (isolated) when updating a variant to a SKU owned by another variant', async () => {
      mockProductRepository.findOne.mockResolvedValue({
        id: productId,
        shop: { userId },
      });

      const existingVariant = {
        id: 'variant-1',
        productId,
        sku: 'SKU-OLD',
        price: 100,
        stockQty: 10,
      };
      const otherVariant = {
        id: 'variant-2',
        productId,
        sku: 'SKU-TAKEN',
        price: 200,
        stockQty: 5,
      };

      mockVariantRepository.find.mockResolvedValue([
        existingVariant,
        otherVariant,
      ]);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        // sku-wide lookup returns the OTHER variant already owning SKU-TAKEN
        getMany: jest.fn().mockResolvedValue([otherVariant]),
      };
      mockVariantRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      mockVariantRepository.save.mockImplementation((item: any) =>
        Promise.resolve(item),
      );

      const dto = {
        variants: [
          { id: 'variant-1', sku: 'SKU-TAKEN', price: 150, stockQty: 20 },
        ],
      };

      const result = await service.Upsert(productId, userId, dto);

      expect(result.succeeded.length).toBe(0);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].reason).toContain('SKU already exists');
      expect(mockVariantRepository.save).not.toHaveBeenCalled();
    });

    it('PV-UNIT-021: should create a new variant when item has no id (create path)', async () => {
      mockProductRepository.findOne.mockResolvedValue({
        id: productId,
        shop: { userId },
      });

      mockVariantRepository.find.mockResolvedValue([]);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // no sku conflicts
      };
      mockVariantRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      mockVariantRepository.create.mockImplementation(
        (item: Partial<ProductVariant>) => item,
      );
      mockVariantRepository.save.mockImplementation(
        (item: Partial<ProductVariant>) =>
          Promise.resolve({ ...item, id: 'new-variant-id' }),
      );

      const dto = {
        variants: [{ sku: 'SKU-BRAND-NEW', price: 75, stockQty: 8 }],
      };

      const result = await service.Upsert(productId, userId, dto);

      expect(result.failed.length).toBe(0);
      expect(result.succeeded.length).toBe(1);
      expect(result.succeeded[0]).toHaveProperty('id', 'new-variant-id');
      expect(mockVariantRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ productId, sku: 'SKU-BRAND-NEW' }),
      );
    });

    it('PV-UNIT-022: should isolate ConflictException when creating a new variant with a SKU that already exists', async () => {
      mockProductRepository.findOne.mockResolvedValue({
        id: productId,
        shop: { userId },
      });

      mockVariantRepository.find.mockResolvedValue([]);

      const existingBySku = { id: 'variant-x', sku: 'SKU-DUP' };
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([existingBySku]),
      };
      mockVariantRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const dto = {
        variants: [{ sku: 'SKU-DUP', price: 30, stockQty: 2 }],
      };

      const result = await service.Upsert(productId, userId, dto);

      expect(result.succeeded.length).toBe(0);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].reason).toContain('SKU already exists');
      expect(mockVariantRepository.create).not.toHaveBeenCalled();
    });

    it('PV-UNIT-023: should prevent a later new item in the same batch from reusing a just-created SKU', async () => {
      mockProductRepository.findOne.mockResolvedValue({
        id: productId,
        shop: { userId },
      });

      mockVariantRepository.find.mockResolvedValue([]);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // no pre-existing conflicts
      };
      mockVariantRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      mockVariantRepository.create.mockImplementation(
        (item: Partial<ProductVariant>) => item,
      );
      mockVariantRepository.save.mockImplementation(
        (item: Partial<ProductVariant>) =>
          Promise.resolve({ ...item, id: `id-${item.sku}` }),
      );

      const dto = {
        variants: [
          { sku: 'SKU-BATCH', price: 10, stockQty: 1 },
          { sku: 'SKU-BATCH', price: 12, stockQty: 2 },
        ],
      };

      const result = await service.Upsert(productId, userId, dto);

      expect(result.succeeded.length).toBe(1);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].reason).toContain('SKU already exists');
    });
  });

  describe('findById & findBySku', () => {
    it('TC-457: should return a variant if found by id', async () => {
      const variant = { id: 'v-1', sku: 'SKU-1' };
      mockVariantRepository.findOne.mockResolvedValue(variant);

      const result = await service.findById('v-1');
      expect(result).toEqual(variant);
    });

    it('should throw NotFoundException if variant not found by id', async () => {
      mockVariantRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('v-1')).rejects.toThrow(NotFoundException);
    });

    it('should return a variant if found by sku', async () => {
      const variant = { id: 'v-1', sku: 'SKU-1' };
      mockVariantRepository.findOne.mockResolvedValue(variant);

      const result = await service.findBySku('SKU-1');
      expect(result).toEqual(variant);
    });

    it('should throw NotFoundException if variant not found by sku', async () => {
      mockVariantRepository.findOne.mockResolvedValue(null);

      await expect(service.findBySku('SKU-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const variantId = 'v-1';
    const userId = 'user-id-1';

    it('TC-436: should successfully update a variant with valid payload', async () => {
      const existingVariant = {
        id: variantId,
        sku: 'SKU-1',
        price: 100,
        stockQty: 10,
        product: { shop: { userId } },
      };

      mockVariantRepository.findOne.mockResolvedValueOnce(existingVariant);
      mockVariantRepository.findOne.mockResolvedValueOnce(null);
      mockVariantRepository.save.mockImplementation(
        (v: Partial<ProductVariant>) => Promise.resolve(v),
      );

      const result = await service.update(variantId, userId, { price: 150 });

      expect(result.price).toBe(150);
    });

    it('TC-430: should throw NotFoundException if variant not found on update', async () => {
      mockVariantRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(variantId, userId, { price: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if updated SKU conflicts with existing one', async () => {
      mockVariantRepository.findOne.mockResolvedValueOnce({
        id: variantId,
        sku: 'SKU-1',
        product: { shop: { userId } },
      });
      mockVariantRepository.findOne.mockResolvedValueOnce({
        id: 'v-2',
        sku: 'SKU-NEW',
      });

      await expect(
        service.update(variantId, userId, { sku: 'SKU-NEW' }),
      ).rejects.toThrow(ConflictException);
    });

    it('PV-UNIT-024: should throw NotFoundException if variant does not belong to the requesting user shop', async () => {
      mockVariantRepository.findOne.mockResolvedValueOnce({
        id: variantId,
        sku: 'SKU-1',
        product: { shop: { userId: 'other-user' } },
      });

      await expect(
        service.update(variantId, userId, { price: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('PV-UNIT-025: should successfully change the SKU when the new SKU is not taken', async () => {
      mockVariantRepository.findOne.mockResolvedValueOnce({
        id: variantId,
        sku: 'SKU-OLD',
        product: { shop: { userId } },
      });
      // sku-uniqueness lookup finds nothing
      mockVariantRepository.findOne.mockResolvedValueOnce(null);
      mockVariantRepository.save.mockImplementation((v: any) =>
        Promise.resolve(v),
      );

      const result = await service.update(variantId, userId, {
        sku: 'SKU-BRAND-NEW',
      });

      expect(result.sku).toBe('SKU-BRAND-NEW');
    });

    it('PV-UNIT-026: should update attributes, stockQty and imageUrl fields when provided', async () => {
      mockVariantRepository.findOne.mockResolvedValueOnce({
        id: variantId,
        sku: 'SKU-1',
        attributes: { color: 'red' },
        stockQty: 5,
        imageUrl: 'https://old.example.com/img.png',
        product: { shop: { userId } },
      });
      mockVariantRepository.save.mockImplementation((v: any) =>
        Promise.resolve(v),
      );

      const dto = {
        attributes: { color: 'blue', size: 'L' },
        stockQty: 42,
        imageUrl: 'https://new.example.com/img.png',
      };

      const result = await service.update(variantId, userId, dto);

      expect(result.attributes).toEqual({ color: 'blue', size: 'L' });
      expect(result.stockQty).toBe(42);
      expect(result.imageUrl).toBe('https://new.example.com/img.png');
      // sku lookup should not be triggered since dto.sku is undefined
      expect(mockVariantRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('findByProduct', () => {
    it('TC-453: should return an array of variants for a specific product', async () => {
      const variants = [{ id: 'v-1' }, { id: 'v-2' }];
      mockVariantRepository.find.mockResolvedValue(variants);

      const result = await service.findByProduct('product-id-1');
      expect(result).toEqual(variants);
    });
  });

  describe('Stock Operations (commitStock, releaseReservedStock, restock)', () => {
    it('should successfully commit stock and decrease quantities', async () => {
      const variant = { id: 'v-1', stockQty: 10, reservedQty: 5 };
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(variant),
      };
      mockEntityManager.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.commitStock(
        mockEntityManager as unknown as EntityManager,
        'v-1',
        2,
      );

      expect(variant.stockQty).toEqual(8);
      expect(variant.reservedQty).toEqual(3);
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        ProductVariant,
        variant,
      );
    });

    it('should throw BadRequestException if stockQty is insufficient on commit', async () => {
      const variant = { id: 'v-1', stockQty: 1, reservedQty: 5 };
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(variant),
      };
      mockEntityManager.createQueryBuilder.mockReturnValue(queryBuilder);

      await expect(
        service.commitStock(
          mockEntityManager as unknown as EntityManager,
          'v-1',
          2,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('PV-UNIT-027: should throw NotFoundException on commitStock when variant does not exist', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockEntityManager.createQueryBuilder.mockReturnValue(queryBuilder);

      await expect(
        service.commitStock(
          mockEntityManager as unknown as EntityManager,
          'non-existent-id',
          2,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockEntityManager.save).not.toHaveBeenCalled();
    });

    it('should release reserved stock safely without dropping below 0', async () => {
      const variant = { id: 'v-1', reservedQty: 1 };
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(variant),
      };
      mockEntityManager.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.releaseReservedStock(
        mockEntityManager as unknown as EntityManager,
        'v-1',
        5,
      );

      expect(variant.reservedQty).toEqual(0);
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        ProductVariant,
        variant,
      );
    });

    it('should increase stock quantity on restock', async () => {
      const variant = { id: 'v-1', stockQty: 5 };
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(variant),
      };
      mockEntityManager.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.restock(
        mockEntityManager as unknown as EntityManager,
        'v-1',
        5,
      );

      expect(variant.stockQty).toEqual(10);
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        ProductVariant,
        variant,
      );
    });
  });
});
