import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { MoveCategoryDto } from './dtos/move-category.dto';
import { CategoryStatus } from '../../common/enums/category-status.enum';

describe('Category DTOs Validation (Full 33 Unit Tests Matrix)', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

  const validCreatePayload = {
    name: 'Electronics',
    slug: 'electronics',
    parentId: validUUID,
    iconUrl: 'https://example.com/icon.png',
    displayOrder: 1,
    status: CategoryStatus.ACTIVE,
  };

  // ==========================================
  // 1. CREATE CATEGORY DTO (TC-177 đến TC-239)
  // ==========================================
  describe('CreateCategoryDto Validation', () => {
    it('TC-177: should pass with valid data payload', async () => {
      const dto = plainToInstance(CreateCategoryDto, validCreatePayload);
      const errors = await validate(dto);
      expect(errors.length).toEqual(0);
    });

    it('TC-181: should fail when name is not a string (number passed)', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        name: 123,
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'name');
      expect(err).toBeDefined();
      expect(err?.constraints).toHaveProperty('isString');
    });

    it('TC-182: should fail when name is empty/null', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        name: null,
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'name');
      expect(err).toBeDefined();
    });

    it('TC-183: should fail when name exceeds 150 chars', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        name: 'a'.repeat(151),
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'name');
      expect(err).toBeDefined();
      expect(err?.constraints).toHaveProperty('maxLength');
    });

    it('TC-184: should pass when name is exactly 150 chars', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        name: 'a'.repeat(150),
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'name');
      expect(err).toBeUndefined();
    });

    it('TC-185: should fail when slug contains uppercase letters', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        slug: 'Electronics',
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'slug');
      expect(err).toBeDefined();
      expect(err?.constraints).toHaveProperty('matches');
    });

    it('TC-189: should fail when slug contains spaces', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        slug: 'elec tronics',
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'slug');
      expect(err).toBeDefined();
    });

    it('TC-190: should fail when slug contains special characters', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        slug: 'electronics@123',
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'slug');
      expect(err).toBeDefined();
    });

    it('TC-191: should fail when slug is not a string', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        slug: 12345,
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'slug');
      expect(err).toBeDefined();
    });

    it('TC-192: should fail when slug exceeds 160 chars', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        slug: 'a'.repeat(161),
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'slug');
      expect(err).toBeDefined();
    });

    it('TC-193: should fail when slug has invalid trailing/leading hyphens', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        slug: '-electronics-',
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'slug');
      expect(err).toBeDefined();
    });

    it('TC-194: should pass when slug uses valid kebab-case', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        slug: 'electronics-phones-123',
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'slug');
      expect(err).toBeUndefined();
    });

    it('TC-196: should fail when iconUrl is invalid URL', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        iconUrl: 'not-a-url',
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'iconUrl');
      expect(err).toBeDefined();
      expect(err?.constraints).toHaveProperty('isUrl');
    });

    it('TC-200: should fail when iconUrl exceeds 500 chars', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        iconUrl: 'https://example.com/' + 'a'.repeat(500),
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'iconUrl');
      expect(err).toBeDefined();
    });

    it('TC-201: should pass when iconUrl is optional / undefined', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        iconUrl: undefined,
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'iconUrl');
      expect(err).toBeUndefined();
    });

    it('TC-203: should fail when displayOrder is negative', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        displayOrder: -1,
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'displayOrder');
      expect(err).toBeDefined();
      expect(err?.constraints).toHaveProperty('min');
    });

    it('TC-207: should fail when displayOrder is a float (non-integer)', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        displayOrder: 1.5,
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'displayOrder');
      expect(err).toBeDefined();
      expect(err?.constraints).toHaveProperty('isInt');
    });

    it('TC-208: should fail when displayOrder is a string', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        displayOrder: '10',
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'displayOrder');
      expect(err).toBeDefined();
    });

    it('TC-209: should pass when displayOrder is 0 (boundary)', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        displayOrder: 0,
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'displayOrder');
      expect(err).toBeUndefined();
    });

    it('TC-210: should pass when displayOrder is optional / undefined', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        displayOrder: undefined,
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'displayOrder');
      expect(err).toBeUndefined();
    });

    it('TC-236: should fail when parentId is invalid UUID format', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        parentId: 'invalid-uuid',
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'parentId');
      expect(err).toBeDefined();
      expect(err?.constraints).toHaveProperty('isUuid');
    });

    it('TC-239: should fail when status is invalid enum value', async () => {
      const dto = plainToInstance(CreateCategoryDto, {
        ...validCreatePayload,
        status: 'UNKNOWN_STATUS',
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'status');
      expect(err).toBeDefined();
      expect(err?.constraints).toHaveProperty('isEnum');
    });
  });

  // ==========================================
  // 2. UPDATE CATEGORY DTO (TC-212 đến TC-233)
  // ==========================================
  describe('UpdateCategoryDto Validation', () => {
    it('should pass with empty object (partial update)', async () => {
      const dto = plainToInstance(UpdateCategoryDto, {});
      const errors = await validate(dto);
      expect(errors.length).toEqual(0);
    });

    it('TC-212: should fail when update name exceeds 150 chars', async () => {
      const dto = plainToInstance(UpdateCategoryDto, { name: 'a'.repeat(151) });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'name');
      expect(err).toBeDefined();
    });

    it('TC-216: should pass with valid partial name update', async () => {
      const dto = plainToInstance(UpdateCategoryDto, { name: 'New Name' });
      const errors = await validate(dto);
      expect(errors.find((e) => e.property === 'name')).toBeUndefined();
    });

    it('TC-218: should fail when update slug format is invalid', async () => {
      const dto = plainToInstance(UpdateCategoryDto, { slug: 'Invalid Slug' });
      const errors = await validate(dto);
      expect(errors.find((e) => e.property === 'slug')).toBeDefined();
    });

    it('TC-222: should pass with valid slug update', async () => {
      const dto = plainToInstance(UpdateCategoryDto, {
        slug: 'new-valid-slug',
      });
      const errors = await validate(dto);
      expect(errors.find((e) => e.property === 'slug')).toBeUndefined();
    });

    it('TC-224: should fail when update iconUrl is invalid', async () => {
      const dto = plainToInstance(UpdateCategoryDto, {
        iconUrl: 'invalid-url',
      });
      const errors = await validate(dto);
      expect(errors.find((e) => e.property === 'iconUrl')).toBeDefined();
    });

    it('TC-228: should pass with valid iconUrl update', async () => {
      const dto = plainToInstance(UpdateCategoryDto, {
        iconUrl: 'https://example.com/new.png',
      });
      const errors = await validate(dto);
      expect(errors.find((e) => e.property === 'iconUrl')).toBeUndefined();
    });

    it('TC-229: should fail when update displayOrder is negative', async () => {
      const dto = plainToInstance(UpdateCategoryDto, { displayOrder: -5 });
      const errors = await validate(dto);
      expect(errors.find((e) => e.property === 'displayOrder')).toBeDefined();
    });

    it('TC-233: should pass with valid displayOrder update', async () => {
      const dto = plainToInstance(UpdateCategoryDto, { displayOrder: 10 });
      const errors = await validate(dto);
      expect(errors.find((e) => e.property === 'displayOrder')).toBeUndefined();
    });
  });

  // ==========================================
  // 3. MOVE CATEGORY DTO (TC-241 & TC-242)
  // ==========================================
  describe('MoveCategoryDto Validation', () => {
    it('TC-241: should fail when newParentId is not a valid UUID', async () => {
      const dto = plainToInstance(MoveCategoryDto, { newParentId: 'abc-123' });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'newParentId');
      expect(err).toBeDefined();
      expect(err?.constraints).toHaveProperty('isUuid');
    });

    it('TC-242: should pass when newParentId is a valid UUID', async () => {
      const dto = plainToInstance(MoveCategoryDto, { newParentId: validUUID });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'newParentId');
      expect(err).toBeUndefined();
    });
  });
});
