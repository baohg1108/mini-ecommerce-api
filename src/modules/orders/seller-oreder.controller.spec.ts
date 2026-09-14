import { Test, TestingModule } from '@nestjs/testing';
import { SellerOrdersController } from './seller-orders.controller';
import { OrdersService } from './orders.service';
import { SellerOrderListQueryDto } from './dtos/seller-order-list-query.dto';
import { SellerOrderListResponseDto } from './dtos/seller-order-list.response.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';

const mockGuard = { canActivate: jest.fn(() => true) };

describe('SellerOrdersController', () => {
  let controller: SellerOrdersController;

  const mockOrdersService = {
    getShopOrders: jest.fn(),
  };

  const sellerId = 'seller-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SellerOrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<SellerOrdersController>(SellerOrdersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getShopOrders', () => {
    it('should call ordersService.getShopOrders with seller id and query', async () => {
      const query = { page: 1, limit: 20 } as SellerOrderListQueryDto;
      const expected = {
        data: [],
        total: 0,
      } as unknown as SellerOrderListResponseDto;
      mockOrdersService.getShopOrders.mockResolvedValue(expected);

      const result = await controller.getShopOrders(sellerId, query);

      expect(mockOrdersService.getShopOrders).toHaveBeenCalledWith(
        sellerId,
        query,
      );
      expect(result).toBe(expected);
    });
  });
});
