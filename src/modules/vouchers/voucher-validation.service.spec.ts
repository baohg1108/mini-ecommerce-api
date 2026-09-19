import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { VoucherValidationService } from './voucher-validation.service';
import { Voucher } from './entities/voucher.entity';
import { VoucherUsage } from './entities/voucher-usage.entity';
import { VoucherScope } from '../../common/enums/voucher-scope.enum';
import { VoucherStatus } from '../../common/enums/voucher-status.enum';
import { VoucherType } from '../../common/enums/voucher-type.enum';
import { AppException } from '../../common/exceptions/app.exception';
import { GroupedCartDto } from '../cart/dtos/grouped-cart.dto';
import { VoucherOrderContext } from './interfaces/voucher-order-context.interface';

describe('VoucherValidationService (Comprehensive Unit Tests)', () => {
  let service: VoucherValidationService;

  const mockVoucherRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockVoucherUsageRepository = {
    count: jest.fn(),
  };

  // ==========================================================================
  // HELPERS
  // ==========================================================================
  const DAY = 86400000;
  type VoucherStub = Record<string, unknown>;

  const buildVoucher = (override: VoucherStub = {}): VoucherStub => {
    const now = Date.now();
    return {
      id: 'v-1',
      code: 'DISC',
      scope: VoucherScope.SYSTEM,
      shopId: null,
      status: VoucherStatus.ACTIVE,
      startDate: new Date(now - DAY),
      endDate: new Date(now + DAY),
      usedCount: 0,
      usageLimit: 10,
      minOrderValue: 0,
      usageLimitPerUser: null,
      discountType: VoucherType.FIXED_AMOUNT,
      discountValue: 10000,
      maxDiscountValue: null,
      ...override,
    };
  };

  const buildCart = (
    shops: Array<{ id: string; price: number | null; quantity?: number }>,
  ): GroupedCartDto[] =>
    shops.map((s) => ({
      shop: { id: s.id, name: `Shop ${s.id}` },
      items: [
        {
          id: `item-${s.id}`,
          variantId: `var-${s.id}`,
          price: s.price as number,
          quantity: s.quantity ?? 1,
          isAvailable: true,
        },
      ],
    }));

  // Trả voucher theo `code` ở where[0]
  const mockVouchersByCode = (...vouchers: VoucherStub[]) => {
    mockVoucherRepository.findOne.mockImplementation(
      (options: { where: unknown }) => {
        const conditions = Array.isArray(options.where)
          ? options.where
          : [options.where];
        const code = (conditions[0] as { code?: string }).code;
        return Promise.resolve(vouchers.find((v) => v.code === code) ?? null);
      },
    );
  };

  beforeEach(async () => {
    jest.resetAllMocks();

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
  });

  it('[VAL-UNIT-001] should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // validateVoucher
  // ==========================================================================
  describe('validateVoucher', () => {
    const orderContext = { orderAmount: 500000, shopId: 'shop-1' };

    it('[VAL-UNIT-002] should throw AppException when voucher does not exist', async () => {
      mockVoucherRepository.findOne.mockResolvedValue(null);

      await expect(
        service.validateVoucher('INVALID', 'user-1', orderContext),
      ).rejects.toThrow(AppException);
    });

    it('[VAL-UNIT-003] should throw AppException when voucher is disabled', async () => {
      mockVoucherRepository.findOne.mockResolvedValue(
        buildVoucher({ status: VoucherStatus.DISABLED }),
      );

      await expect(
        service.validateVoucher('DISC', 'user-1', orderContext),
      ).rejects.toThrow(AppException);
    });

    it('[VAL-UNIT-004] should throw AppException when voucher is not active yet', async () => {
      mockVoucherRepository.findOne.mockResolvedValue(
        buildVoucher({
          startDate: new Date(Date.now() + 5 * DAY),
          endDate: new Date(Date.now() + 6 * DAY),
        }),
      );

      await expect(
        service.validateVoucher('DISC', 'user-1', orderContext),
      ).rejects.toThrow(AppException);
    });

    it('[VAL-UNIT-005] should throw AppException when voucher has expired', async () => {
      mockVoucherRepository.findOne.mockResolvedValue(
        buildVoucher({
          startDate: new Date(Date.now() - 6 * DAY),
          endDate: new Date(Date.now() - 5 * DAY),
        }),
      );

      await expect(
        service.validateVoucher('DISC', 'user-1', orderContext),
      ).rejects.toThrow(AppException);
    });

    it('[VAL-UNIT-006] should throw AppException when total usage limit is reached', async () => {
      mockVoucherRepository.findOne.mockResolvedValue(
        buildVoucher({ usedCount: 100, usageLimit: 100 }),
      );

      await expect(
        service.validateVoucher('DISC', 'user-1', orderContext),
      ).rejects.toThrow(AppException);
    });

    it('[VAL-UNIT-007] should throw AppException when min order value is not met', async () => {
      mockVoucherRepository.findOne.mockResolvedValue(
        buildVoucher({ minOrderValue: 1000000 }),
      );

      await expect(
        service.validateVoucher('DISC', 'user-1', {
          orderAmount: 500000,
          shopId: 'shop-1',
        }),
      ).rejects.toThrow(AppException);
    });

    it('[VAL-UNIT-008] should throw AppException when user usage limit is reached', async () => {
      mockVoucherRepository.findOne.mockResolvedValue(
        buildVoucher({ minOrderValue: 100, usageLimitPerUser: 1 }),
      );
      mockVoucherUsageRepository.count.mockResolvedValue(1);

      await expect(
        service.validateVoucher('DISC', 'user-1', orderContext),
      ).rejects.toThrow(AppException);
    });

    it('[VAL-UNIT-009] should calculate percentage discount capped by maxDiscountValue', async () => {
      mockVoucherRepository.findOne.mockResolvedValue(
        buildVoucher({
          minOrderValue: 100,
          usageLimitPerUser: 2,
          discountType: VoucherType.PERCENTAGE,
          discountValue: 50,
          maxDiscountValue: 50000,
        }),
      );
      mockVoucherUsageRepository.count.mockResolvedValue(0);

      const result = await service.validateVoucher(
        'DISC',
        'user-1',
        orderContext,
      );

      expect(result).toBeDefined();
      expect(result.discountAmount).toBe(50000);
    });

    it('[VAL-UNIT-010] should clamp fixed amount discount to keep min payable amount', async () => {
      mockVoucherRepository.findOne.mockResolvedValue(
        buildVoucher({
          minOrderValue: 100,
          discountType: VoucherType.FIXED_AMOUNT,
          discountValue: 499500,
        }),
      );

      const result = await service.validateVoucher(
        'DISC',
        'user-1',
        orderContext,
      );

      expect(result.discountAmount).toBe(499000);
    });
  });

  // ==========================================================================
  // countUserUsage
  // ==========================================================================
  describe('countUserUsage', () => {
    it('[VAL-UNIT-011] should return usage count from repository', async () => {
      mockVoucherUsageRepository.count.mockResolvedValue(3);

      const count = await service.countUserUsage('v-1', 'user-1');

      expect(count).toBe(3);
      expect(mockVoucherUsageRepository.count).toHaveBeenCalledWith({
        where: { voucherId: 'v-1', userId: 'user-1' },
      });
    });
  });

  // ==========================================================================
  // applyVouchersToCart
  // ==========================================================================
  describe('applyVouchersToCart', () => {
    const groupedCart = buildCart([
      { id: 'shop-1', price: 300000 },
      { id: 'shop-2', price: 300000 },
    ]);

    it('[VAL-UNIT-012] should throw AppException if cart is empty', async () => {
      await expect(
        service.applyVouchersToCart(['DISC'], 'user-1', []),
      ).rejects.toThrow(AppException);
    });

    it('[VAL-UNIT-013] should throw AppException if voucher code does not exist during application', async () => {
      mockVoucherRepository.findOne.mockResolvedValue(null);

      await expect(
        service.applyVouchersToCart(['INVALID'], 'user-1', groupedCart),
      ).rejects.toThrow(AppException);
    });

    it('[VAL-UNIT-014] should apply valid multi-shop and system vouchers successfully', async () => {
      mockVouchersByCode(
        buildVoucher({
          id: 'v-sys',
          code: 'SYS10',
          discountValue: 50000,
        }),
        buildVoucher({
          id: 'v-shop',
          code: 'SHOP10',
          scope: VoucherScope.SHOP,
          shopId: 'shop-1',
          discountValue: 30000,
        }),
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

    it('[VAL-UNIT-015] should apply single-shop vouchers successfully when cart has 1 shop', async () => {
      mockVouchersByCode(
        buildVoucher({
          id: 'v-shop',
          code: 'SHOP50',
          scope: VoucherScope.SHOP,
          shopId: 'shop-1',
          discountValue: 100000,
        }),
      );

      const result = await service.applyVouchersToCart(
        ['SHOP50'],
        'user-1',
        buildCart([{ id: 'shop-1', price: 500000 }]),
      );

      expect(result).toBeDefined();
      expect(result.shopAllocations[0].finalAmount).toBe(400000);
    });
  });

  // ==========================================================================
  // findAvailableVouchers
  // ==========================================================================
  describe('findAvailableVouchers', () => {
    it('[VAL-UNIT-016] should return empty array if cart is empty', async () => {
      const result = await service.findAvailableVouchers('user-1', []);

      expect(result).toEqual([]);
    });

    it('[VAL-UNIT-017] should return filtered list of available active valid vouchers', async () => {
      mockVoucherRepository.find.mockResolvedValue([
        buildVoucher({
          code: 'ACTIVE1',
          usedCount: 2,
          minOrderValue: 100,
        }),
      ]);

      const result = await service.findAvailableVouchers(
        'user-1',
        buildCart([{ id: 'shop-1', price: 50000, quantity: 2 }]),
      );

      expect(result.length).toBe(1);
      expect((result[0].voucher as unknown as VoucherStub).code).toBe(
        'ACTIVE1',
      );
    });

    it('[VAL-UNIT-018] should skip vouchers failing date range, usage limit, or min order value', async () => {
      mockVoucherRepository.find.mockResolvedValue([
        buildVoucher({
          id: 'v-1',
          code: 'FUTURE',
          startDate: new Date(Date.now() + DAY),
          endDate: new Date(Date.now() + 2 * DAY),
        }),
        buildVoucher({
          id: 'v-2',
          code: 'MAXED',
          usedCount: 10,
          usageLimit: 10,
        }),
        buildVoucher({
          id: 'v-3',
          code: 'HIGHMIN',
          minOrderValue: 9999999,
        }),
      ]);

      const result = await service.findAvailableVouchers(
        'user-1',
        buildCart([{ id: 'shop-1', price: 50000 }]),
      );

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // recordUsage
  // ==========================================================================
  describe('recordUsage', () => {
    it('[VAL-UNIT-019] should increment usedCount and save voucher usage via entity manager', async () => {
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

  // ==========================================================================
  // validateVoucher - nhánh bổ sung
  // ==========================================================================
  describe('validateVoucher - additional branches', () => {
    const ctx = { orderAmount: 500000, shopId: 'shop-1' };

    it('[VAL-UNIT-020] should trim/uppercase code and search SYSTEM + SHOP scope when shopId is provided', async () => {
      mockVoucherRepository.findOne.mockResolvedValue(buildVoucher());

      await service.validateVoucher('  disc ', 'user-1', ctx);

      expect(mockVoucherRepository.findOne).toHaveBeenCalledWith({
        where: [
          { code: 'DISC', scope: VoucherScope.SYSTEM },
          { code: 'DISC', scope: VoucherScope.SHOP, shopId: 'shop-1' },
        ],
      });
    });

    it('[VAL-UNIT-021] should search only SYSTEM scope when shopId is not provided', async () => {
      mockVoucherRepository.findOne.mockResolvedValue(buildVoucher());

      await service.validateVoucher('DISC', 'user-1', {
        orderAmount: 500000,
      });

      expect(mockVoucherRepository.findOne).toHaveBeenCalledWith({
        where: [{ code: 'DISC', scope: VoucherScope.SYSTEM }],
      });
    });

    it.each([[null], [undefined]])(
      '[VAL-UNIT-022] should skip per-user check when usageLimitPerUser is %s',
      async (limit) => {
        mockVoucherRepository.findOne.mockResolvedValue(
          buildVoucher({ usageLimitPerUser: limit }),
        );

        const result = await service.validateVoucher('DISC', 'user-1', ctx);

        expect(result.discountAmount).toBe(10000);
        expect(mockVoucherUsageRepository.count).not.toHaveBeenCalled();
      },
    );

    it.each([
      [
        '[VAL-UNIT-023] percentage without cap (null)',
        {
          discountType: VoucherType.PERCENTAGE,
          discountValue: 10,
          maxDiscountValue: null,
        },
        500000,
        50000,
      ],
      [
        '[VAL-UNIT-023] percentage without cap (undefined)',
        {
          discountType: VoucherType.PERCENTAGE,
          discountValue: 10,
          maxDiscountValue: undefined,
        },
        500000,
        50000,
      ],
      [
        '[VAL-UNIT-024] percentage below cap keeps computed value',
        {
          discountType: VoucherType.PERCENTAGE,
          discountValue: 10,
          maxDiscountValue: 80000,
        },
        500000,
        50000,
      ],
      [
        '[VAL-UNIT-025] percentage 100% clamped to min payable',
        {
          discountType: VoucherType.PERCENTAGE,
          discountValue: 100,
          maxDiscountValue: null,
        },
        500000,
        499000,
      ],
      [
        '[VAL-UNIT-026] fixed amount smaller than order keeps full value',
        { discountType: VoucherType.FIXED_AMOUNT, discountValue: 10000 },
        500000,
        10000,
      ],
      [
        '[VAL-UNIT-027] order below min payable gives 0 discount',
        { discountType: VoucherType.FIXED_AMOUNT, discountValue: 10000 },
        800,
        0,
      ],
    ])('%s', async (_label, override, orderAmount, expected) => {
      mockVoucherRepository.findOne.mockResolvedValue(buildVoucher(override));

      const result = await service.validateVoucher('DISC', 'user-1', {
        orderAmount,
        shopId: 'shop-1',
      });

      expect(result.discountAmount).toBe(expected);
    });
  });

  // ==========================================================================
  // applyVouchersToCart - nhánh bổ sung
  // ==========================================================================
  describe('applyVouchersToCart - additional branches', () => {
    it('[VAL-UNIT-028] should normalize, dedupe and ignore blank codes', async () => {
      mockVouchersByCode(buildVoucher({ code: 'SYS10' }));
      const cart = buildCart([{ id: 'shop-1', price: 500000 }]);

      const result = await service.applyVouchersToCart(
        [' sys10 ', 'SYS10', '   '],
        'user-1',
        cart,
      );

      expect(mockVoucherRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockVoucherRepository.findOne).toHaveBeenCalledWith({
        where: [
          { code: 'SYS10', scope: VoucherScope.SYSTEM },
          { code: 'SYS10', scope: VoucherScope.SHOP, shopId: In(['shop-1']) },
        ],
      });
      expect(result.shopAllocations[0].systemDiscountAllocated).toBe(10000);
    });

    it('[VAL-UNIT-029] should return no discount when voucher list is empty (single shop)', async () => {
      const cart = buildCart([{ id: 'shop-1', price: 500000 }]);

      const result = await service.applyVouchersToCart([], 'user-1', cart);

      expect(result.systemVoucher).toBeUndefined();
      expect(result.shopAllocations[0].shopVoucher).toBeUndefined();
      expect(result.cartTotal).toBe(500000);
      expect(result.totalDiscount).toBe(0);
      expect(result.finalAmount).toBe(500000);
    });

    it('[VAL-UNIT-030] single shop: should apply system voucher only', async () => {
      mockVouchersByCode(buildVoucher({ code: 'SYS', discountValue: 100000 }));
      const cart = buildCart([{ id: 'shop-1', price: 500000 }]);

      const result = await service.applyVouchersToCart(['SYS'], 'user-1', cart);

      expect(result.systemVoucher?.voucher.code).toBe('SYS');
      expect(result.shopAllocations[0].systemDiscountAllocated).toBe(100000);
      expect(result.shopAllocations[0].totalDiscount).toBe(100000);
      expect(result.shopAllocations[0].finalAmount).toBe(400000);
      expect(result.finalAmount).toBe(400000);
    });

    it('[VAL-UNIT-031] single shop: should apply system then shop voucher sequentially', async () => {
      mockVouchersByCode(
        buildVoucher({
          code: 'SYS',
          discountType: VoucherType.PERCENTAGE,
          discountValue: 10,
        }),
        buildVoucher({
          id: 'v-shop',
          code: 'SHOP',
          scope: VoucherScope.SHOP,
          shopId: 'shop-1',
          discountType: VoucherType.PERCENTAGE,
          discountValue: 10,
        }),
      );
      const cart = buildCart([{ id: 'shop-1', price: 500000 }]);

      const result = await service.applyVouchersToCart(
        ['SYS', 'SHOP'],
        'user-1',
        cart,
      );

      // system: 10% of 500000 = 50000 -> 450000; shop: 10% of 450000 = 45000 -> 405000
      expect(result.shopAllocations[0].systemDiscountAllocated).toBe(50000);
      expect(result.shopAllocations[0].shopVoucher?.discountAmount).toBe(45000);
      expect(result.totalDiscount).toBe(95000);
      expect(result.finalAmount).toBe(405000);
    });

    it('[VAL-UNIT-032] single shop: subtotal 0 with system voucher should fall back to min payable', async () => {
      mockVouchersByCode(buildVoucher({ code: 'SYS' }));
      const cart = buildCart([{ id: 'shop-1', price: null }]);

      const result = await service.applyVouchersToCart(['SYS'], 'user-1', cart);

      expect(result.cartTotal).toBe(0);
      expect(result.finalAmount).toBe(1000);
    });

    it('[VAL-UNIT-033] single shop: subtotal 0 with shop voucher should fall back to min payable', async () => {
      mockVouchersByCode(
        buildVoucher({
          code: 'SHOP',
          scope: VoucherScope.SHOP,
          shopId: 'shop-1',
        }),
      );
      const cart = buildCart([{ id: 'shop-1', price: 0 }]);

      const result = await service.applyVouchersToCart(
        ['SHOP'],
        'user-1',
        cart,
      );

      expect(result.finalAmount).toBe(1000);
    });

    it('[VAL-UNIT-034] multi shop: should apply shop voucher only (no system voucher)', async () => {
      mockVouchersByCode(
        buildVoucher({
          code: 'SHOP10',
          scope: VoucherScope.SHOP,
          shopId: 'shop-1',
          discountValue: 30000,
        }),
      );
      const cart = buildCart([
        { id: 'shop-1', price: 300000 },
        { id: 'shop-2', price: 300000 },
      ]);

      const result = await service.applyVouchersToCart(
        ['SHOP10'],
        'user-1',
        cart,
      );

      expect(result.systemVoucher).toBeUndefined();
      expect(result.shopAllocations[0].shopVoucher?.discountAmount).toBe(30000);
      expect(result.shopAllocations[0].systemDiscountAllocated).toBe(0);
      expect(result.shopAllocations[0].finalAmount).toBe(270000);
      expect(result.shopAllocations[1].shopVoucher).toBeUndefined();
      expect(result.shopAllocations[1].totalDiscount).toBe(0);
      expect(result.shopAllocations[1].finalAmount).toBe(300000);
      expect(result.totalDiscount).toBe(30000);
      expect(result.finalAmount).toBe(570000);
    });

    it('[VAL-UNIT-035] multi shop: should split system voucher proportionally to shop subtotal', async () => {
      mockVouchersByCode(buildVoucher({ code: 'SYS', discountValue: 40000 }));
      const cart = buildCart([
        { id: 'shop-1', price: 300000 },
        { id: 'shop-2', price: 100000 },
      ]);

      const result = await service.applyVouchersToCart(['SYS'], 'user-1', cart);

      expect(result.shopAllocations[0].systemDiscountAllocated).toBeCloseTo(
        30000,
        5,
      );
      expect(result.shopAllocations[1].systemDiscountAllocated).toBeCloseTo(
        10000,
        5,
      );
      expect(result.shopAllocations[0].finalAmount).toBeCloseTo(270000, 5);
      expect(result.shopAllocations[1].finalAmount).toBeCloseTo(90000, 5);
      expect(result.totalDiscount).toBeCloseTo(40000, 5);
      expect(result.finalAmount).toBeCloseTo(360000, 5);
    });

    it('[VAL-UNIT-036] multi shop: should allocate system voucher on the remaining after shop discount', async () => {
      mockVouchersByCode(
        buildVoucher({ code: 'SYS10', discountValue: 50000 }),
        buildVoucher({
          id: 'v-shop',
          code: 'SHOP10',
          scope: VoucherScope.SHOP,
          shopId: 'shop-1',
          discountValue: 30000,
        }),
      );
      const cart = buildCart([
        { id: 'shop-1', price: 300000 },
        { id: 'shop-2', price: 300000 },
      ]);

      const result = await service.applyVouchersToCart(
        ['SYS10', 'SHOP10'],
        'user-1',
        cart,
      );

      const [a1, a2] = result.shopAllocations;
      expect(a1.systemDiscountAllocated).toBeCloseTo(
        (270000 / 570000) * 50000,
        5,
      );
      expect(a2.systemDiscountAllocated).toBeCloseTo(
        (300000 / 570000) * 50000,
        5,
      );
      expect(
        a1.systemDiscountAllocated + a2.systemDiscountAllocated,
      ).toBeCloseTo(50000, 5);
      expect(result.totalDiscount).toBeCloseTo(80000, 5);
      expect(result.finalAmount).toBeCloseTo(520000, 5);
    });

    it('[VAL-UNIT-037] multi shop: system voucher gives 0 when cart is below min payable', async () => {
      mockVouchersByCode(buildVoucher({ code: 'SYS', discountValue: 10000 }));
      const cart = buildCart([
        { id: 'shop-1', price: 500 },
        { id: 'shop-2', price: 400 },
      ]);

      const result = await service.applyVouchersToCart(['SYS'], 'user-1', cart);

      expect(result.systemVoucher).toBeDefined();
      expect(
        result.shopAllocations.every((a) => a.systemDiscountAllocated === 0),
      ).toBe(true);
      expect(result.totalDiscount).toBe(0);
      expect(result.finalAmount).toBe(900);
    });

    // Nếu assertNoVoucherScopeConflict (util) ném lỗi với voucher shop lạ thì xoá test này
    it('[VAL-UNIT-038] should treat shop voucher of a shop not in cart as order amount 0', async () => {
      mockVouchersByCode(
        buildVoucher({
          code: 'GHOST',
          scope: VoucherScope.SHOP,
          shopId: 'shop-x',
        }),
      );
      const cart = buildCart([{ id: 'shop-1', price: 500000 }]);

      const result = await service.applyVouchersToCart(
        ['GHOST'],
        'user-1',
        cart,
      );

      expect(result.totalDiscount).toBe(0);
      expect(result.finalAmount).toBe(500000);
    });

    it.each([
      ['disabled', { status: VoucherStatus.DISABLED }],
      [
        'not started',
        {
          startDate: new Date(Date.now() + DAY),
          endDate: new Date(Date.now() + 2 * DAY),
        },
      ],
      ['expired', { endDate: new Date(Date.now() - 1000) }],
      ['total usage reached', { usedCount: 10, usageLimit: 10 }],
    ])(
      '[VAL-UNIT-039] should throw AppException when voucher is %s',
      async (_label, override) => {
        mockVouchersByCode(buildVoucher({ code: 'SYS', ...override }));
        const cart = buildCart([{ id: 'shop-1', price: 500000 }]);

        await expect(
          service.applyVouchersToCart(['SYS'], 'user-1', cart),
        ).rejects.toThrow(AppException);
      },
    );

    it('[VAL-UNIT-040] should check shop voucher min order against the shop subtotal, not cart total', async () => {
      mockVouchersByCode(
        buildVoucher({
          code: 'SHOP',
          scope: VoucherScope.SHOP,
          shopId: 'shop-1',
          minOrderValue: 400000,
        }),
      );
      const cart = buildCart([
        { id: 'shop-1', price: 300000 },
        { id: 'shop-2', price: 300000 },
      ]);

      await expect(
        service.applyVouchersToCart(['SHOP'], 'user-1', cart),
      ).rejects.toThrow(AppException);
    });

    it('[VAL-UNIT-041] should check system voucher min order against the cart total', async () => {
      mockVouchersByCode(buildVoucher({ code: 'SYS', minOrderValue: 500000 }));
      const cart = buildCart([
        { id: 'shop-1', price: 300000 },
        { id: 'shop-2', price: 300000 },
      ]);

      const result = await service.applyVouchersToCart(['SYS'], 'user-1', cart);

      expect(result.totalDiscount).toBeCloseTo(10000, 5);
    });

    it('[VAL-UNIT-042] should throw AppException when user usage limit is reached during apply', async () => {
      mockVouchersByCode(buildVoucher({ code: 'SYS', usageLimitPerUser: 2 }));
      mockVoucherUsageRepository.count.mockResolvedValue(2);
      const cart = buildCart([{ id: 'shop-1', price: 500000 }]);

      await expect(
        service.applyVouchersToCart(['SYS'], 'user-1', cart),
      ).rejects.toThrow(AppException);
      expect(mockVoucherUsageRepository.count).toHaveBeenCalledWith({
        where: { voucherId: 'v-1', userId: 'user-1' },
      });
    });
  });

  // ==========================================================================
  // Defensive branches (gọi private method trực tiếp)
  // ==========================================================================
  describe('allocation - defensive branches', () => {
    type Allocation = {
      shopAllocations: Array<{ subtotal: number; finalAmount: number }>;
      finalAmount: number;
    };

    it('[VAL-UNIT-043] allocateMultiShop should fall back to subtotal 0 when shop is missing in map', () => {
      const svc = service as unknown as {
        allocateMultiShop: (...args: unknown[]) => Allocation;
      };
      const cart = buildCart([{ id: 'shop-1', price: 1000 }]);

      const result = svc.allocateMultiShop(
        cart,
        new Map(),
        0,
        undefined,
        new Map(),
      );

      expect(result.shopAllocations[0].subtotal).toBe(0);
      expect(result.shopAllocations[0].finalAmount).toBe(0);
      expect(result.finalAmount).toBe(0);
    });

    it('[VAL-UNIT-044] allocateSingleShop should fall back to subtotal 0 when shop is missing in map', () => {
      const svc = service as unknown as {
        allocateSingleShop: (...args: unknown[]) => Allocation;
      };
      const cart = buildCart([{ id: 'shop-1', price: 1000 }]);

      const result = svc.allocateSingleShop(
        cart[0],
        new Map(),
        undefined,
        new Map(),
      );

      expect(result.shopAllocations[0].subtotal).toBe(0);
      expect(result.finalAmount).toBe(0);
    });
  });

  // ==========================================================================
  // findAvailableVouchers - nhánh bổ sung
  // ==========================================================================
  describe('findAvailableVouchers - additional branches', () => {
    // shop-1 = 200000 (item price null tính 0), shop-2 = 1000000, cartTotal = 1200000
    const mixedCart = [
      {
        shop: { id: 'shop-1', name: 'Shop 1' },
        items: [
          {
            id: 'i1',
            variantId: 'v1',
            price: 100000,
            quantity: 2,
            isAvailable: true,
          },
          {
            id: 'i2',
            variantId: 'v2',
            price: null,
            quantity: 1,
            isAvailable: true,
          },
        ],
      },
      {
        shop: { id: 'shop-2', name: 'Shop 2' },
        items: [
          {
            id: 'i3',
            variantId: 'v3',
            price: 1000000,
            quantity: 1,
            isAvailable: true,
          },
        ],
      },
    ] as unknown as GroupedCartDto[];

    it('[VAL-UNIT-045] should query ACTIVE SYSTEM vouchers and ACTIVE SHOP vouchers of shops in cart', async () => {
      mockVoucherRepository.find.mockResolvedValue([]);

      const result = await service.findAvailableVouchers('user-1', mixedCart);

      expect(result).toEqual([]);
      expect(mockVoucherRepository.find).toHaveBeenCalledWith({
        where: [
          { scope: VoucherScope.SYSTEM, status: VoucherStatus.ACTIVE },
          {
            scope: VoucherScope.SHOP,
            status: VoucherStatus.ACTIVE,
            shopId: In(['shop-1', 'shop-2']),
          },
        ],
      });
    });

    it('[VAL-UNIT-046] should skip expired vouchers', async () => {
      mockVoucherRepository.find.mockResolvedValue([
        buildVoucher({
          code: 'EXPIRED',
          startDate: new Date(Date.now() - 3 * DAY),
          endDate: new Date(Date.now() - DAY),
        }),
      ]);

      expect(await service.findAvailableVouchers('user-1', mixedCart)).toEqual(
        [],
      );
    });

    it('[VAL-UNIT-047] should include SHOP voucher using only its shop subtotal (null price counts as 0)', async () => {
      mockVoucherRepository.find.mockResolvedValue([
        buildVoucher({
          code: 'SHOP_OK',
          scope: VoucherScope.SHOP,
          shopId: 'shop-1',
          minOrderValue: 150000,
          discountValue: 20000,
        }),
      ]);

      const result = await service.findAvailableVouchers('user-1', mixedCart);

      expect(result).toHaveLength(1);
      expect(result[0].voucher.code).toBe('SHOP_OK');
      expect(result[0].discountAmount).toBe(20000);
    });

    it('[VAL-UNIT-048] should skip SHOP voucher when min order > shop subtotal even if cart total is enough', async () => {
      mockVoucherRepository.find.mockResolvedValue([
        buildVoucher({
          code: 'SHOP_HIGH',
          scope: VoucherScope.SHOP,
          shopId: 'shop-1',
          minOrderValue: 300000,
        }),
      ]);

      expect(await service.findAvailableVouchers('user-1', mixedCart)).toEqual(
        [],
      );
    });

    it('[VAL-UNIT-049] should skip SHOP voucher whose shop is not in the cart', async () => {
      mockVoucherRepository.find.mockResolvedValue([
        buildVoucher({
          code: 'GHOST',
          scope: VoucherScope.SHOP,
          shopId: 'shop-3',
          minOrderValue: 1,
        }),
      ]);

      expect(await service.findAvailableVouchers('user-1', mixedCart)).toEqual(
        [],
      );
    });

    it('[VAL-UNIT-050] should evaluate SYSTEM voucher min order against the cart total', async () => {
      mockVoucherRepository.find.mockResolvedValue([
        buildVoucher({ code: 'SYS_OK', minOrderValue: 1100000 }),
        buildVoucher({ id: 'v-2', code: 'SYS_HIGH', minOrderValue: 1300000 }),
      ]);

      const result = await service.findAvailableVouchers('user-1', mixedCart);

      expect(result.map((r) => r.voucher.code)).toEqual(['SYS_OK']);
    });

    it('[VAL-UNIT-051] should exclude voucher when user usage limit is reached', async () => {
      mockVoucherRepository.find.mockResolvedValue([
        buildVoucher({ code: 'LIMITED', usageLimitPerUser: 2 }),
      ]);
      mockVoucherUsageRepository.count.mockResolvedValue(2);

      const result = await service.findAvailableVouchers('user-1', mixedCart);

      expect(result).toEqual([]);
      expect(mockVoucherUsageRepository.count).toHaveBeenCalledWith({
        where: { voucherId: 'v-1', userId: 'user-1' },
      });
    });

    it('[VAL-UNIT-052] should include voucher when user usage is below the limit', async () => {
      mockVoucherRepository.find.mockResolvedValue([
        buildVoucher({ code: 'LIMITED', usageLimitPerUser: 2 }),
      ]);
      mockVoucherUsageRepository.count.mockResolvedValue(1);

      const result = await service.findAvailableVouchers('user-1', mixedCart);

      expect(result).toHaveLength(1);
      expect(result[0].voucher.code).toBe('LIMITED');
    });

    it('[VAL-UNIT-053] should not query user usage when usageLimitPerUser is undefined', async () => {
      mockVoucherRepository.find.mockResolvedValue([
        buildVoucher({ code: 'FREE', usageLimitPerUser: undefined }),
      ]);

      const result = await service.findAvailableVouchers('user-1', mixedCart);

      expect(result).toHaveLength(1);
      expect(mockVoucherUsageRepository.count).not.toHaveBeenCalled();
    });
  });
});
