import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { UpdateCartItemDto } from './dtos/update-cart-item.dto';
import { CartResponseDto } from './dtos/cart.response.dto';
import { GroupedCartDto } from './dtos/grouped-cart.dto';
import { AvailableVoucherResponseDto } from '../../modules/vouchers/dtos/available-voucher.response.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';

const mockGuard = { canActivate: jest.fn(() => true) };

describe('CartController', () => {
  let controller: CartController;

  const mockCartService = {
    getMyCart: jest.fn(),
    getGroupedCartForCheckout: jest.fn(),
    getAvailableVouchers: jest.fn(),
    addToCart: jest.fn(),
    updateCartItem: jest.fn(),
    removeCartItem: jest.fn(),
    clearCart: jest.fn(),
  };

  const userId = 'user-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: CartService, useValue: mockCartService }],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<CartController>(CartController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyCart', () => {
    it('should call cartService.getMyCart with the current user id', async () => {
      const expected = { items: [] } as unknown as CartResponseDto;
      mockCartService.getMyCart.mockResolvedValue(expected);

      const result = await controller.getMyCart(userId);

      expect(mockCartService.getMyCart).toHaveBeenCalledWith(userId);
      expect(result).toBe(expected);
    });
  });

  describe('getGroupedCart', () => {
    it('should call cartService.getGroupedCartForCheckout with the current user id', async () => {
      const expected = [{ shopId: 'shop-1' }] as unknown as GroupedCartDto[];
      mockCartService.getGroupedCartForCheckout.mockResolvedValue(expected);

      const result = await controller.getGroupedCart(userId);

      expect(mockCartService.getGroupedCartForCheckout).toHaveBeenCalledWith(
        userId,
      );
      expect(result).toBe(expected);
    });
  });

  describe('getAvailableVouchers', () => {
    it('should call cartService.getAvailableVouchers with the current user id', async () => {
      const expected = [
        { code: 'SALE10' },
      ] as unknown as AvailableVoucherResponseDto[];
      mockCartService.getAvailableVouchers.mockResolvedValue(expected);

      const result = await controller.getAvailableVouchers(userId);

      expect(mockCartService.getAvailableVouchers).toHaveBeenCalledWith(userId);
      expect(result).toBe(expected);
    });
  });

  describe('addToCart', () => {
    it('should call cartService.addToCart with user id and dto', async () => {
      const dto = { variantId: 'variant-1', quantity: 2 };
      const expected = { items: [dto] } as unknown as CartResponseDto;
      mockCartService.addToCart.mockResolvedValue(expected);

      const result = await controller.addToCart(userId, dto);

      expect(mockCartService.addToCart).toHaveBeenCalledWith(userId, dto);
      expect(result).toBe(expected);
    });
  });

  describe('updateCartItem', () => {
    it('should call cartService.updateCartItem with user id, item id and dto', async () => {
      const itemId = 'item-1';
      const dto = { quantity: 5 };
      const expected = { items: [] } as unknown as CartResponseDto;
      mockCartService.updateCartItem.mockResolvedValue(expected);

      const result = await controller.updateCartItem(userId, itemId, dto);

      expect(mockCartService.updateCartItem).toHaveBeenCalledWith(
        userId,
        itemId,
        dto,
      );
      expect(result).toBe(expected);
    });
  });

  describe('removeCartItem', () => {
    it('should call cartService.removeCartItem with user id and item id', async () => {
      const itemId = 'item-1';
      const expected = { items: [] } as unknown as CartResponseDto;
      mockCartService.removeCartItem.mockResolvedValue(expected);

      const result = await controller.removeCartItem(userId, itemId);

      expect(mockCartService.removeCartItem).toHaveBeenCalledWith(
        userId,
        itemId,
      );
      expect(result).toBe(expected);
    });
  });

  describe('clearCart', () => {
    it('should call cartService.clearCart with the current user id', async () => {
      const expected = { items: [] } as unknown as CartResponseDto;
      mockCartService.clearCart.mockResolvedValue(expected);

      const result = await controller.clearCart(userId);

      expect(mockCartService.clearCart).toHaveBeenCalledWith(userId);
      expect(result).toBe(expected);
    });
  });
});
