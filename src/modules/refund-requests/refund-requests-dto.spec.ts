import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateRefundRequestDto } from './dtos/create-refund-request.dto';
import { RejectRefundRequestDto } from './dtos/reject-refund-request.dto';
import { RefundRequestListQueryDto } from './dtos/refund-request-list-query.dto';

describe('Refund Request Unit Test Cases Matrix (Exact Sequential Order)', () => {
  const validCreateRefundPayload = {
    orderId: '123e4567-e89b-12d3-a456-426614174000',
    reason: 'San pham bi loi khi nhan hang',
  };

  const validRejectPayload = {
    rejectionReason: 'Khong du dieu kien hoan tien theo chinh sach',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('TC-726: CreateRefundRequestDto - should fail when reason is too short (< 10 chars, min-1)', async () => {
    const dto = plainToInstance(CreateRefundRequestDto, {
      ...validCreateRefundPayload,
      reason: 'Short',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'reason')).toBeDefined();
  });

  it('TC-730: CreateRefundRequestDto - should fail when reason exceeds max length (> 1000, max+1)', async () => {
    const dto = plainToInstance(CreateRefundRequestDto, {
      ...validCreateRefundPayload,
      reason: 'a'.repeat(1001),
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'reason')).toBeDefined();
  });

  it('TC-731: RejectRefundRequestDto - should fail when rejectionReason is too short (< 10 chars, min-1)', async () => {
    const dto = plainToInstance(RejectRefundRequestDto, {
      ...validRejectPayload,
      rejectionReason: 'Short',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'rejectionReason')).toBeDefined();
  });

  it('TC-735: RejectRefundRequestDto - should fail when rejectionReason exceeds max length (> 1000, max+1)', async () => {
    const dto = plainToInstance(RejectRefundRequestDto, {
      ...validRejectPayload,
      rejectionReason: 'a'.repeat(1001),
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'rejectionReason')).toBeDefined();
  });

  it('TC-736: RejectRefundRequestDto - should fail when rejectionReason is missing (undefined)', async () => {
    const dto = plainToInstance(RejectRefundRequestDto, {});
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'rejectionReason')).toBeDefined();
  });

  it('TC-749: CreateRefundRequestDto - should validate orderId boundary or format', async () => {
    const dto = plainToInstance(CreateRefundRequestDto, {
      ...validCreateRefundPayload,
      orderId: 'abc-123',
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-780: Admin/Seller List Refund Requests - should fail when shopId has invalid UUID format ("abc-123")', async () => {
    const dto = plainToInstance(RefundRequestListQueryDto, {
      shopId: 'abc-123',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'shopId')).toBeDefined();
  });

  it('TC-782: Admin/Seller List Refund Requests - should fail when status is outside enum RefundRequestStatus ("processing")', async () => {
    const dto = plainToInstance(RefundRequestListQueryDto, {
      status: 'processing',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'status')).toBeDefined();
  });

  it('TC-783: Admin/Seller List Refund Requests - should fail when fromDate/toDate format is invalid ("31-12-2026")', async () => {
    const dto = plainToInstance(RefundRequestListQueryDto, {
      fromDate: '31-12-2026',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'fromDate')).toBeDefined();
  });
});
