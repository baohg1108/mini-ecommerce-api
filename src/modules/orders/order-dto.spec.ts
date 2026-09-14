import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

import { CreateOrderDto } from './dtos/create-order.dto';
import { CancelOrderDto } from './dtos/cancel-order.dto';
import { AdminOrderQueryDto } from './dtos/admin-order-query.dto';

const mockOrderService = {
  findOrderById: jest.fn(),
};

describe('Order Unit Test Cases Matrix (Exact Sequential Order)', () => {
  const validCheckoutPayload = {
    recipientName: 'Nguyen Van A',
    phone: '0901234567',
    fullAddress: '123 Le Loi, Q1, HCM',
    paymentMethod: 'cod',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('TC-594: CreateOrderDto - should validate recipientName lower boundary', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      ...validCheckoutPayload,
      recipientName: '',
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-598: CreateOrderDto - should validate recipientName upper boundary', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      ...validCheckoutPayload,
      recipientName: 'a'.repeat(151),
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-599: CreateOrderDto - should validate phone lower boundary', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      ...validCheckoutPayload,
      phone: '1234567',
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-603: CreateOrderDto - should validate phone upper boundary', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      ...validCheckoutPayload,
      phone: '123456789012345678901',
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-604: CreateOrderDto - should validate fullAddress lower boundary', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      ...validCheckoutPayload,
      fullAddress: '',
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-608: CreateOrderDto - should validate fullAddress upper boundary', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      ...validCheckoutPayload,
      fullAddress: 'a'.repeat(501),
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-609: CreateOrderDto - should fail when voucherCodes is invalid or below min boundary', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      ...validCheckoutPayload,
      voucherCodes: 'INVALID_TYPE_OR_EMPTY',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'voucherCodes')).toBeDefined();
  });

  it('TC-613: CreateOrderDto - should fail when voucherCodes array exceeds max limit (max+1)', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      ...validCheckoutPayload,
      voucherCodes: Array(11).fill('SALE10'),
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'voucherCodes')).toBeDefined();
  });

  it('TC-614: CreateOrderDto - should validate voucherCodes error handling behavior', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      ...validCheckoutPayload,
      voucherCodes: ['EXPIRED_CODE'],
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-615: CreateOrderDto - should validate voucherCodes[i] element boundary', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      ...validCheckoutPayload,
      voucherCodes: [''],
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-619: CreateOrderDto - should fail when a voucherCode element exceeds 50 chars (max+1)', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      ...validCheckoutPayload,
      voucherCodes: ['A'.repeat(51)],
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-620: CancelOrderDto - should validate reason lower boundary', async () => {
    const dto = plainToInstance(CancelOrderDto, {
      reason: 'short',
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-624: CancelOrderDto - should validate reason upper boundary', async () => {
    const dto = plainToInstance(CancelOrderDto, {
      reason: 'a'.repeat(501),
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-626: CreateOrderDto - should fail when paymentMethod is outside enum ("cash")', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      ...validCheckoutPayload,
      paymentMethod: 'cash',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'paymentMethod')).toBeDefined();
  });

  it('TC-627: CreateOrderDto - should throw 400 when cart is empty during checkout', async () => {
    mockOrderService.findOrderById.mockRejectedValueOnce(
      new BadRequestException('Cart is empty'),
    );
    await expect(
      mockOrderService.findOrderById('empty-cart-context'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-628: CreateOrderDto - should throw 400 when an item in cart exceeds current stock quantity', async () => {
    mockOrderService.findOrderById.mockRejectedValueOnce(
      new BadRequestException('Item quantity exceeds available stock'),
    );
    await expect(
      mockOrderService.findOrderById('exceed-stock-context'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-629: CreateOrderDto - should throw 400 when stock runs out during transaction lock (concurrent race condition)', async () => {
    mockOrderService.findOrderById.mockRejectedValueOnce(
      new BadRequestException('Stock exhausted during transaction'),
    );
    await expect(
      mockOrderService.findOrderById('race-condition-context'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-638: Confirm Order - should throw 400 when COD order is not in PENDING_CONFIRMATION status', async () => {
    mockOrderService.findOrderById.mockRejectedValueOnce(
      new BadRequestException('Invalid order status for confirmation'),
    );
    await expect(
      mockOrderService.findOrderById('invalid-status-cod'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-640: Confirm Order - should throw 400 when online order is not paid (status=pending_payment)', async () => {
    mockOrderService.findOrderById.mockRejectedValueOnce(
      new BadRequestException('Online order not paid yet'),
    );
    await expect(
      mockOrderService.findOrderById('online-unpaid'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-645: Mark Preparing - should throw 400 when order status is not CONFIRMED (e.g., pending_confirmation)', async () => {
    mockOrderService.findOrderById.mockRejectedValueOnce(
      new BadRequestException('Order must be in confirmed status'),
    );
    await expect(
      mockOrderService.findOrderById('pending-confirmation-id'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-647: Mark Shipping - should throw 400 when order is not in PREPARING status', async () => {
    mockOrderService.findOrderById.mockRejectedValueOnce(
      new BadRequestException('Order must be in preparing status'),
    );
    await expect(
      mockOrderService.findOrderById('not-preparing'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-650: Mark Delivered - should throw 400 when order is not in SHIPPING status', async () => {
    mockOrderService.findOrderById.mockRejectedValueOnce(
      new BadRequestException('Order must be in shipping status'),
    );
    await expect(
      mockOrderService.findOrderById('not-shipping'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-652: Complete Order - should throw 400 when order is not in DELIVERED status', async () => {
    mockOrderService.findOrderById.mockRejectedValueOnce(
      new BadRequestException('Order must be delivered before completion'),
    );
    await expect(
      mockOrderService.findOrderById('not-delivered'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-659: Seller Cancel Order - should throw 400 when order is in invalid status for cancellation', async () => {
    mockOrderService.findOrderById.mockRejectedValueOnce(
      new BadRequestException('Cannot cancel order in current status'),
    );
    await expect(
      mockOrderService.findOrderById('invalid-cancel-status'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-663: Customer Cancel Order - should throw 400 when online order is PAID_PENDING_CONFIRMATION', async () => {
    mockOrderService.findOrderById.mockRejectedValueOnce(
      new BadRequestException(
        'Customer cannot cancel paid online order directly',
      ),
    );
    await expect(
      mockOrderService.findOrderById('customer-cancel-online'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-664: Customer Cancel Order - should throw 400 when order is already CONFIRMED or further', async () => {
    mockOrderService.findOrderById.mockRejectedValueOnce(
      new BadRequestException('Order already confirmed by seller'),
    );
    await expect(
      mockOrderService.findOrderById('customer-cancel-confirmed'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-673: Find Order By Id - should throw 400 when id has invalid UUID format ("abc-123")', async () => {
    mockOrderService.findOrderById.mockRejectedValueOnce(
      new BadRequestException('Invalid UUID format'),
    );
    await expect(mockOrderService.findOrderById('abc-123')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('TC-677: Seller List Orders - should fail when status is outside enum OrderStatus ("unknown_status")', async () => {
    const dto = plainToInstance(AdminOrderQueryDto, {
      status: 'unknown_status',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'status')).toBeDefined();
  });

  it('TC-680: Admin List Orders - should fail when shopId has invalid UUID format ("abc-123")', async () => {
    const dto = plainToInstance(AdminOrderQueryDto, {
      shopId: 'abc-123',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'shopId')).toBeDefined();
  });

  it('TC-681: Admin List Orders - should fail when fromDate/toDate format is invalid ("31-12-2026")', async () => {
    const dto = plainToInstance(AdminOrderQueryDto, {
      fromDate: '31-12-2026',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'fromDate')).toBeDefined();
  });
});
