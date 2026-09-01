import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Voucher } from './entities/voucher.entity';
import { VoucherUsage } from './entities/voucher-usage.entity';
import { VoucherScope } from '../../common/enums/voucher-scope.enum';
import { VoucherStatus } from '../../common/enums/voucher-status.enum';
import { VoucherType } from '../../common/enums/voucher-type.enum';
import { AppException } from '../../common/exceptions/app.exception';
import { VoucherErrorCode } from './constants/voucher-error-code.constant';
import { VoucherOrderContext } from './interfaces/voucher-order-context.interface';
import {
  VoucherCombinationResult,
  VoucherValidationResult,
} from './interfaces/voucher-validation-result.interface';
import {
  assertNoVoucherScopeConflict,
  assertVoucherScopeApplicable,
} from './utils/voucher-scope.util';

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

  async validateVoucherCombination(
    voucherCodes: string[],
    userId: string,
    orderContext: VoucherOrderContext,
  ): Promise<VoucherCombinationResult> {
    const uniqueCodes = Array.from(
      new Set(voucherCodes.map((code) => code.trim().toUpperCase())),
    ).filter(Boolean);

    if (uniqueCodes.length === 0) {
      return {
        results: [],
        totalDiscount: 0,
        finalAmount: orderContext.orderAmount,
      };
    }

    const rawResults: VoucherValidationResult[] = [];
    for (const code of uniqueCodes) {
      rawResults.push(await this.validateVoucher(code, userId, orderContext));
    }

    assertNoVoucherScopeConflict(rawResults.map((r) => r.voucher));

    // Trừ tuần tự: SYSTEM trước, SHOP sau
    const orderedResults = [...rawResults].sort((a, b) => {
      if (a.voucher.scope === b.voucher.scope) return 0;
      return a.voucher.scope === VoucherScope.SYSTEM ? -1 : 1;
    });

    let remaining = orderContext.orderAmount;

    for (const { discountAmount: rawDiscount } of orderedResults) {
      remaining = remaining - rawDiscount;

      if (remaining <= 0) {
        remaining = MIN_PAYABLE_AMOUNT;
      }
    }

    const finalAmount = remaining;
    const totalDiscount = orderContext.orderAmount - finalAmount;

    const resultsInInputOrder = uniqueCodes.map(
      (code) =>
        rawResults.find(
          (r) => r.voucher.code === code,
        ) as VoucherValidationResult,
    );

    return {
      results: resultsInInputOrder,
      totalDiscount,
      finalAmount,
    };
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
