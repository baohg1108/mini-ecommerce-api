import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { Voucher } from './entities/voucher.entity';
import { Shop } from '../shops/entities/shop.entity';
import { CreateVoucherDto } from './dtos/create-voucher.dto';
import { VoucherResponseDto } from './dtos/voucher-response.dto';
import { VoucherType } from '../../common/enums/voucher-type.enum';
import { VoucherScope } from '../../common/enums/voucher-scope.enum';
import { VoucherStatus } from '../../common/enums/voucher-status.enum';
import { ShopStatus } from '../../common/enums/shop-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { UsersService } from '../users/users.service';

@Injectable()
export class VouchersService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
    private readonly usersService: UsersService,
  ) {}

  async createVoucher(
    userId: string,
    createVoucherDto: CreateVoucherDto,
  ): Promise<VoucherResponseDto> {
    const currentUser = await this.usersService.findUserById(userId);
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    const { scope, shopId } = await this.resolveScope(userId, currentUser.role);

    const code = createVoucherDto.code.trim().toUpperCase();
    const { startDate, endDate } = this.validateDateRange(
      createVoucherDto.startDate,
      createVoucherDto.endDate,
    );

    this.validateDiscountValue(
      createVoucherDto.discountType,
      createVoucherDto.discountValue,
    );

    await this.ensureCodeIsUnique(code, scope, shopId);

    const now = new Date();
    const status =
      startDate > now ? VoucherStatus.UPCOMING : VoucherStatus.ACTIVE;

    const voucher = this.voucherRepository.create({
      code,
      discountType: createVoucherDto.discountType,
      discountValue: createVoucherDto.discountValue,
      minOrderValue: createVoucherDto.minOrderValue ?? 0,
      maxDiscountValue: createVoucherDto.maxDiscountValue ?? null,
      startDate,
      endDate,
      usageLimit: createVoucherDto.usageLimit,
      usedCount: 0,
      usageLimitPerUser: createVoucherDto.usageLimitPerUser ?? null,
      scope,
      shopId,
      status,
      createdBy: userId,
    });

    try {
      const savedVoucher = await this.voucherRepository.save(voucher);
      return plainToInstance(VoucherResponseDto, savedVoucher);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          scope === VoucherScope.SYSTEM
            ? 'Voucher code already exists in the system'
            : 'Voucher code already exists in your shop',
        );
      }
      throw error;
    }
  }

  private async resolveScope(
    userId: string,
    role: UserRole,
  ): Promise<{ scope: VoucherScope; shopId: string | null }> {
    if (role === UserRole.ADMIN) {
      return { scope: VoucherScope.SYSTEM, shopId: null };
    }

    if (role === UserRole.SELLER) {
      const shop = await this.shopRepository.findOne({ where: { userId } });

      if (!shop) {
        throw new ForbiddenException(
          'You do not have a shop registered. Please register a shop first',
        );
      }

      if (shop.status !== ShopStatus.ACTIVE) {
        throw new ForbiddenException(
          'Your shop must be active to create vouchers',
        );
      }

      return { scope: VoucherScope.SHOP, shopId: shop.id };
    }

    throw new ForbiddenException(
      'You do not have permission to create vouchers',
    );
  }

  private validateDateRange(
    startDateInput: string,
    endDateInput: string,
  ): { startDate: Date; endDate: Date } {
    const startDate = new Date(startDateInput);
    const endDate = new Date(endDateInput);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid start date or end date');
    }

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    if (endDate <= new Date()) {
      throw new BadRequestException('End date must be in the future');
    }

    return { startDate, endDate };
  }

  private validateDiscountValue(
    discountType: VoucherType,
    discountValue: number,
  ): void {
    if (discountType === VoucherType.PERCENTAGE && discountValue > 100) {
      throw new BadRequestException(
        'Percentage discount value must not exceed 100',
      );
    }
  }

  private async ensureCodeIsUnique(
    code: string,
    scope: VoucherScope,
    shopId: string | null,
  ): Promise<void> {
    const existing = await this.voucherRepository.findOne({
      where:
        scope === VoucherScope.SYSTEM
          ? { code, shopId: IsNull() }
          : { code, shopId: shopId as string },
    });

    if (existing) {
      throw new ConflictException(
        scope === VoucherScope.SYSTEM
          ? 'Voucher code already exists in the system'
          : 'Voucher code already exists in your shop',
      );
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    );
  }
}
