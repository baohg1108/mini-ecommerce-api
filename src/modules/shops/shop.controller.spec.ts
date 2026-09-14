import { Test, TestingModule } from '@nestjs/testing';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { ProductService } from '../products/product.service';
import { CreateShopDto } from './dtos/create-shop.dto';
import { RejectShopDto } from './dtos/reject-shop.dto';
import { SuspendedShopDto } from './dtos/suspended-shop.dto';
import { UpdateShopDto } from './dtos/update-shop.dto';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { PublicProductResponseDto } from '../products/dtos/public-product-response.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';

const mockGuard = { canActivate: jest.fn(() => true) };

// Isolate the controller from PublicProductResponseDto's real transformation.
jest.mock('../products/dtos/public-product-response.dto', () => ({
  PublicProductResponseDto: jest.fn().mockImplementation((data) => data),
}));

describe('ShopController', () => {
  let controller: ShopController;

  const mockShopService = {
    getAllActiveShops: jest.fn(),
    getPublicShopById: jest.fn(),
    registerShop: jest.fn(),
    getMyShop: jest.fn(),
    approveShop: jest.fn(),
    rejectShop: jest.fn(),
    suspendShop: jest.fn(),
    unlockShop: jest.fn(),
    updateShop: jest.fn(),
    getAllShops: jest.fn(),
    getShopById: jest.fn(),
  };

  const mockProductService = {
    findPublicByShop: jest.fn(),
  };

  const userId = 'user-1';
  const shopId = 'shop-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopController],
      providers: [
        { provide: ShopService, useValue: mockShopService },
        { provide: ProductService, useValue: mockProductService },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ShopController>(ShopController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllActiveShops', () => {
    it('should call shopService.getAllActiveShops and return paginated data', async () => {
      const query = { page: 1, limit: 20 };
      const shops = [{ id: shopId }];
      mockShopService.getAllActiveShops.mockResolvedValue({
        data: shops,
        total: 1,
      });

      const result = await controller.getAllActiveShops(query);

      expect(mockShopService.getAllActiveShops).toHaveBeenCalledWith(query);
      expect(result).toEqual({
        data: shops,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should default page and limit when not provided in the query', async () => {
      const query = {} as PaginationQueryDto;
      mockShopService.getAllActiveShops.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await controller.getAllActiveShops(query);

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    });
  });

  describe('getShopProfile', () => {
    it('should call shopService.getPublicShopById with the shop id', async () => {
      const expected = { id: shopId, name: 'My Shop' };
      mockShopService.getPublicShopById.mockResolvedValue(expected);

      const result = await controller.getShopProfile(shopId);

      expect(mockShopService.getPublicShopById).toHaveBeenCalledWith(shopId);
      expect(result).toBe(expected);
    });
  });

  describe('getShopProducts', () => {
    it('should verify the shop exists, then call productService.findPublicByShop', async () => {
      const query = { page: 1, limit: 20 };
      mockShopService.getPublicShopById.mockResolvedValue({ id: shopId });
      const products = [{ id: 'product-1' }];
      mockProductService.findPublicByShop.mockResolvedValue({
        data: products,
        total: 1,
      });

      const result = await controller.getShopProducts(shopId, query);

      expect(mockShopService.getPublicShopById).toHaveBeenCalledWith(shopId);
      expect(mockProductService.findPublicByShop).toHaveBeenCalledWith(
        shopId,
        query,
      );
      expect(result).toEqual({
        data: products,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });
  });

  describe('registerShop', () => {
    it('should call shopService.registerShop with user id and dto', async () => {
      const dto = { name: 'New Shop' } as CreateShopDto;
      const expected = { id: shopId, name: 'New Shop' };
      mockShopService.registerShop.mockResolvedValue(expected);

      const result = await controller.registerShop(userId, dto);

      expect(mockShopService.registerShop).toHaveBeenCalledWith(userId, dto);
      expect(result).toBe(expected);
    });
  });

  describe('getMyShop', () => {
    it('should call shopService.getMyShop with the current user id', async () => {
      const expected = { id: shopId };
      mockShopService.getMyShop.mockResolvedValue(expected);

      const result = await controller.getMyShop(userId);

      expect(mockShopService.getMyShop).toHaveBeenCalledWith(userId);
      expect(result).toBe(expected);
    });
  });

  describe('approveShop', () => {
    it('should call shopService.approveShop with shop id and user id', async () => {
      const expected = { id: shopId, status: 'approved' };
      mockShopService.approveShop.mockResolvedValue(expected);

      const result = await controller.approveShop(shopId, userId);

      expect(mockShopService.approveShop).toHaveBeenCalledWith(shopId, userId);
      expect(result).toBe(expected);
    });
  });

  describe('rejectShop', () => {
    it('should call shopService.rejectShop with shop id, user id and dto', async () => {
      const dto = { reason: 'Invalid documents' };
      const expected = { id: shopId, status: 'rejected' };
      mockShopService.rejectShop.mockResolvedValue(expected);

      const result = await controller.rejectShop(shopId, userId, dto);

      expect(mockShopService.rejectShop).toHaveBeenCalledWith(
        shopId,
        userId,
        dto,
      );
      expect(result).toBe(expected);
    });
  });

  describe('suspendShop', () => {
    it('should call shopService.suspendShop with shop id, user id and dto', async () => {
      const dto = { reason: 'Policy violation' } as SuspendedShopDto;
      const expected = { id: shopId, status: 'suspended' };
      mockShopService.suspendShop.mockResolvedValue(expected);

      const result = await controller.suspendShop(shopId, userId, dto);

      expect(mockShopService.suspendShop).toHaveBeenCalledWith(
        shopId,
        userId,
        dto,
      );
      expect(result).toBe(expected);
    });
  });

  describe('unlockShop', () => {
    it('should call shopService.unlockShop with shop id and user id', async () => {
      const expected = { id: shopId, status: 'active' };
      mockShopService.unlockShop.mockResolvedValue(expected);

      const result = await controller.unlockShop(shopId, userId);

      expect(mockShopService.unlockShop).toHaveBeenCalledWith(shopId, userId);
      expect(result).toBe(expected);
    });
  });

  describe('updateMyShop', () => {
    it('should call shopService.updateShop with user id and dto', async () => {
      const dto = { name: 'Renamed Shop' } as UpdateShopDto;
      const expected = { id: shopId, name: 'Renamed Shop' };
      mockShopService.updateShop.mockResolvedValue(expected);

      const result = await controller.updateMyShop(shopId, userId, dto);

      expect(mockShopService.updateShop).toHaveBeenCalledWith(userId, dto);
      expect(result).toBe(expected);
    });
  });

  describe('getAllShops', () => {
    it('should call shopService.getAllShops', async () => {
      const expected = [{ id: shopId }];
      mockShopService.getAllShops.mockResolvedValue(expected);

      const result = await controller.getAllShops();

      expect(mockShopService.getAllShops).toHaveBeenCalledWith();
      expect(result).toBe(expected);
    });
  });

  describe('getShopById', () => {
    it('should call shopService.getShopById with the shop id', async () => {
      const expected = { id: shopId };
      mockShopService.getShopById.mockResolvedValue(expected);

      const result = await controller.getShopById(shopId);

      expect(mockShopService.getShopById).toHaveBeenCalledWith(shopId);
      expect(result).toBe(expected);
    });
  });
});
