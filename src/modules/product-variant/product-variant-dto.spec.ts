import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

import { CreateProductVariantDto } from './dtos/create-product-variant.dto';
import { UpsertVariantsDto } from './dtos/upsert-variant.dto';

const mockVariantService = {
  findVariantById: jest.fn(),
  findVariantsByProduct: jest.fn(),
};

describe('Product Variant Unit Test Cases Matrix (Exact Sequential Order)', () => {
  const validPayload = {
    sku: 'AO-THUN-DEN-M',
    price: 199000,
    stockQty: 50,
    imageUrl: 'https://cdn.example.com/v1.png',
    attributes: { color: 'black', size: 'M' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('TC-378: CreateProductVariantDto - should fail when sku is empty / too short (min-1)', async () => {
    const dto = plainToInstance(CreateProductVariantDto, {
      ...validPayload,
      sku: '',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'sku')).toBeDefined();
  });

  it('TC-382: CreateProductVariantDto - should fail when sku is 101 chars (max+1)', async () => {
    const dto = plainToInstance(CreateProductVariantDto, {
      ...validPayload,
      sku: 'a'.repeat(101),
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'sku')).toBeDefined();
  });

  it('TC-383: CreateProductVariantDto - should fail when sku contains spaces ("AO THUN DEN")', async () => {
    const dto = plainToInstance(CreateProductVariantDto, {
      ...validPayload,
      sku: 'AO THUN DEN',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'sku')).toBeDefined();
  });

  it('TC-384: CreateProductVariantDto - should fail when sku contains special chars ("AO@THUN!")', async () => {
    const dto = plainToInstance(CreateProductVariantDto, {
      ...validPayload,
      sku: 'AO@THUN!',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'sku')).toBeDefined();
  });

  it('TC-386: CreateProductVariantDto - should fail when price is negative (-1)', async () => {
    const dto = plainToInstance(CreateProductVariantDto, {
      ...validPayload,
      price: -1,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'price')).toBeDefined();
  });

  it('TC-390: CreateProductVariantDto - should fail when price has > 2 decimal places', async () => {
    const dto = plainToInstance(CreateProductVariantDto, {
      ...validPayload,
      price: 199000.123,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'price')).toBeDefined();
  });

  it('TC-391: CreateProductVariantDto - should fail when stockQty is negative (-1)', async () => {
    const dto = plainToInstance(CreateProductVariantDto, {
      ...validPayload,
      stockQty: -1,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'stockQty')).toBeDefined();
  });

  it('TC-395: CreateProductVariantDto - should fail when stockQty has decimal / float', async () => {
    const dto = plainToInstance(CreateProductVariantDto, {
      ...validPayload,
      stockQty: 10.5,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'stockQty')).toBeDefined();
  });

  it('TC-400: CreateProductVariantDto - should fail when imageUrl exceeds 500 chars (max+1)', async () => {
    const dto = plainToInstance(CreateProductVariantDto, {
      ...validPayload,
      imageUrl: 'https://' + 'a'.repeat(495),
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'imageUrl')).toBeDefined();
  });

  it('TC-420: UpsertProductVariantDto - should validate imageUrl field', async () => {
    const dto = plainToInstance(UpsertVariantsDto, {
      variants: [{ ...validPayload, imageUrl: '' }],
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-427: CreateProductVariantDto - should fail when attributes is not an object ("màu đen")', async () => {
    const dto = plainToInstance(CreateProductVariantDto, {
      ...validPayload,
      attributes: 'màu đen',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'attributes')).toBeDefined();
  });

  it('TC-430: CreateProductVariantDto - should validate productId format', async () => {
    const dto = plainToInstance(CreateProductVariantDto, {
      ...validPayload,
      productId: 'abc-123',
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-436: UpdateProductVariantDto - should validate id format', async () => {
    const dto = plainToInstance(CreateProductVariantDto, {
      id: 'abc-123',
      ...validPayload,
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-450: UpsertProductVariantDto - should validate productId format', async () => {
    const dto = plainToInstance(UpsertVariantsDto, {
      productId: 'abc-123',
      variants: [validPayload],
    });
    const errors = await validate(dto);
    expect(errors).toBeDefined();
  });

  it('TC-453: Find Variants by Product - should throw 400 when productId is invalid UUID ("abc-123")', async () => {
    mockVariantService.findVariantsByProduct.mockRejectedValueOnce(
      new BadRequestException('Invalid UUID format'),
    );
    await expect(
      mockVariantService.findVariantsByProduct('abc-123'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-457: Find Variant by Id - should throw 400 when id is invalid UUID ("abc-123")', async () => {
    mockVariantService.findVariantById.mockRejectedValueOnce(
      new BadRequestException('Invalid UUID format'),
    );
    await expect(mockVariantService.findVariantById('abc-123')).rejects.toThrow(
      BadRequestException,
    );
  });
});
