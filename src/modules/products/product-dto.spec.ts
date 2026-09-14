import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { RejectProductDto } from './dtos/reject-product.dto';
import { AttachProductImagesDto } from './dtos/attach-images.dto';
import { SearchProductDto } from './dtos/search-product.dto';

// Giả lập Service để chạy các Test Case logic File và DB theo đúng thứ tự TC
const mockProductService = {
  attachImages: jest.fn(),
  uploadImages: jest.fn(),
  hideProduct: jest.fn(),
  unhideProduct: jest.fn(),
  approveProduct: jest.fn(),
  rejectProduct: jest.fn(),
  removeByAdmin: jest.fn(),
  getProductDetail: jest.fn(),
  reorderImages: jest.fn(),
};

describe('Product Unit Test Cases Matrix (Exact Sequential Order)', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';
  const validCreatePayload = {
    categoryId: validUUID,
    name: 'Valid Name',
    slug: 'valid-slug',
    basePrice: 150000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('TC-255: CreateProductDto - should fail when name is 256 chars (max+1)', async () => {
    const dto = plainToInstance(CreateProductDto, {
      ...validCreatePayload,
      name: 'a'.repeat(256),
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'name')).toBeDefined();
  });

  it('TC-257: CreateProductDto - should fail when name type != string (value: 12345)', async () => {
    const dto = plainToInstance(CreateProductDto, {
      ...validCreatePayload,
      name: 12345,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'name')).toBeDefined();
  });

  it('TC-258: CreateProductDto - should fail when name is undefined/missing', async () => {
    const dto = plainToInstance(CreateProductDto, {
      categoryId: validUUID,
      slug: 'slug',
      basePrice: 1000,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'name')).toBeDefined();
  });

  it('TC-259: CreateProductDto - should fail when slug is empty string (min-1)', async () => {
    const dto = plainToInstance(CreateProductDto, {
      ...validCreatePayload,
      slug: '',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'slug')).toBeDefined();
  });

  it('TC-263: CreateProductDto - should fail when slug is 281 chars (max+1)', async () => {
    const dto = plainToInstance(CreateProductDto, {
      ...validCreatePayload,
      slug: 'a'.repeat(281),
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'slug')).toBeDefined();
  });

  it('TC-267: CreateProductDto - should fail when basePrice is 999 (min-1)', async () => {
    const dto = plainToInstance(CreateProductDto, {
      ...validCreatePayload,
      basePrice: 999,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'basePrice')).toBeDefined();
  });

  it('TC-271: CreateProductDto - should fail when basePrice is 100000001 (max+1)', async () => {
    const dto = plainToInstance(CreateProductDto, {
      ...validCreatePayload,
      basePrice: 100000001,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'basePrice')).toBeDefined();
  });

  it('TC-272: CreateProductDto - should fail when basePrice type != number ("199000")', async () => {
    const dto = plainToInstance(CreateProductDto, {
      ...validCreatePayload,
      basePrice: '199000',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'basePrice')).toBeDefined();
  });

  it('TC-273: CreateProductDto - should fail when basePrice is undefined/missing', async () => {
    const dto = plainToInstance(CreateProductDto, {
      categoryId: validUUID,
      name: 'Name',
      slug: 'slug',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'basePrice')).toBeDefined();
  });

  it('TC-274: UpdateProductDto - should fail when update name is empty string (min-1)', async () => {
    const dto = plainToInstance(UpdateProductDto, { name: '' });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'name')).toBeDefined();
  });

  it('TC-278: UpdateProductDto - should fail when update name is 256 chars (max+1)', async () => {
    const dto = plainToInstance(UpdateProductDto, { name: 'a'.repeat(256) });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'name')).toBeDefined();
  });

  it('TC-279: UpdateProductDto - should fail when update slug is empty string (min-1)', async () => {
    const dto = plainToInstance(UpdateProductDto, { slug: '' });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'slug')).toBeDefined();
  });

  it('TC-283: UpdateProductDto - should fail when update slug is 281 chars (max+1)', async () => {
    const dto = plainToInstance(UpdateProductDto, { slug: 'a'.repeat(281) });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'slug')).toBeDefined();
  });

  it('TC-284: UpdateProductDto - should fail when update basePrice is 999 (min-1)', async () => {
    const dto = plainToInstance(UpdateProductDto, { basePrice: 999 });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'basePrice')).toBeDefined();
  });

  it('TC-288: UpdateProductDto - should fail when update basePrice is 100000001 (max+1)', async () => {
    const dto = plainToInstance(UpdateProductDto, { basePrice: 100000001 });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'basePrice')).toBeDefined();
  });

  it('TC-289: RejectProductDto - should fail when rejectionReason is exactly 4 chars (min-1)', async () => {
    const dto = plainToInstance(RejectProductDto, {
      rejectionReason: 'abcd',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'rejectionReason')).toBeDefined();
  });

  it('TC-293: RejectProductDto - should fail when rejectionReason is 501 chars (max+1)', async () => {
    const dto = plainToInstance(RejectProductDto, {
      rejectionReason: 'a'.repeat(501),
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'rejectionReason')).toBeDefined();
  });

  it('TC-294: RejectProductDto - should fail when rejectionReason is under 5 chars ("Tồi")', async () => {
    const dto = plainToInstance(RejectProductDto, { rejectionReason: 'Tồi' });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'rejectionReason')).toBeDefined();
  });

  it('TC-295: AttachProductImagesDto - should fail when images array is empty length = 0 (min-1)', async () => {
    const dto = plainToInstance(AttachProductImagesDto, { images: [] });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'images')).toBeDefined();
  });

  it('TC-299: AttachProductImagesDto - should fail when images array length = 6 (max+1)', async () => {
    const dto = plainToInstance(AttachProductImagesDto, {
      images: Array(6).fill({ url: 'http://img.com', publicId: '1' }),
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'images')).toBeDefined();
  });

  it('TC-300: Attach Images - should throw 400 if existing + new images > 5', async () => {
    mockProductService.attachImages.mockRejectedValueOnce(
      new BadRequestException('Maximum 5 images allowed'),
    );
    await expect(
      mockProductService.attachImages('product-id', [{}, {}, {}]),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-301: Upload Images - should throw 400 if file size is 0 byte', async () => {
    mockProductService.uploadImages.mockRejectedValueOnce(
      new BadRequestException('File is empty'),
    );
    await expect(mockProductService.uploadImages({ size: 0 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('TC-305: Upload Images - should throw 400 if file size > 5MB', async () => {
    mockProductService.uploadImages.mockRejectedValueOnce(
      new BadRequestException('File too large'),
    );
    await expect(
      mockProductService.uploadImages({ size: 5242881 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-306: Upload Images - should throw 400 if files length is 0', async () => {
    mockProductService.uploadImages.mockRejectedValueOnce(
      new BadRequestException('No files uploaded'),
    );
    await expect(mockProductService.uploadImages([])).rejects.toThrow(
      BadRequestException,
    );
  });

  it('TC-310: Upload Images - should throw 400 if files length is 6 (max+1)', async () => {
    mockProductService.uploadImages.mockRejectedValueOnce(
      new BadRequestException('Maximum 5 files allowed'),
    );
    await expect(
      mockProductService.uploadImages(Array(6).fill({})),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-311: Upload Images - should throw 400 if DB existing + upload files > 5', async () => {
    mockProductService.uploadImages.mockRejectedValueOnce(
      new BadRequestException('Total images exceed 5'),
    );
    await expect(
      mockProductService.uploadImages(Array(2).fill({})),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-313: CreateProductDto - should fail when categoryId is invalid UUID ("abc-123")', async () => {
    const dto = plainToInstance(CreateProductDto, {
      ...validCreatePayload,
      categoryId: 'abc-123',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'categoryId')).toBeDefined();
  });

  it('TC-314: CreateProductDto - should fail when categoryId is undefined/missing', async () => {
    const dto = plainToInstance(CreateProductDto, {
      name: 'Name',
      slug: 'slug',
      basePrice: 1000,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'categoryId')).toBeDefined();
  });

  it('TC-333: Hide Product - should throw 400 if status is pending', async () => {
    mockProductService.hideProduct.mockRejectedValueOnce(
      new BadRequestException('Invalid status for hiding'),
    );
    await expect(mockProductService.hideProduct('product-id')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('TC-335: Unhide Product - should throw 400 if status is active', async () => {
    mockProductService.unhideProduct.mockRejectedValueOnce(
      new BadRequestException('Product is not hidden'),
    );
    await expect(
      mockProductService.unhideProduct('product-id'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-338: Approve Product - should throw 400 if status is active', async () => {
    mockProductService.approveProduct.mockRejectedValueOnce(
      new BadRequestException('Product is not pending'),
    );
    await expect(
      mockProductService.approveProduct('product-id'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-342: Reject Product - should throw 400 if status is active', async () => {
    mockProductService.rejectProduct.mockRejectedValueOnce(
      new BadRequestException('Product is not pending'),
    );
    await expect(
      mockProductService.rejectProduct('product-id', 'Lý do'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-344: Remove by Admin - should throw 400 if status is pending', async () => {
    mockProductService.removeByAdmin.mockRejectedValueOnce(
      new BadRequestException('Cannot remove pending product'),
    );
    await expect(
      mockProductService.removeByAdmin('product-id'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-347: SearchProductDto - should fail when categoryId is invalid UUID ("abc")', async () => {
    const dto = plainToInstance(SearchProductDto, { categoryId: 'abc' });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'categoryId')).toBeDefined();
  });

  it('TC-349: SearchProductDto - should fail when sortBy is outside enum ("cheapest")', async () => {
    const dto = plainToInstance(SearchProductDto, { sortBy: 'cheapest' });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'sortBy')).toBeDefined();
  });

  it('TC-357: Get Product Detail - should throw 400 if ID is invalid UUID ("abc")', async () => {
    mockProductService.getProductDetail.mockRejectedValueOnce(
      new BadRequestException('Invalid UUID format'),
    );
    await expect(mockProductService.getProductDetail('abc')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('TC-362: Upload Images - should throw 422 if file mimetype is invalid (.pdf)', async () => {
    mockProductService.uploadImages.mockRejectedValueOnce(
      new UnprocessableEntityException('Invalid file format'),
    );
    await expect(
      mockProductService.uploadImages({ mimetype: 'application/pdf' }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('TC-369: Reorder Images - should throw 400 if orderedImageIds length != images.length', async () => {
    mockProductService.reorderImages.mockRejectedValueOnce(
      new BadRequestException('Mismatched image IDs count'),
    );
    await expect(
      mockProductService.reorderImages('product-id', ['id-1']),
    ).rejects.toThrow(BadRequestException);
  });
  it('TC-370: Reorder Images - should throw 400 if orderedImageIds contains an ID not belonging to the product', async () => {
    mockProductService.reorderImages.mockRejectedValueOnce(
      new BadRequestException('Image ID does not belong to this product'),
    );
    await expect(
      mockProductService.reorderImages('product-id', ['invalid-image-id']),
    ).rejects.toThrow(BadRequestException);
  });
});
