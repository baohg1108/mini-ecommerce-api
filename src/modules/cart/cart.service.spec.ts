import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CartService } from './cart.service';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { ProductVariant } from '../product-variant/entities/product-variant.entity';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { CartResponseDto } from './dtos/cart.response.dto';
import { CartItemResponseDto } from './dtos/cart-item.response.dto';
import { ProductStatus } from '../../common/enums/product-status.enum';
import { ShopStatus } from '../../common/enums/shop-status.enum';

describe('CartService', () => {
  let service: CartService;

  let cartRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let cartItemRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
  };
  let variantRepository: Record<string, jest.Mock>;
  let dataSource: { transaction: jest.Mock };

  let manager: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };

  const buildShop = (overrides: Partial<any> = {}) => ({
    id: 'shop-1',
    shopName: 'Shop A',
    status: ShopStatus.ACTIVE,
    ...overrides,
  });

  const buildProduct = (overrides: Partial<any> = {}) => ({
    id: 'product-1',
    name: 'Sản phẩm A',
    status: ProductStatus.ACTIVE,
    shop: buildShop(),
    ...overrides,
  });

  const buildVariant = (overrides: Partial<any> = {}) => ({
    id: 'variant-1',
    price: 100000,
    availableQty: 10,
    product: buildProduct(),
    ...overrides,
  });

  const buildCart = (overrides: Partial<any> = {}) => ({
    id: 'cart-1',
    userId: 'user-1',
    ...overrides,
  });

  const buildCartItem = (overrides: Partial<any> = {}) => ({
    id: 'cart-item-1',
    cartId: 'cart-1',
    variantId: 'variant-1',
    quantity: 2,
    ...overrides,
  });

  const mockLockQueryBuilder = (returnValue: any) => {
    manager.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(returnValue),
    });
  };

  beforeEach(async () => {
    cartRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    cartItemRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };
    variantRepository = {};

    manager = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((_entity: any, data: any) => ({ ...data })),
      save: jest.fn((a: any, b?: any) => {
        const target = b !== undefined ? b : a;
        return Promise.resolve({ id: target.id ?? 'generated-id', ...target });
      }),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    dataSource = {
      transaction: jest.fn((cb: any) => cb(manager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(Cart), useValue: cartRepository },
        { provide: getRepositoryToken(CartItem), useValue: cartItemRepository },
        {
          provide: getRepositoryToken(ProductVariant),
          useValue: variantRepository,
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addToCart()', () => {
    it('SHOP-UNIT-002: should reuse existing Cart and create new CartItem', async () => {
      const variant = buildVariant({ availableQty: 10 });
      const existingCart = buildCart();
      mockLockQueryBuilder(variant);

      manager.findOne.mockImplementation((entity: any) => {
        if (entity === ProductVariant) return Promise.resolve(variant);
        if (entity === Cart) return Promise.resolve(existingCart);
        if (entity === CartItem) return Promise.resolve(null);
        return Promise.resolve(null);
      });

      manager.find.mockResolvedValue([
        buildCartItem({
          id: 'ci-new',
          variantId: 'variant-1',
          quantity: 3,
          variant,
        }),
      ]);

      const result = await service.addToCart('user-1', {
        variantId: 'variant-1',
        quantity: 3,
      });

      expect(manager.create).not.toHaveBeenCalledWith(Cart, expect.anything());
      expect(manager.create).toHaveBeenCalledWith(CartItem, {
        cartId: existingCart.id,
        variantId: 'variant-1',
        quantity: 3,
      });
      expect(result).toBeInstanceOf(CartResponseDto);
      expect(result.items[0].quantity).toBe(3);
    });

    it('SHOP-UNIT-003: should accumulate quantity when CartItem already exists', async () => {
      const variant = buildVariant({ availableQty: 10 });
      const existingCart = buildCart();
      const existingItem = buildCartItem({ quantity: 2 });
      mockLockQueryBuilder(variant);

      manager.findOne.mockImplementation((entity: any) => {
        if (entity === ProductVariant) return Promise.resolve(variant);
        if (entity === Cart) return Promise.resolve(existingCart);
        if (entity === CartItem) return Promise.resolve(existingItem);
        return Promise.resolve(null);
      });

      manager.find.mockResolvedValue([
        { ...existingItem, quantity: 5, variant },
      ]);

      await service.addToCart('user-1', {
        variantId: 'variant-1',
        quantity: 3,
      });

      expect(manager.save).toHaveBeenCalledWith(
        CartItem,
        expect.objectContaining({ quantity: 5 }),
      );
      expect(manager.create).not.toHaveBeenCalledWith(
        CartItem,
        expect.anything(),
      );
    });

    it('SHOP-UNIT-004: should throw BadRequestException when quantity = 0', async () => {
      await expect(
        service.addToCart('user-1', { variantId: 'variant-1', quantity: 0 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addToCart('user-1', { variantId: 'variant-1', quantity: 0 }),
      ).rejects.toThrow('Quantity must be greater than 0');

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('SHOP-UNIT-005: should throw BadRequestException when quantity is undefined', async () => {
      await expect(
        service.addToCart('user-1', {
          variantId: 'variant-1',
          quantity: undefined as unknown as number,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('SHOP-UNIT-006: should throw NotFoundException when variant does not exist', async () => {
      mockLockQueryBuilder(null);

      await expect(
        service.addToCart('user-1', { variantId: 'not-exist', quantity: 1 }),
      ).rejects.toThrow(new NotFoundException('Product variant not found'));
    });

    it.each([
      ProductStatus.PENDING,
      ProductStatus.REJECTED,
      ProductStatus.HIDDEN,
      ProductStatus.OUT_OF_STOCK,
      ProductStatus.REMOVED,
    ])(
      'SHOP-UNIT-007: should throw NotFoundException when product.status = %s (not ACTIVE)',
      async (status) => {
        const variant = buildVariant({
          product: buildProduct({ status }),
        });
        mockLockQueryBuilder(variant);
        manager.findOne.mockImplementation((entity: any) => {
          if (entity === ProductVariant) return Promise.resolve(variant);
          return Promise.resolve(null);
        });

        await expect(
          service.addToCart('user-1', { variantId: 'variant-1', quantity: 1 }),
        ).rejects.toThrow(new NotFoundException('Product not available'));
      },
    );

    it.each([ShopStatus.PENDING, ShopStatus.REJECTED, ShopStatus.SUSPENDED])(
      'SHOP-UNIT-008: should throw NotFoundException when shop.status = %s (not ACTIVE)',
      async (status) => {
        const variant = buildVariant({
          product: buildProduct({ shop: buildShop({ status }) }),
        });
        mockLockQueryBuilder(variant);
        manager.findOne.mockImplementation((entity: any) => {
          if (entity === ProductVariant) return Promise.resolve(variant);
          return Promise.resolve(null);
        });

        await expect(
          service.addToCart('user-1', { variantId: 'variant-1', quantity: 1 }),
        ).rejects.toThrow(new NotFoundException('Shop not active'));
      },
    );

    it('SHOP-UNIT-009: should throw BadRequestException when exceeding stock (no prior item)', async () => {
      const variant = buildVariant({ availableQty: 5 });
      mockLockQueryBuilder(variant);
      manager.findOne.mockImplementation((entity: any) => {
        if (entity === ProductVariant) return Promise.resolve(variant);
        if (entity === Cart) return Promise.resolve(buildCart());
        if (entity === CartItem) return Promise.resolve(null);
        return Promise.resolve(null);
      });

      await expect(
        service.addToCart('user-1', { variantId: 'variant-1', quantity: 6 }),
      ).rejects.toThrow('Insufficient stock. Only 5 items available.');
    });

    it('SHOP-UNIT-010: should calculate correct remaining stock when accumulating exceeds stock', async () => {
      const variant = buildVariant({ availableQty: 5 });
      const existingItem = buildCartItem({ quantity: 4 });
      mockLockQueryBuilder(variant);
      manager.findOne.mockImplementation((entity: any) => {
        if (entity === ProductVariant) return Promise.resolve(variant);
        if (entity === Cart) return Promise.resolve(buildCart());
        if (entity === CartItem) return Promise.resolve(existingItem);
        return Promise.resolve(null);
      });

      await expect(
        service.addToCart('user-1', { variantId: 'variant-1', quantity: 3 }),
      ).rejects.toThrow('Insufficient stock. Only 1 items available.');
    });

    it('SHOP-UNIT-011: should call setLock("pessimistic_write") when locking ProductVariant', async () => {
      const variant = buildVariant({ availableQty: 10 });
      const whereMock = jest.fn().mockReturnThis();
      const setLockMock = jest.fn().mockReturnThis();
      const getOneMock = jest.fn().mockResolvedValue(variant);

      manager.createQueryBuilder.mockReturnValue({
        where: whereMock,
        setLock: setLockMock,
        getOne: getOneMock,
      });

      manager.findOne.mockImplementation((entity: any) => {
        if (entity === ProductVariant) return Promise.resolve(variant);
        if (entity === Cart) return Promise.resolve(buildCart());
        if (entity === CartItem) return Promise.resolve(null);
        return Promise.resolve(null);
      });
      manager.find.mockResolvedValue([]);

      await service.addToCart('user-1', {
        variantId: 'variant-1',
        quantity: 1,
      });

      expect(manager.createQueryBuilder).toHaveBeenCalledWith(
        ProductVariant,
        'variant',
      );
      expect(setLockMock).toHaveBeenCalledWith('pessimistic_write');
      expect(setLockMock.mock.invocationCallOrder[0]).toBeLessThan(
        getOneMock.mock.invocationCallOrder[0],
      );
    });
  });

  describe('updateCartItem()', () => {
    it('SHOP-UNIT-012: should update quantity successfully when item belongs to current user', async () => {
      const cart = buildCart({ userId: 'user-1' });
      const cartItem = buildCartItem({ quantity: 2, cart });
      const variant = buildVariant({ availableQty: 10 });

      manager.findOne.mockImplementation((entity: any) => {
        if (entity === CartItem) return Promise.resolve(cartItem);
        return Promise.resolve(null);
      });
      mockLockQueryBuilder(variant);
      manager.find.mockResolvedValue([{ ...cartItem, quantity: 4, variant }]);

      const result = await service.updateCartItem('user-1', 'cart-item-1', {
        quantity: 4,
      });

      expect(manager.save).toHaveBeenCalledWith(
        CartItem,
        expect.objectContaining({ quantity: 4 }),
      );
      expect(result).toBeInstanceOf(CartResponseDto);
    });

    it('SHOP-UNIT-013: should throw BadRequestException when quantity = 0', async () => {
      await expect(
        service.updateCartItem('user-1', 'cart-item-1', { quantity: 0 }),
      ).rejects.toThrow(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('SHOP-UNIT-014: should throw NotFoundException when cart item does not exist', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(
        service.updateCartItem('user-1', 'not-exist', { quantity: 2 }),
      ).rejects.toThrow(new NotFoundException('Cart item not found'));
    });

    it('SHOP-UNIT-015: should throw ForbiddenException when item belongs to another user', async () => {
      const cart = buildCart({ userId: 'user-B' });
      const cartItem = buildCartItem({ cart });
      manager.findOne.mockImplementation((entity: any) => {
        if (entity === CartItem) return Promise.resolve(cartItem);
        return Promise.resolve(null);
      });

      await expect(
        service.updateCartItem('user-A', 'cart-item-1', { quantity: 2 }),
      ).rejects.toThrow(
        new ForbiddenException('You are not allowed to modify this cart item'),
      );
    });

    it('SHOP-UNIT-016: should throw NotFoundException when linked variant does not exist', async () => {
      const cart = buildCart({ userId: 'user-1' });
      const cartItem = buildCartItem({ cart });
      manager.findOne.mockImplementation((entity: any) => {
        if (entity === CartItem) return Promise.resolve(cartItem);
        return Promise.resolve(null);
      });
      mockLockQueryBuilder(null);

      await expect(
        service.updateCartItem('user-1', 'cart-item-1', { quantity: 2 }),
      ).rejects.toThrow(new NotFoundException('Product variant not found'));
    });

    it('SHOP-UNIT-017: should throw BadRequestException when new quantity exceeds stock', async () => {
      const cart = buildCart({ userId: 'user-1' });
      const cartItem = buildCartItem({ cart });
      const variant = buildVariant({ availableQty: 3 });
      manager.findOne.mockImplementation((entity: any) => {
        if (entity === CartItem) return Promise.resolve(cartItem);
        return Promise.resolve(null);
      });
      mockLockQueryBuilder(variant);

      await expect(
        service.updateCartItem('user-1', 'cart-item-1', { quantity: 5 }),
      ).rejects.toThrow('Insufficient stock. Only 3 items available.');
    });
  });

  describe('removeCartItem()', () => {
    it('SHOP-UNIT-018: should remove cart item belonging to current user successfully', async () => {
      const cart = buildCart({ userId: 'user-1' });
      const cartItem = buildCartItem({ cart });
      manager.findOne.mockResolvedValue(cartItem);
      manager.find.mockResolvedValue([]);

      const result = await service.removeCartItem('user-1', 'cart-item-1');

      expect(manager.remove).toHaveBeenCalledWith(CartItem, cartItem);
      expect(result.items).toHaveLength(0);
    });

    it('SHOP-UNIT-019: should throw NotFoundException when item does not exist', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(
        service.removeCartItem('user-1', 'not-exist'),
      ).rejects.toThrow(new NotFoundException('Cart item not found'));
    });

    it('SHOP-UNIT-020: should throw ForbiddenException when removing another user item', async () => {
      const cart = buildCart({ userId: 'user-B' });
      const cartItem = buildCartItem({ cart });
      manager.findOne.mockResolvedValue(cartItem);

      await expect(
        service.removeCartItem('user-A', 'cart-item-1'),
      ).rejects.toThrow(
        new ForbiddenException('You are not allowed to modify this cart item'),
      );
      expect(manager.remove).not.toHaveBeenCalled();
    });
  });

  describe('clearCart()', () => {
    it('SHOP-UNIT-021: should delete all CartItems by cartId and return empty cart', async () => {
      const cart = buildCart();
      cartRepository.findOne.mockResolvedValue(cart);

      const result = await service.clearCart('user-1');

      expect(cartItemRepository.delete).toHaveBeenCalledWith({
        cartId: cart.id,
      });
      expect(result).toBeInstanceOf(CartResponseDto);
      expect(result.items).toEqual([]);
      expect(result.hasUnavailableItems).toBe(false);
    });
  });

  describe('groupItemsByShop()', () => {
    it('SHOP-UNIT-022: should group items by correct shop when cart has multiple shops', () => {
      const shopA = buildShop({ id: 'shop-A', shopName: 'Shop A' });
      const shopB = buildShop({ id: 'shop-B', shopName: 'Shop B' });

      const items = [
        buildCartItem({
          id: 'ci-1',
          variant: buildVariant({ product: buildProduct({ shop: shopA }) }),
        }),
        buildCartItem({
          id: 'ci-2',
          variant: buildVariant({ product: buildProduct({ shop: shopA }) }),
        }),
        buildCartItem({
          id: 'ci-3',
          variant: buildVariant({ product: buildProduct({ shop: shopB }) }),
        }),
      ] as any;

      const result = service.groupItemsByShop(items);

      expect(result).toHaveLength(2);
      const groupA = result.find((g) => g.shop.id === 'shop-A');
      const groupB = result.find((g) => g.shop.id === 'shop-B');
      expect(groupA?.items).toHaveLength(2);
      expect(groupB?.items).toHaveLength(1);
    });

    it('SHOP-UNIT-025: should throw BadRequestException when item cannot determine shop', () => {
      const orphanItem = buildCartItem({ id: 'ci-9', variant: null }) as any;

      expect(() => service.groupItemsByShop([orphanItem])).toThrow(
        new BadRequestException('Cannot resolve shop for cart item ci-9'),
      );
    });
  });

  describe('getMyCart()', () => {
    it('SHOP-UNIT-026: item isAvailable=true when variant/product/shop are valid and stock is sufficient', async () => {
      const cart = buildCart();
      const variant = buildVariant({ availableQty: 5 });
      cartRepository.findOne.mockResolvedValue(cart);
      cartItemRepository.find.mockResolvedValue([
        buildCartItem({ quantity: 2, variant }),
      ]);

      const result = await service.getMyCart('user-1');

      expect(result.items[0].isAvailable).toBe(true);
      expect(result.items[0].warning).toBeUndefined();
      expect(result.hasUnavailableItems).toBe(false);
    });

    it('SHOP-UNIT-027: isAvailable=false with warning "Product variant no longer exists" when variant=null', async () => {
      const cart = buildCart();
      cartRepository.findOne.mockResolvedValue(cart);
      cartItemRepository.find.mockResolvedValue([
        buildCartItem({ quantity: 1, variant: null }),
      ]);

      const result = await service.getMyCart('user-1');

      expect(result.items[0].isAvailable).toBe(false);
      expect(result.items[0].warning).toBe('Product variant no longer exists');
    });

    it.each([
      ProductStatus.PENDING,
      ProductStatus.REJECTED,
      ProductStatus.HIDDEN,
      ProductStatus.OUT_OF_STOCK,
      ProductStatus.REMOVED,
    ])(
      'SHOP-UNIT-028: isAvailable=false with warning "Product is no longer available" when product.status = %s',
      async (status) => {
        const cart = buildCart();
        const variant = buildVariant({ product: buildProduct({ status }) });
        cartRepository.findOne.mockResolvedValue(cart);
        cartItemRepository.find.mockResolvedValue([
          buildCartItem({ quantity: 1, variant }),
        ]);

        const result = await service.getMyCart('user-1');

        expect(result.items[0].isAvailable).toBe(false);
        expect(result.items[0].warning).toBe('Product is no longer available');
      },
    );

    it.each([ShopStatus.PENDING, ShopStatus.REJECTED, ShopStatus.SUSPENDED])(
      'SHOP-UNIT-029: isAvailable=false with warning "Shop is no longer active" when shop.status = %s',
      async (status) => {
        const cart = buildCart();
        const variant = buildVariant({
          product: buildProduct({ shop: buildShop({ status }) }),
        });
        cartRepository.findOne.mockResolvedValue(cart);
        cartItemRepository.find.mockResolvedValue([
          buildCartItem({ quantity: 1, variant }),
        ]);

        const result = await service.getMyCart('user-1');

        expect(result.items[0].isAvailable).toBe(false);
        expect(result.items[0].warning).toBe('Shop is no longer active');
      },
    );

    it('SHOP-UNIT-030: isAvailable=false with warning "Out of stock" when availableQty=0', async () => {
      const cart = buildCart();
      const variant = buildVariant({ availableQty: 0 });
      cartRepository.findOne.mockResolvedValue(cart);
      cartItemRepository.find.mockResolvedValue([
        buildCartItem({ quantity: 1, variant }),
      ]);

      const result = await service.getMyCart('user-1');

      expect(result.items[0].isAvailable).toBe(false);
      expect(result.items[0].warning).toBe('Out of stock');
    });

    it('SHOP-UNIT-031: isAvailable=false with warning "Only X items left in stock" when quantity > availableQty', async () => {
      const cart = buildCart();
      const variant = buildVariant({ availableQty: 2 });
      cartRepository.findOne.mockResolvedValue(cart);
      cartItemRepository.find.mockResolvedValue([
        buildCartItem({ quantity: 5, variant }),
      ]);

      const result = await service.getMyCart('user-1');

      expect(result.items[0].isAvailable).toBe(false);
      expect(result.items[0].warning).toBe('Only 2 items left in stock');
    });
  });

  describe('CartResponseDto', () => {
    it('SHOP-UNIT-032: hasUnavailableItems=true when at least 1 item is unavailable', () => {
      const items = [
        new CartItemResponseDto({
          id: 'ci-1',
          variantId: 'v-1',
          quantity: 1,
          isAvailable: true,
        }),
        new CartItemResponseDto({
          id: 'ci-2',
          variantId: 'v-2',
          quantity: 1,
          isAvailable: false,
          warning: 'Out of stock',
        }),
      ];

      const cartResponse = new CartResponseDto({
        id: 'cart-1',
        userId: 'user-1',
        items,
      });

      expect(cartResponse.hasUnavailableItems).toBe(true);
    });

    it('SHOP-UNIT-033: hasUnavailableItems=false when all items are available', () => {
      const items = [
        new CartItemResponseDto({
          id: 'ci-1',
          variantId: 'v-1',
          quantity: 1,
          isAvailable: true,
        }),
        new CartItemResponseDto({
          id: 'ci-2',
          variantId: 'v-2',
          quantity: 2,
          isAvailable: true,
        }),
      ];

      const cartResponse = new CartResponseDto({
        id: 'cart-1',
        userId: 'user-1',
        items,
      });

      expect(cartResponse.hasUnavailableItems).toBe(false);
    });
  });

  describe('AddToCartDto validation', () => {
    it('SHOP-UNIT-036: validate() returns error when variantId is not a valid UUID', async () => {
      const dto = plainToInstance(AddToCartDto, {
        variantId: 'abc',
        quantity: 1,
      });

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const variantIdError = errors.find((e) => e.property === 'variantId');
      expect(variantIdError).toBeDefined();
      expect(variantIdError?.constraints).toHaveProperty('isUuid');
    });
  });
});
