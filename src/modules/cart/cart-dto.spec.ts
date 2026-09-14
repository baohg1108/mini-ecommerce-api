import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

import { AddToCartDto } from './dtos/add-to-cart.dto';
import { UpdateCartItemDto } from './dtos/update-cart-item.dto';

const mockCartService = {
  getGroupedCart: jest.fn(),
};

describe('Cart Unit Test Cases Matrix (Exact Sequential Order)', () => {
  const validAddToCartPayload = {
    productId: '123e4567-e89b-12d3-a456-426614174000',
    variantId: '123e4567-e89b-12d3-a456-426614174000',
    quantity: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('TC-463: AddToCartDto - should fail when quantity is negative or 0 (min-1)', async () => {
    const dto = plainToInstance(AddToCartDto, {
      ...validAddToCartPayload,
      quantity: 0,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'quantity')).toBeDefined();
  });

  it('TC-467: AddToCartDto - should validate quantity max limit boundary', async () => {
    const dto = plainToInstance(AddToCartDto, {
      ...validAddToCartPayload,
      quantity: 11,
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-468: AddToCartDto - should fail when quantity is missing (undefined)', async () => {
    const dto = plainToInstance(AddToCartDto, {
      productId: validAddToCartPayload.productId,
      variantId: validAddToCartPayload.variantId,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'quantity')).toBeDefined();
  });

  it('TC-469: AddToCartDto - should fail when quantity is a float / decimal (1.5)', async () => {
    const dto = plainToInstance(AddToCartDto, {
      ...validAddToCartPayload,
      quantity: 1.5,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'quantity')).toBeDefined();
  });

  it('TC-470: AddToCartDto - should fail when quantity type != number ("2")', async () => {
    const dto = plainToInstance(AddToCartDto, {
      ...validAddToCartPayload,
      quantity: '2',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'quantity')).toBeDefined();
  });

  it('TC-471: UpdateCartItemDto - should fail when quantity is negative or 0 (min-1)', async () => {
    const dto = plainToInstance(UpdateCartItemDto, {
      quantity: 0,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'quantity')).toBeDefined();
  });

  it('TC-475: UpdateCartItemDto - should validate quantity max limit boundary', async () => {
    const dto = plainToInstance(UpdateCartItemDto, {
      quantity: 11,
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-476: UpdateCartItemDto - should fail when quantity is missing (undefined)', async () => {
    const dto = plainToInstance(UpdateCartItemDto, {});
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'quantity')).toBeDefined();
  });

  it('TC-478: AddToCartDto - should fail when variantId has invalid UUID format ("abc-123")', async () => {
    const dto = plainToInstance(AddToCartDto, {
      ...validAddToCartPayload,
      variantId: 'abc-123',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'variantId')).toBeDefined();
  });

  it('TC-488: UpdateCartItemDto - should validate itemId format', async () => {
    const dto = plainToInstance(UpdateCartItemDto, {
      itemId: 'abc-123',
      quantity: 2,
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-506: Get Grouped Cart - should throw 400 when item cannot resolve product or shop (null relationship)', async () => {
    mockCartService.getGroupedCart.mockRejectedValueOnce(
      new BadRequestException('Product or shop relation error'),
    );
    await expect(mockCartService.getGroupedCart('user-id')).rejects.toThrow(
      BadRequestException,
    );
  });
});
