import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { CartService } from './cart.service';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { ProductVariant } from '../product-variant/entities/product-variant.entity';
import { VoucherValidationService } from '../vouchers/voucher-validation.service';
import { ProductStatus } from '../../common/enums/product-status.enum';
import { ShopStatus } from '../../common/enums/shop-status.enum';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { UpdateCartItemDto } from './dtos/update-cart-item.dto';

type MockQueryBuilder = {
  where: jest.Mock;
  setLock: jest.Mock;
  getOne: jest.Mock;
};

describe('CartService (Full Coverage Unit Tests)', () => {
  let service: CartService;

  const mockQueryBuilder: MockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockCartRepository = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data: unknown) => data),
    save: jest
      .fn()
      .mockImplementation((data: unknown) =>
        Promise.resolve({ id: 'cart-1', ...(data as Record<string, unknown>) }),
      ),
  };

  const mockCartItemRepository = {
    find: jest.fn(),
    delete: jest.fn(),
  };

  const mockVariantRepository = {};

  const mockVoucherValidationService = {
    findAvailableVouchers: jest.fn(),
  };

  const mockEntityManager = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => {
      return data;
    }),
    save: jest.fn().mockImplementation((_entity: unknown, data: unknown) => {
      return Promise.resolve({
        id: 'saved-id',
        ...(data as Record<string, unknown>),
      });
    }),
    remove: jest.fn().mockResolvedValue(true),
  };

  const mockDataSource = {
    transaction: jest
      .fn()
      .mockImplementation(
        (cb: (manager: typeof mockEntityManager) => unknown) => {
          return cb(mockEntityManager);
        },
      ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(Cart), useValue: mockCartRepository },
        {
          provide: getRepositoryToken(CartItem),
          useValue: mockCartItemRepository,
        },
        {
          provide: getRepositoryToken(ProductVariant),
          useValue: mockVariantRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: VoucherValidationService,
          useValue: mockVoucherValidationService,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    jest.clearAllMocks();
  });

  const validVariantWithRelations = {
    id: 'var-1',
    availableQty: 10,
    product: {
      id: 'prod-1',
      name: 'Test Product',
      status: ProductStatus.ACTIVE,
      shop: { id: 'shop-1', shopName: 'Test Shop', status: ShopStatus.ACTIVE },
    },
  };

  describe('addToCart', () => {
    const dto: AddToCartDto = { variantId: 'var-1', quantity: 2 };

    it('should throw BadRequestException if quantity is invalid', async () => {
      await expect(
        service.addToCart('user-1', { variantId: 'var-1', quantity: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if variant does not exist', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      await expect(service.addToCart('user-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if product is inactive', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ id: 'var-1' });
      mockEntityManager.findOne.mockResolvedValue({
        ...validVariantWithRelations,
        product: { status: 'INACTIVE' as unknown as ProductStatus },
      });
      await expect(service.addToCart('user-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if shop is inactive', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ id: 'var-1' });
      mockEntityManager.findOne.mockResolvedValue({
        ...validVariantWithRelations,
        product: {
          status: ProductStatus.ACTIVE,
          shop: { status: 'LOCKED' as unknown as ShopStatus },
        },
      });
      await expect(service.addToCart('user-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if stock is insufficient', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({
        id: 'var-1',
        availableQty: 5,
      });
      mockEntityManager.findOne
        .mockResolvedValueOnce(validVariantWithRelations)
        .mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1' })
        .mockResolvedValueOnce({ quantity: 4 });

      await expect(service.addToCart('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully add new item to cart', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({
        id: 'var-1',
        availableQty: 10,
      });

      mockEntityManager.findOne
        .mockResolvedValueOnce(validVariantWithRelations)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      mockEntityManager.find.mockResolvedValue([
        {
          id: 'item-1',
          variantId: 'var-1',
          quantity: 2,
          variant: validVariantWithRelations,
        },
      ]);

      const result = await service.addToCart('user-1', dto);
      expect(result).toBeDefined();
      expect(result.items.length).toBe(1);
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateCartItem', () => {
    const updateDto: UpdateCartItemDto = { quantity: 5 };

    it('should throw BadRequestException if quantity is <= 0', async () => {
      await expect(
        service.updateCartItem('user-1', 'item-1', { quantity: -1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if cart item not found', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);
      await expect(
        service.updateCartItem('user-1', 'item-1', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own the cart', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: 'item-1',
        cart: { userId: 'different-user' },
      });
      await expect(
        service.updateCartItem('user-1', 'item-1', updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update cart item successfully', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: 'item-1',
        variantId: 'var-1',
        cart: { id: 'cart-1', userId: 'user-1' },
      });
      mockQueryBuilder.getOne.mockResolvedValue({
        id: 'var-1',
        availableQty: 10,
      });
      mockEntityManager.find.mockResolvedValue([]);

      const result = await service.updateCartItem(
        'user-1',
        'item-1',
        updateDto,
      );
      expect(result).toBeDefined();
      expect(mockEntityManager.save).toHaveBeenCalled();
    });
  });

  describe('removeCartItem', () => {
    it('should successfully remove item', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: 'item-1',
        cart: { id: 'cart-1', userId: 'user-1' },
      });
      mockEntityManager.find.mockResolvedValue([]);

      const result = await service.removeCartItem('user-1', 'item-1');
      expect(result).toBeDefined();
      expect(mockEntityManager.remove).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if unauthorized', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: 'item-1',
        cart: { id: 'cart-1', userId: 'user-2' },
      });
      await expect(service.removeCartItem('user-1', 'item-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('clearCart', () => {
    it('should clear all items in cart', async () => {
      mockCartRepository.findOne.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
      });
      await service.clearCart('user-1');
      expect(mockCartItemRepository.delete).toHaveBeenCalledWith({
        cartId: 'cart-1',
      });
    });
  });

  describe('getGroupedCartForCheckout & groupItemsByShop', () => {
    it('should throw BadRequestException if item has no product/shop', () => {
      const invalidItems = [{ id: 'item-1', variant: {} }];
      expect(() =>
        service.groupItemsByShop(invalidItems as CartItem[]),
      ).toThrow(BadRequestException);
    });

    it('should group items by shop correctly', async () => {
      mockCartRepository.findOne.mockResolvedValue({ id: 'cart-1' });
      mockCartItemRepository.find.mockResolvedValue([
        {
          id: 'item-1',
          variantId: 'var-1',
          quantity: 1,
          variant: validVariantWithRelations,
        },
      ]);

      const result = await service.getGroupedCartForCheckout('user-1');
      expect(result.length).toBe(1);
      expect(result[0].shop.id).toBe('shop-1');
      expect(result[0].items.length).toBe(1);
    });
  });

  describe('getAvailableVouchers', () => {
    it('should return empty array if cart is empty', async () => {
      mockCartRepository.findOne.mockResolvedValue({ id: 'cart-1' });
      mockCartItemRepository.find.mockResolvedValue([]);

      const result = await service.getAvailableVouchers('user-1');
      expect(result).toEqual([]);
    });

    it('should return mapped available vouchers', async () => {
      mockCartRepository.findOne.mockResolvedValue({ id: 'cart-1' });
      mockCartItemRepository.find.mockResolvedValue([
        {
          id: 'item-1',
          variantId: 'var-1',
          quantity: 1,
          variant: validVariantWithRelations,
        },
      ]);

      mockVoucherValidationService.findAvailableVouchers.mockResolvedValue([
        { voucher: { id: 'v-1', code: 'DISC' }, discountAmount: 10000 },
      ]);

      const result = await service.getAvailableVouchers('user-1');
      expect(result.length).toBe(1);
      expect(result[0].code).toBe('DISC');
      expect(result[0].discountAmount).toBe(10000);
    });
  });

  describe('getMyCart & buildCartItemResponse (Edge Cases)', () => {
    it('should map various availability warnings correctly', async () => {
      mockCartRepository.findOne.mockResolvedValue({ id: 'cart-1' });

      const cartItems = [
        { id: 'i-1', variant: null },
        {
          id: 'i-2',
          variant: {
            product: { status: 'INACTIVE' as unknown as ProductStatus },
          },
        },
        {
          id: 'i-3',
          variant: {
            product: {
              status: ProductStatus.ACTIVE,
              shop: { status: 'LOCKED' as unknown as ShopStatus },
            },
          },
        },
        {
          id: 'i-4',
          variant: {
            availableQty: 0,
            product: validVariantWithRelations.product,
          },
        },
        {
          id: 'i-5',
          quantity: 10,
          variant: {
            availableQty: 5,
            product: validVariantWithRelations.product,
          },
        },
      ];

      mockCartItemRepository.find.mockResolvedValue(cartItems);

      const result = await service.getMyCart('user-1');

      expect(result.items[0].isAvailable).toBe(false);
      expect(result.items[0].warning).toBe('Product variant no longer exists');

      expect(result.items[1].isAvailable).toBe(false);
      expect(result.items[1].warning).toBe('Product is no longer available');

      expect(result.items[2].isAvailable).toBe(false);
      expect(result.items[2].warning).toBe('Shop is no longer active');

      expect(result.items[3].isAvailable).toBe(false);
      expect(result.items[3].warning).toBe('Out of stock');

      expect(result.items[4].isAvailable).toBe(false);
      expect(result.items[4].warning).toBe('Only 5 items left in stock');
    });
  });
});
