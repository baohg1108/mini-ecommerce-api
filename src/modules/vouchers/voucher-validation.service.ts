import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Voucher } from './entities/voucher.entity';
import { VoucherUsage } from './entities/voucher-usage.entity';
import { VoucherScope } from '../../common/enums/voucher-scope.enum';
import { VoucherStatus } from '../../common/enums/voucher-status.enum';
import { VoucherType } from '../../common/enums/voucher-type.enum';
import { AppException } from '../../common/exceptions/app.exception';
import { VoucherErrorCode } from './constants/voucher-error-code.constant';
import { VoucherOrderContext } from './interfaces/voucher-order-context.interface';
import {
  CartVoucherApplicationResult,
  ShopVoucherAllocation,
  VoucherValidationResult,
} from './interfaces/voucher-validation-result.interface';
import {
  assertNoVoucherScopeConflict,
  assertVoucherScopeApplicable,
} from './utils/voucher-scope.util';
import { GroupedCartDto } from '../cart/dtos/grouped-cart.dto';

const MIN_PAYABLE_AMOUNT = 1000;

@Injectable()
export class VoucherValidationService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(VoucherUsage)
    private readonly voucherUsageRepository: Repository<VoucherUsage>,
  ) {}

  async validateVoucher(
    voucherCode: string,
    userId: string,
    orderContext: VoucherOrderContext,
  ): Promise<VoucherValidationResult> {
    const voucher = await this.findVoucherByCode(
      voucherCode,
      orderContext.shopId,
    );

    if (!voucher) {
      throw new AppException(
        VoucherErrorCode.NOT_FOUND,
        'Voucher code does not exist',
        HttpStatus.NOT_FOUND,
      );
    }

    this.assertScopeMatchesOrder(voucher, orderContext);
    this.assertNotDisabled(voucher);
    this.assertWithinEffectivePeriod(voucher);
    this.assertTotalUsageNotExceeded(voucher);
    this.assertMinOrderValueMet(voucher, orderContext);

    await this.assertUserUsageNotExceeded(voucher, userId);

    const discountAmount = this.calculateDiscountAmount(
      voucher,
      orderContext.orderAmount,
    );

    return { voucher, discountAmount };
  }

  async countUserUsage(voucherId: string, userId: string): Promise<number> {
    return this.voucherUsageRepository.count({
      where: { voucherId, userId },
    });
  }


  async applyVouchersToCart(
    voucherCodes: string[],
    userId: string,
    groupedCart: GroupedCartDto[],
  ): Promise<CartVoucherApplicationResult> {
    if (!groupedCart.length) {
      throw new AppException(
        VoucherErrorCode.NOT_FOUND,
        'Cart is empty',
        HttpStatus.BAD_REQUEST,
      );
    }

    const shopIds = groupedCart.map((group) => group.shop.id);
    const shopSubtotals = new Map<string, number>();
    for (const group of groupedCart) {
      shopSubtotals.set(group.shop.id, this.sumGroupSubtotal(group));
    }
    const cartTotal = Array.from(shopSubtotals.values()).reduce(
      (sum, value) => sum + value,
      0,
    );

    const uniqueCodes = Array.from(
      new Set(voucherCodes.map((code) => code.trim().toUpperCase())),
    ).filter(Boolean);

    const resolved: VoucherValidationResult[] = [];
    for (const code of uniqueCodes) {
      const voucher = await this.resolveVoucherForShops(code, shopIds);

      if (!voucher) {
        throw new AppException(
          VoucherErrorCode.NOT_FOUND,
          `Voucher code ${code} does not exist`,
          HttpStatus.NOT_FOUND,
        );
      }

      const orderAmount =
        voucher.scope === VoucherScope.SYSTEM
          ? cartTotal
          : (shopSubtotals.get(voucher.shopId as string) ?? 0);

      this.assertNotDisabled(voucher);
      this.assertWithinEffectivePeriod(voucher);
      this.assertTotalUsageNotExceeded(voucher);
      this.assertMinOrderValueMet(voucher, {
        orderAmount,
        shopId: voucher.shopId,
      });
      await this.assertUserUsageNotExceeded(voucher, userId);

      resolved.push({
        voucher,
        discountAmount: this.calculateDiscountAmount(voucher, orderAmount),
      });
    }

    assertNoVoucherScopeConflict(resolved.map((r) => r.voucher));

    const systemResult = resolved.find(
      (r) => r.voucher.scope === VoucherScope.SYSTEM,
    );
    const shopResultByShopId = new Map<string, VoucherValidationResult>();
    for (const r of resolved) {
      if (r.voucher.scope === VoucherScope.SHOP) {
        shopResultByShopId.set(r.voucher.shopId as string, r);
      }
    }

    const isMultiShop = groupedCart.length > 1;

    if (isMultiShop) {
      return this.allocateMultiShop(
        groupedCart,
        shopSubtotals,
        cartTotal,
        systemResult,
        shopResultByShopId,
      );
    }

    return this.allocateSingleShop(
      groupedCart[0],
      shopSubtotals,
      systemResult,
      shopResultByShopId,
    );
  }

  private allocateMultiShop(
    groupedCart: GroupedCartDto[],
    shopSubtotals: Map<string, number>,
    cartTotal: number,
    systemResult: VoucherValidationResult | undefined,
    shopResultByShopId: Map<string, VoucherValidationResult>,
  ): CartVoucherApplicationResult {
    const remainingPerShop = new Map<string, number>();
    let remainingAfterShop = cartTotal;

    for (const group of groupedCart) {
      const shopId = group.shop.id;
      const subtotal = shopSubtotals.get(shopId) ?? 0;
      const shopDiscount = shopResultByShopId.get(shopId)?.discountAmount ?? 0;
      const remaining = subtotal - shopDiscount;

      remainingPerShop.set(shopId, remaining);
      remainingAfterShop -= shopDiscount;
    }

    let systemDiscountTotal = 0;
    if (systemResult) {
      systemDiscountTotal = this.calculateDiscountAmount(
        systemResult.voucher,
        remainingAfterShop,
      );
    }


    const shopAllocations: ShopVoucherAllocation[] = groupedCart.map(
      (group) => {
        const shopId = group.shop.id;
        const subtotal = shopSubtotals.get(shopId) ?? 0;
        const shopResult = shopResultByShopId.get(shopId);
        const shopDiscount = shopResult?.discountAmount ?? 0;
        const remaining = remainingPerShop.get(shopId) ?? 0;

        const systemShare =
          systemDiscountTotal > 0 && remainingAfterShop > 0
            ? (remaining / remainingAfterShop) * systemDiscountTotal
            : 0;

        const totalDiscount = shopDiscount + systemShare;

        return {
          shopId,
          subtotal,
          shopVoucher: shopResult
            ? { voucher: shopResult.voucher, discountAmount: shopDiscount }
            : undefined,
          systemDiscountAllocated: systemShare,
          totalDiscount,
          finalAmount: subtotal - totalDiscount,
        };
      },
    );

    const totalDiscount = shopAllocations.reduce(
      (sum, a) => sum + a.totalDiscount,
      0,
    );

    return {
      systemVoucher: systemResult,
      shopAllocations,
      cartTotal,
      totalDiscount,
      finalAmount: cartTotal - totalDiscount,
    };
  }

  private allocateSingleShop(
    group: GroupedCartDto,
    shopSubtotals: Map<string, number>,
    systemResult: VoucherValidationResult | undefined,
    shopResultByShopId: Map<string, VoucherValidationResult>,
  ): CartVoucherApplicationResult {
    const shopId = group.shop.id;
    const subtotal = shopSubtotals.get(shopId) ?? 0;

    let remaining = subtotal;

    let systemDiscount = 0;
    if (systemResult) {
      systemDiscount = this.calculateDiscountAmount(
        systemResult.voucher,
        remaining,
      );
      remaining -= systemDiscount;
      if (remaining <= 0) remaining = MIN_PAYABLE_AMOUNT;
    }

    const shopResult = shopResultByShopId.get(shopId);
    let shopDiscount = 0;
    if (shopResult) {
      shopDiscount = this.calculateDiscountAmount(
        shopResult.voucher,
        remaining,
      );
      remaining -= shopDiscount;
      if (remaining <= 0) remaining = MIN_PAYABLE_AMOUNT;
    }

    const totalDiscount = subtotal - remaining;

    const allocation: ShopVoucherAllocation = {
      shopId,
      subtotal,
      shopVoucher: shopResult
        ? { voucher: shopResult.voucher, discountAmount: shopDiscount }
        : undefined,
      systemDiscountAllocated: systemDiscount,
      totalDiscount,
      finalAmount: remaining,
    };

    return {
      systemVoucher: systemResult,
      shopAllocations: [allocation],
      cartTotal: subtotal,
      totalDiscount,
      finalAmount: remaining,
    };
  }
.
  private async resolveVoucherForShops(
    rawCode: string,
    shopIds: string[],
  ): Promise<Voucher | null> {
    const code = rawCode.trim().toUpperCase();

    return this.voucherRepository.findOne({
      where: [
        { code, scope: VoucherScope.SYSTEM },
        { code, scope: VoucherScope.SHOP, shopId: In(shopIds) },
      ],
    });
  }

  async findAvailableVouchers(
    userId: string,
    groupedCart: GroupedCartDto[],
  ): Promise<VoucherValidationResult[]> {
    if (!groupedCart.length) {
      return [];
    }

    const shopIds = groupedCart.map((group) => group.shop.id);
    const cartTotal = groupedCart.reduce(
      (sum, group) => sum + this.sumGroupSubtotal(group),
      0,
    );
    const now = new Date();

    const candidates = await this.voucherRepository.find({
      where: [
        {
          scope: VoucherScope.SYSTEM,
          status: VoucherStatus.ACTIVE,
        },
        {
          scope: VoucherScope.SHOP,
          status: VoucherStatus.ACTIVE,
          shopId: In(shopIds),
        },
      ],
    });

    const results: VoucherValidationResult[] = [];

    for (const voucher of candidates) {
      // Còn hiệu lực + còn lượt dùng tổng (SCRUM-71)
      if (now < voucher.startDate || now > voucher.endDate) continue;
      if (voucher.usedCount >= voucher.usageLimit) continue;

      const orderAmount =
        voucher.scope === VoucherScope.SYSTEM
          ? cartTotal
          : (
              groupedCart.find((group) => group.shop.id === voucher.shopId)
                ?.items ?? []
            ).reduce(
              (sum, item) => sum + Number(item.price ?? 0) * item.quantity,
              0,
            );

      if (orderAmount < voucher.minOrderValue) continue;

      if (
        voucher.usageLimitPerUser !== null &&
        voucher.usageLimitPerUser !== undefined
      ) {
        const userUsageCount = await this.countUserUsage(voucher.id, userId);
        if (userUsageCount >= voucher.usageLimitPerUser) continue;
      }

      results.push({
        voucher,
        discountAmount: this.calculateDiscountAmount(voucher, orderAmount),
      });
    }

    return results;
  }

  private sumGroupSubtotal(group: GroupedCartDto): number {
    return group.items.reduce(
      (sum, item) => sum + Number(item.price ?? 0) * item.quantity,
      0,
    );
  }

  private async findVoucherByCode(
    rawCode: string,
    shopId?: string | null,
  ): Promise<Voucher | null> {
    const code = rawCode.trim().toUpperCase();

    const whereConditions: Array<Record<string, unknown>> = [
      { code, scope: VoucherScope.SYSTEM },
    ];

    if (shopId) {
      whereConditions.push({ code, scope: VoucherScope.SHOP, shopId });
    }

    return this.voucherRepository.findOne({ where: whereConditions });
  }

  private assertScopeMatchesOrder(
    voucher: Voucher,
    orderContext: VoucherOrderContext,
  ): void {
    assertVoucherScopeApplicable(voucher, orderContext.shopId);
  }

  private assertNotDisabled(voucher: Voucher): void {
    if (voucher.status === VoucherStatus.DISABLED) {
      throw new AppException(
        VoucherErrorCode.DISABLED,
        'Voucher has been disabled',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private assertWithinEffectivePeriod(voucher: Voucher): void {
    const now = new Date();

    if (now < voucher.startDate) {
      throw new AppException(
        VoucherErrorCode.NOT_STARTED,
        'Voucher is not active yet',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (now > voucher.endDate) {
      throw new AppException(
        VoucherErrorCode.EXPIRED,
        'Voucher has expired',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private assertTotalUsageNotExceeded(voucher: Voucher): void {
    if (voucher.usedCount >= voucher.usageLimit) {
      throw new AppException(
        VoucherErrorCode.USAGE_LIMIT_REACHED,
        'Voucher has reached its total usage limit',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private assertMinOrderValueMet(
    voucher: Voucher,
    orderContext: VoucherOrderContext,
  ): void {
    if (orderContext.orderAmount < voucher.minOrderValue) {
      throw new AppException(
        VoucherErrorCode.MIN_ORDER_NOT_MET,
        `Order amount must be at least ${voucher.minOrderValue} to use this voucher`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async assertUserUsageNotExceeded(
    voucher: Voucher,
    userId: string,
  ): Promise<void> {
    if (
      voucher.usageLimitPerUser === null ||
      voucher.usageLimitPerUser === undefined
    ) {
      return;
    }

    const userUsageCount = await this.countUserUsage(voucher.id, userId);

    if (userUsageCount >= voucher.usageLimitPerUser) {
      throw new AppException(
        VoucherErrorCode.USER_LIMIT_REACHED,
        'You have reached the usage limit for this voucher',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private calculateDiscountAmount(
    voucher: Voucher,
    orderAmount: number,
  ): number {
    let discount: number;

    if (voucher.discountType === VoucherType.PERCENTAGE) {
      discount = (orderAmount * voucher.discountValue) / 100;

      if (
        voucher.maxDiscountValue !== null &&
        voucher.maxDiscountValue !== undefined
      ) {
        discount = Math.min(discount, voucher.maxDiscountValue);
      }
    } else {
      discount = voucher.discountValue;
    }
    if (orderAmount - discount < MIN_PAYABLE_AMOUNT) {
      discount = Math.max(orderAmount - MIN_PAYABLE_AMOUNT, 0);
    }

    return discount;
  }

  async recordUsage(
    manager: EntityManager,
    voucherId: string,
    userId: string,
    orderId: string,
    discountAmount: number,
  ): Promise<void> {
    await manager.increment(Voucher, { id: voucherId }, 'usedCount', 1);

    const usage = manager.create(VoucherUsage, {
      voucherId,
      userId,
      orderId,
      discountAmount,
    });

    await manager.save(VoucherUsage, usage);
  }
}
