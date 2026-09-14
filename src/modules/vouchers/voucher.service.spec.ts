import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { VoucherValidationService } from './voucher-validation.service';
import { Voucher } from './entities/voucher.entity';
import { VoucherUsage } from './entities/voucher-usage.entity';
import { VoucherScope } from '../../common/enums/voucher-scope.enum';
import { VoucherStatus } from '../../common/enums/voucher-status.enum';
import { VoucherType } from '../../common/enums/voucher-type.enum';
import { AppException } from '../../common/exceptions/app.exception';
import { GroupedCartDto } from '../cart/dtos/grouped-cart.dto';

describe('VoucherValidationService (Comprehensive Unit Tests)', () => {
  let service: VoucherValidationService;

  const mockVoucherRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockVoucherUsageRepository = {
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoucherValidationService,
        {
          provide: getRepositoryToken(Voucher),
          useValue: mockVoucherRepository,
        },
        {
          provide: getRepositoryToken(VoucherUsage),
          useValue: mockVoucherUsageRepository,
        },
      ],
    }).compile();

    service = module.get<VoucherValidationService>(VoucherValidationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateVoucher', () => {
    const orderContext = { orderAmount: 500000, shopId: 'shop-1' };

    it('should throw NotFoundException (AppException) when voucher does not exist', async () => {
      mockVoucherRepository.findOne.mockResolvedValue(null);

      await expect(
        service.validateVoucher('INVALID', 'user-1', orderContext),
      ).rejects.toThrow(AppException);
    });

    it('should throw AppException when voucher is disabled', async () => {
      const voucher = {
        id: 'v-1',
        code: 'DISC',
        status: VoucherStatus.DISABLED,
        scope: VoucherScope.SYSTEM,
      };
      mockVoucherRepository.findOne.mockResolvedValue(voucher);

      await expect(
        service.validateVoucher('DISC', 'user-1', orderContext),
      ).rejects.toThrow(AppException);
    });

    it('should throw AppException when voucher is not active yet (not started)', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const voucher = {
        id: 'v-1',
        code: 'DISC',
        status: VoucherStatus.ACTIVE,
        scope: VoucherScope.SYSTEM,
        startDate: futureDate,
        endDate: new Date(futureDate.getTime() + 86400000),
      };
      mockVoucherRepository.findOne.mockResolvedValue(voucher);

      await expect(
        service.validateVoucher('DISC', 'user-1', orderContext),
      ).rejects.toThrow(AppException);
    });

    it('should throw AppException when voucher has expired', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const voucher = {
        id: 'v-1',
        code: 'DISC',
        status: VoucherStatus.ACTIVE,
        scope: VoucherScope.SYSTEM,
        startDate: new Date(pastDate.getTime() - 86400000),
        endDate: pastDate,
      };
      mockVoucherRepository.findOne.mockResolvedValue(voucher);

      await expect(
        service.validateVoucher('DISC', 'user-1', orderContext),
      ).rejects.toThrow(AppException);
    });

    it('should throw AppException when total usage limit is reached', async () => {
      const now = new Date();
      const voucher = {
        id: 'v-1',
        code: 'DISC',
        status: VoucherStatus.ACTIVE,
        scope: VoucherScope.SYSTEM,
        startDate: new Date(now.getTime() - 86400000),
        endDate: new Date(now.getTime() + 86400000),
        usedCount: 100,
        usageLimit: 100,
      };
      mockVoucherRepository.findOne.mockResolvedValue(voucher);

      await expect(
        service.validateVoucher('DISC', 'user-1', orderContext),
      ).rejects.toThrow(AppException);
    });

    it('should throw AppException when min order value is not met', async () => {
      const now = new Date();
      const voucher = {
        id: 'v-1',
        code: 'DISC',
        status: VoucherStatus.ACTIVE,
        scope: VoucherScope.SYSTEM,
        startDate: new Date(now.getTime() - 86400000),
        endDate: new Date(now.getTime() + 86400000),
        usedCount: 10,
        usageLimit: 100,
        minOrderValue: 1000000,
      };
      mockVoucherRepository.findOne.mockResolvedValue(voucher);

      await expect(
        service.validateVoucher('DISC', 'user-1', {
          orderAmount: 500000,
          shopId: 'shop-1',
        }),
      ).rejects.toThrow(AppException);
    });

    it('should throw AppException when user usage limit is reached', async () => {
      const now = new Date();
      const voucher = {
        id: 'v-1',
        code: 'DISC',
        status: VoucherStatus.ACTIVE,
        scope: VoucherScope.SYSTEM,
        startDate: new Date(now.getTime() - 86400000),
        endDate: new Date(now.getTime() + 86400000),
        usedCount: 10,
        usageLimit: 100,
        minOrderValue: 100,
        usageLimitPerUser: 1,
      };
      mockVoucherRepository.findOne.mockResolvedValue(voucher);
      mockVoucherUsageRepository.count.mockResolvedValue(1);

      await expect(
        service.validateVoucher('DISC', 'user-1', orderContext),
      ).rejects.toThrow(AppException);
    });

    it('should successfully validate voucher and calculate percentage discount with max limit', async () => {
      const now = new Date();
      const voucher = {
        id: 'v-1',
        code: 'DISC',
        status: VoucherStatus.ACTIVE,
        scope: VoucherScope.SYSTEM,
        startDate: new Date(now.getTime() - 86400000),
        endDate: new Date(now.getTime() + 86400000),
        usedCount: 10,
        usageLimit: 100,
        minOrderValue: 100,
        usageLimitPerUser: 2,
        discountType: VoucherType.PERCENTAGE,
        discountValue: 50,
        maxDiscountValue: 50000,
      };
      mockVoucherRepository.findOne.mockResolvedValue(voucher);
      mockVoucherUsageRepository.count.mockResolvedValue(0);

      const result = await service.validateVoucher(
        'DISC',
        'user-1',
        orderContext,
      );
      expect(result).toBeDefined();
      expect(result.discountAmount).toBe(50000);
    });

    it('should successfully calculate fixed amount discount with min payable boundary', async () => {
      const now = new Date();
      const voucher = {
        id: 'v-1',
        code: 'DISC',
        status: VoucherStatus.ACTIVE,
        scope: VoucherScope.SYSTEM,
        startDate: new Date(now.getTime() - 86400000),
        endDate: new Date(now.getTime() + 86400000),
        usedCount: 10,
        usageLimit: 100,
        minOrderValue: 100,
        usageLimitPerUser: null,
        discountType: VoucherType.FIXED_AMOUNT,
        discountValue: 499500,
      };
      mockVoucherRepository.findOne.mockResolvedValue(voucher);
      mockVoucherUsageRepository.count.mockResolvedValue(0);

      const result = await service.validateVoucher(
        'DISC',
        'user-1',
        orderContext,
      );
      expect(result.discountAmount).toBe(499000);
    });
  });

  describe('countUserUsage', () => {
    it('should return usage count from repository', async () => {
      mockVoucherUsageRepository.count.mockResolvedValue(3);
      const count = await service.countUserUsage('v-1', 'user-1');
      expect(count).toBe(3);
      expect(mockVoucherUsageRepository.count).toHaveBeenCalledWith({
        where: { voucherId: 'v-1', userId: 'user-1' },
      });
    });
  });

  describe('applyVouchersToCart', () => {
    const groupedCart: GroupedCartDto[] = [
      {
        shop: { id: 'shop-1', name: 'Shop 1' },
        items: [
          {
            id: 'item-1',
            variantId: 'var-1',
            price: 300000,
            quantity: 1,
            isAvailable: true,
          },
        ],
      },
      {
        shop: { id: 'shop-2', name: 'Shop 2' },
        items: [
          {
            id: 'item-2',
            variantId: 'var-2',
            price: 300000,
            quantity: 1,
            isAvailable: true,
          },
        ],
      },
    ];

    it('should throw BadRequestException if cart is empty', async () => {
      await expect(
        service.applyVouchersToCart(['DISC'], 'user-1', []),
      ).rejects.toThrow(AppException);
    });

    it('should throw NotFoundException if voucher code does not exist during application', async () => {
      mockVoucherRepository.findOne.mockResolvedValue(null);

      await expect(
        service.applyVouchersToCart(['INVALID'], 'user-1', groupedCart),
      ).rejects.toThrow(AppException);
    });

    it('should apply valid multi-shop and system vouchers successfully', async () => {
      const now = new Date();
      const systemVoucher = {
        id: 'v-sys',
        code: 'SYS10',
        scope: VoucherScope.SYSTEM,
        status: VoucherStatus.ACTIVE,
        startDate: new Date(now.getTime() - 86400000),
        endDate: new Date(now.getTime() + 86400000),
        usedCount: 0,
        usageLimit: 10,
        minOrderValue: 0,
        discountType: VoucherType.FIXED_AMOUNT,
        discountValue: 50000,
        usageLimitPerUser: null,
      };

      const shopVoucher = {
        id: 'v-shop',
        code: 'SHOP10',
        scope: VoucherScope.SHOP,
        shopId: 'shop-1',
        status: VoucherStatus.ACTIVE,
        startDate: new Date(now.getTime() - 86400000),
        endDate: new Date(now.getTime() + 86400000),
        usedCount: 0,
        usageLimit: 10,
        minOrderValue: 0,
        discountType: VoucherType.FIXED_AMOUNT,
        discountValue: 30000,
        usageLimitPerUser: null,
      };

      mockVoucherRepository.findOne.mockImplementation(
        (options: { where: unknown }) => {
          const conditions = Array.isArray(options.where)
            ? options.where
            : [options.where];
          for (const cond of conditions) {
            const codeVal = (cond as { code?: string })?.code;
            if (codeVal === 'SYS10') return Promise.resolve(systemVoucher);
            if (codeVal === 'SHOP10') return Promise.resolve(shopVoucher);
          }
          return Promise.resolve(null);
        },
      );

      const result = await service.applyVouchersToCart(
        ['SYS10', 'SHOP10'],
        'user-1',
        groupedCart,
      );
      expect(result).toBeDefined();
      expect(result.totalDiscount).toBeGreaterThan(0);
      expect(result.shopAllocations.length).toBe(2);
    });

    it('should apply single-shop vouchers successfully when cart has 1 shop', async () => {
      const singleShopCart: GroupedCartDto[] = [
        {
          shop: { id: 'shop-1', name: 'Shop 1' },
          items: [
            {
              id: 'item-1',
              variantId: 'var-1',
              price: 500000,
              quantity: 1,
              isAvailable: true,
            },
          ],
        },
      ];
      const now = new Date();
      const shopVoucher = {
        id: 'v-shop',
        code: 'SHOP50',
        scope: VoucherScope.SHOP,
        shopId: 'shop-1',
        status: VoucherStatus.ACTIVE,
        startDate: new Date(now.getTime() - 86400000),
        endDate: new Date(now.getTime() + 86400000),
        usedCount: 0,
        usageLimit: 10,
        minOrderValue: 0,
        discountType: VoucherType.FIXED_AMOUNT,
        discountValue: 100000,
        usageLimitPerUser: null,
      };

      mockVoucherRepository.findOne.mockResolvedValue(shopVoucher);

      const result = await service.applyVouchersToCart(
        ['SHOP50'],
        'user-1',
        singleShopCart,
      );
      expect(result).toBeDefined();
      expect(result.shopAllocations[0].finalAmount).toBe(400000);
    });
  });

  describe('findAvailableVouchers', () => {
    it('should return empty array if cart is empty', async () => {
      const result = await service.findAvailableVouchers('user-1', []);
      expect(result).toEqual([]);
    });

    it('should return filtered list of available active valid vouchers', async () => {
      const now = new Date();
      const activeVoucher = {
        id: 'v-1',
        code: 'ACTIVE1',
        scope: VoucherScope.SYSTEM,
        status: VoucherStatus.ACTIVE,
        startDate: new Date(now.getTime() - 86400000),
        endDate: new Date(now.getTime() + 86400000),
        usedCount: 2,
        usageLimit: 10,
        minOrderValue: 100,
        discountType: VoucherType.FIXED_AMOUNT,
        discountValue: 10000,
        usageLimitPerUser: null,
      };

      mockVoucherRepository.find.mockResolvedValue([activeVoucher]);

      const groupedCart: GroupedCartDto[] = [
        {
          shop: { id: 'shop-1', name: 'Shop 1' },
          items: [
            {
              id: 'item-1',
              variantId: 'var-1',
              price: 50000,
              quantity: 2,
              isAvailable: true,
            },
          ],
        },
      ];

      const result = await service.findAvailableVouchers('user-1', groupedCart);
      expect(result.length).toBe(1);
      expect(result[0].voucher.code).toBe('ACTIVE1');
    });

    it('should skip vouchers failing date range, usage limit, or min order value conditions', async () => {
      const now = new Date();
      const invalidVouchers = [
        {
          id: 'v-1',
          code: 'FUTURE',
          scope: VoucherScope.SYSTEM,
          status: VoucherStatus.ACTIVE,
          startDate: new Date(now.getTime() + 86400000),
          endDate: new Date(now.getTime() + 172800000),
          usedCount: 0,
          usageLimit: 10,
          minOrderValue: 0,
          discountType: VoucherType.FIXED_AMOUNT,
          discountValue: 10000,
        },
        {
          id: 'v-2',
          code: 'MAXED',
          scope: VoucherScope.SYSTEM,
          status: VoucherStatus.ACTIVE,
          startDate: new Date(now.getTime() - 86400000),
          endDate: new Date(now.getTime() + 86400000),
          usedCount: 10,
          usageLimit: 10,
          minOrderValue: 0,
          discountType: VoucherType.FIXED_AMOUNT,
          discountValue: 10000,
        },
        {
          id: 'v-3',
          code: 'HIGHMIN',
          scope: VoucherScope.SYSTEM,
          status: VoucherStatus.ACTIVE,
          startDate: new Date(now.getTime() - 86400000),
          endDate: new Date(now.getTime() + 86400000),
          usedCount: 0,
          usageLimit: 10,
          minOrderValue: 9999999,
          discountType: VoucherType.FIXED_AMOUNT,
          discountValue: 10000,
        },
      ];

      mockVoucherRepository.find.mockResolvedValue(invalidVouchers);

      const groupedCart: GroupedCartDto[] = [
        {
          shop: { id: 'shop-1', name: 'Shop 1' },
          items: [
            {
              id: 'item-1',
              variantId: 'var-1',
              price: 50000,
              quantity: 1,
              isAvailable: true,
            },
          ],
        },
      ];

      const result = await service.findAvailableVouchers('user-1', groupedCart);
      expect(result).toEqual([]);
    });
  });

  describe('recordUsage', () => {
    it('should increment usedCount and save voucher usage via entity manager', async () => {
      const mockManager = {
        increment: jest.fn().mockResolvedValue({}),
        create: jest
          .fn()
          .mockImplementation((_entityClass: unknown, data: unknown) => data),
        save: jest.fn().mockResolvedValue({}),
      };

      await service.recordUsage(
        mockManager as unknown as EntityManager,
        'v-1',
        'user-1',
        'order-1',
        50000,
      );

      expect(mockManager.increment).toHaveBeenCalledWith(
        Voucher,
        { id: 'v-1' },
        'usedCount',
        1,
      );
      expect(mockManager.create).toHaveBeenCalledWith(VoucherUsage, {
        voucherId: 'v-1',
        userId: 'user-1',
        orderId: 'order-1',
        discountAmount: 50000,
      });
      expect(mockManager.save).toHaveBeenCalled();
    });
  });
});
