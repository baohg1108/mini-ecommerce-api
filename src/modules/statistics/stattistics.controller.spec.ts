import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { StatisticsQueryDto } from './dto/statistics-query.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';

const mockGuard = { canActivate: jest.fn(() => true) };

describe('StatisticsController', () => {
  let controller: StatisticsController;

  const mockStatisticsService = {
    getRevenueAndOrderStats: jest.fn(),
    getTopShops: jest.fn(),
    getTopProducts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [
        { provide: StatisticsService, useValue: mockStatisticsService },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<StatisticsController>(StatisticsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getRevenueAndOrders', () => {
    it('should call statisticsService.getRevenueAndOrderStats with the query', () => {
      const query = { fromDate: '2026-01-01' } as StatisticsQueryDto;
      const expected = { revenue: 1000000, orders: 10 };
      mockStatisticsService.getRevenueAndOrderStats.mockReturnValue(expected);

      const result = controller.getRevenueAndOrders(query);

      expect(
        mockStatisticsService.getRevenueAndOrderStats,
      ).toHaveBeenCalledWith(query);
      expect(result).toBe(expected);
    });
  });

  describe('getTopShops', () => {
    it('should call statisticsService.getTopShops with the query', () => {
      const query = { limit: 5 } as StatisticsQueryDto;
      const expected = [{ shopId: 'shop-1', revenue: 500000 }];
      mockStatisticsService.getTopShops.mockReturnValue(expected);

      const result = controller.getTopShops(query);

      expect(mockStatisticsService.getTopShops).toHaveBeenCalledWith(query);
      expect(result).toBe(expected);
    });
  });

  describe('getTopProducts', () => {
    it('should call statisticsService.getTopProducts with the query', () => {
      const query = { limit: 5 } as StatisticsQueryDto;
      const expected = [{ productId: 'product-1', sold: 100 }];
      mockStatisticsService.getTopProducts.mockReturnValue(expected);

      const result = controller.getTopProducts(query);

      expect(mockStatisticsService.getTopProducts).toHaveBeenCalledWith(query);
      expect(result).toBe(expected);
    });
  });
});
