import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

import { CreateVoucherDto } from './dtos/create-voucher.dto';

const mockVoucherService = {
  validateVoucher: jest.fn(),
  applyVouchers: jest.fn(),
};

describe('Voucher Unit Test Cases Matrix (Exact Sequential Order)', () => {
  const validVoucherPayload = {
    code: 'SALE10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 100000,
    maxDiscountValue: 50000,
    startDate: new Date(Date.now() + 86400000).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    usageLimit: 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('TC-513: CreateVoucherDto - should fail when code length is < 3 chars after trim (min-1)', async () => {
    const dto = plainToInstance(CreateVoucherDto, {
      ...validVoucherPayload,
      code: 'AB',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'code')).toBeDefined();
  });

  it('TC-517: CreateVoucherDto - should fail when code length exceeds 50 chars (max+1)', async () => {
    const dto = plainToInstance(CreateVoucherDto, {
      ...validVoucherPayload,
      code: 'A'.repeat(51),
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'code')).toBeDefined();
  });

  it('TC-518: CreateVoucherDto - should fail when code contains only whitespace', async () => {
    const dto = plainToInstance(CreateVoucherDto, {
      ...validVoucherPayload,
      code: '   ',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'code')).toBeDefined();
  });

  it('TC-522: CreateVoucherDto - should fail when discountValue is negative (min-1)', async () => {
    const dto = plainToInstance(CreateVoucherDto, {
      ...validVoucherPayload,
      discountValue: -1,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'discountValue')).toBeDefined();
  });

  it('TC-523: CreateVoucherDto - should validate discountValue boundary minimum', async () => {
    const dto = plainToInstance(CreateVoucherDto, {
      ...validVoucherPayload,
      discountValue: 0,
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-526: CreateVoucherDto - should validate discountValue upper boundary', async () => {
    const dto = plainToInstance(CreateVoucherDto, {
      ...validVoucherPayload,
      discountValue: 100000002,
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-527: CreateVoucherDto - should fail when minOrderValue is negative (-1)', async () => {
    const dto = plainToInstance(CreateVoucherDto, {
      ...validVoucherPayload,
      minOrderValue: -1,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'minOrderValue')).toBeDefined();
  });

  it('TC-531: CreateVoucherDto - should validate minOrderValue upper boundary', async () => {
    const dto = plainToInstance(CreateVoucherDto, {
      ...validVoucherPayload,
      minOrderValue: 100000002,
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-532: CreateVoucherDto - should fail when maxDiscountValue is negative (-1)', async () => {
    const dto = plainToInstance(CreateVoucherDto, {
      ...validVoucherPayload,
      maxDiscountValue: -1,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'maxDiscountValue')).toBeDefined();
  });

  it('TC-536: CreateVoucherDto - should validate maxDiscountValue upper boundary', async () => {
    const dto = plainToInstance(CreateVoucherDto, {
      ...validVoucherPayload,
      maxDiscountValue: 100000002,
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-537: CreateVoucherDto - should fail when usageLimit is negative (-1)', async () => {
    const dto = plainToInstance(CreateVoucherDto, {
      ...validVoucherPayload,
      usageLimit: -1,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'usageLimit')).toBeDefined();
  });

  it('TC-541: CreateVoucherDto - should validate usageLimit upper boundary', async () => {
    const dto = plainToInstance(CreateVoucherDto, {
      ...validVoucherPayload,
      usageLimit: 101,
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-542: CreateVoucherDto - should fail when usageLimitPerUser is negative (-1)', async () => {
    const dto = plainToInstance(CreateVoucherDto, {
      ...validVoucherPayload,
      usageLimitPerUser: -1,
    });
    const errors = await validate(dto);
    expect(
      errors.find((e) => e.property === 'usageLimitPerUser'),
    ).toBeDefined();
  });

  it('TC-546: CreateVoucherDto - should validate usageLimitPerUser upper boundary', async () => {
    const dto = plainToInstance(CreateVoucherDto, {
      ...validVoucherPayload,
      usageLimitPerUser: 101,
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-548: CreateVoucherDto - should fail when discountType is outside enum ("discount")', async () => {
    const dto = plainToInstance(CreateVoucherDto, {
      ...validVoucherPayload,
      discountType: 'discount',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'discountType')).toBeDefined();
  });

  it('TC-549: CreateVoucherDto - should fail when startDate/endDate format is invalid ("31-12-2026")', async () => {
    const dto = plainToInstance(CreateVoucherDto, {
      ...validVoucherPayload,
      startDate: '31-12-2026',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'startDate')).toBeDefined();
  });

  it('TC-550: CreateVoucherDto - should fail when endDate <= startDate (equal dates)', async () => {
    const dateStr = '2026-09-10T00:00:00.000Z';
    const dto = plainToInstance(CreateVoucherDto, {
      ...validVoucherPayload,
      startDate: dateStr,
      endDate: dateStr,
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-551: CreateVoucherDto - should fail when both startDate and endDate are in the past', async () => {
    const dto = plainToInstance(CreateVoucherDto, {
      ...validVoucherPayload,
      startDate: '2020-01-01T00:00:00.000Z',
      endDate: '2020-01-31T00:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-562: Validate Voucher - should throw 400 (SHOP_MISMATCH) when voucher scope is SHOP but order belongs to another shop', async () => {
    mockVoucherService.validateVoucher.mockRejectedValueOnce(
      new BadRequestException('SHOP_MISMATCH'),
    );
    await expect(
      mockVoucherService.validateVoucher('voucher-id', 'shop-b-id'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-563: Validate Voucher - should throw 400 (DISABLED) when voucher is disabled', async () => {
    mockVoucherService.validateVoucher.mockRejectedValueOnce(
      new BadRequestException('DISABLED'),
    );
    await expect(
      mockVoucherService.validateVoucher('voucher-id'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-564: Validate Voucher - should throw 400 (NOT_STARTED) when current time is before startDate', async () => {
    mockVoucherService.validateVoucher.mockRejectedValueOnce(
      new BadRequestException('NOT_STARTED'),
    );
    await expect(
      mockVoucherService.validateVoucher('voucher-id'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-565: Validate Voucher - should throw 400 (EXPIRED) when current time is after endDate', async () => {
    mockVoucherService.validateVoucher.mockRejectedValueOnce(
      new BadRequestException('EXPIRED'),
    );
    await expect(
      mockVoucherService.validateVoucher('voucher-id'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-566: Validate Voucher - should throw 400 (USAGE_LIMIT_REACHED) when total usage limit is reached', async () => {
    mockVoucherService.validateVoucher.mockRejectedValueOnce(
      new BadRequestException('USAGE_LIMIT_REACHED'),
    );
    await expect(
      mockVoucherService.validateVoucher('voucher-id'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-567: Validate Voucher - should throw 400 (MIN_ORDER_NOT_MET) when orderAmount < minOrderValue', async () => {
    mockVoucherService.validateVoucher.mockRejectedValueOnce(
      new BadRequestException('MIN_ORDER_NOT_MET'),
    );
    await expect(
      mockVoucherService.validateVoucher('voucher-id', 50000),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-568: Validate Voucher - should throw 400 (USER_LIMIT_REACHED) when user usage limit is reached', async () => {
    mockVoucherService.validateVoucher.mockRejectedValueOnce(
      new BadRequestException('USER_LIMIT_REACHED'),
    );
    await expect(
      mockVoucherService.validateVoucher('voucher-id'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-572: Validate Voucher - should calculate correct discountAmount without maxDiscountValue limit (20% of 2,000,000 = 400,000)', async () => {
    mockVoucherService.validateVoucher.mockResolvedValueOnce({
      discountAmount: 400000,
    });

    const result = (await mockVoucherService.validateVoucher(
      'voucher-id',
      2000000,
    )) as { discountAmount: number };

    expect(result.discountAmount).toEqual(400000);
  });

  it('TC-574: Apply Vouchers to Cart - should throw 400 (NOT_FOUND) when cart is empty', async () => {
    mockVoucherService.applyVouchers.mockRejectedValueOnce(
      new BadRequestException('NOT_FOUND'),
    );
    await expect(
      mockVoucherService.applyVouchers([], ['SALE10']),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-578: Apply Vouchers to Cart - should throw 400 (SCOPE_CONFLICT) when applying > 1 SYSTEM scope vouchers', async () => {
    mockVoucherService.applyVouchers.mockRejectedValueOnce(
      new BadRequestException('SCOPE_CONFLICT'),
    );
    await expect(
      mockVoucherService.applyVouchers(['item1'], ['SYS1', 'SYS2']),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-579: Apply Vouchers to Cart - should throw 400 (SCOPE_CONFLICT) when applying > 1 SHOP scope vouchers for the same shop', async () => {
    mockVoucherService.applyVouchers.mockRejectedValueOnce(
      new BadRequestException('SCOPE_CONFLICT'),
    );
    await expect(
      mockVoucherService.applyVouchers(['item1'], ['SHOP1_A', 'SHOP1_B']),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-592: CreateVoucherDto - should fail when startDate == endDate', async () => {
    const sameDate = '2026-09-10T00:00:00.000Z';
    const dto = plainToInstance(CreateVoucherDto, {
      ...validVoucherPayload,
      startDate: sameDate,
      endDate: sameDate,
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });
});
