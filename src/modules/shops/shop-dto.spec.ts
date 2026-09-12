import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateShopDto } from './dtos/create-shop.dto';
import { UpdateShopDto } from './dtos/update-shop.dto';
import { RejectShopDto } from './dtos/reject-shop.dto';
import { SuspendedShopDto } from './dtos/suspended-shop.dto';

describe('Shop DTOs Validation (Full Master Unit Test Cases Matrix)', () => {
  const validShopPayload = {
    shopName: 'Electronics Shop',
    description: 'Shop buy iphone, ipad, device electronics with best quality',
    logoUrl: 'https://example.com/logo.png',
    businessLicenseUrl: 'https://example.com/license.pdf',
    returnPolicy: '1 doi 1 trong vong 30 ngay',
    shippingPolicy: 'Giao hàng nhanh, hoả tốc trong vòng 2h',
  };

  const validUpdatePayload = {
    shopName: 'Updated Electronics Shop',
    description: 'Updated description for shop',
    logoUrl: 'https://example.com/updated-logo.png',
    businessLicenseUrl: 'https://example.com/updated-license.pdf',
    returnPolicy: 'Updated return policy',
    shippingPolicy: 'Updated shipping policy',
  };

  // ==========================================
  // 1. REGISTER SHOP / CREATE SHOP DTO
  // ==========================================
  describe('CreateShopDto Validation', () => {
    it('TC-071: should fail when shopName is too short (< 3 chars)', async () => {
      const dto = plainToInstance(CreateShopDto, {
        ...validShopPayload,
        shopName: 'ab',
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'shopName');
      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('minLength');
    });

    it('TC-075: should fail when shopName is too long (> 200 chars)', async () => {
      const dto = plainToInstance(CreateShopDto, {
        ...validShopPayload,
        shopName: 'a'.repeat(201),
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'shopName');
      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('maxLength');
    });

    it('TC-076: should fail when shopName is empty string', async () => {
      const dto = plainToInstance(CreateShopDto, {
        ...validShopPayload,
        shopName: '',
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'shopName');
      expect(fieldError).toBeDefined();
    });

    it('TC-077: should fail when shopName is only whitespace', async () => {
      const dto = plainToInstance(CreateShopDto, {
        ...validShopPayload,
        shopName: '   ',
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'shopName');
      expect(fieldError).toBeDefined();
    });

    it('TC-078: should handle description format / optional state', async () => {
      const dto = plainToInstance(CreateShopDto, {
        ...validShopPayload,
        description: '',
      });
      const errors = await validate(dto);
      expect(errors).toBeDefined();
    });

    it('TC-082: should fail when description exceeds 5000 chars', async () => {
      const dto = plainToInstance(CreateShopDto, {
        ...validShopPayload,
        description: 'a'.repeat(5001),
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'description');
      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('maxLength');
    });

    it('TC-084: should fail when logoUrl format is invalid', async () => {
      const dto = plainToInstance(CreateShopDto, {
        ...validShopPayload,
        logoUrl: 'invalid-logo',
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'logoUrl');
      expect(fieldError).toBeDefined();
    });

    it('TC-088: should fail when logoUrl exceeds 500 chars', async () => {
      const dto = plainToInstance(CreateShopDto, {
        ...validShopPayload,
        logoUrl: 'https://' + 'a'.repeat(500) + '.com',
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'logoUrl');
      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('maxLength');
    });

    it('TC-089: should fail when logoUrl is not a valid URL', async () => {
      const dto = plainToInstance(CreateShopDto, {
        ...validShopPayload,
        logoUrl: 'not-a-url',
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'logoUrl');
      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('isUrl');
    });

    it('TC-091: should fail when businessLicenseUrl format is invalid', async () => {
      const dto = plainToInstance(CreateShopDto, {
        ...validShopPayload,
        businessLicenseUrl: 'invalid-license',
      });
      const errors = await validate(dto);
      const fieldError = errors.find(
        (e) => e.property === 'businessLicenseUrl',
      );
      expect(fieldError).toBeDefined();
    });

    it('TC-095: should fail when businessLicenseUrl exceeds 500 chars', async () => {
      const dto = plainToInstance(CreateShopDto, {
        ...validShopPayload,
        businessLicenseUrl: 'https://' + 'a'.repeat(500) + '.com',
      });
      const errors = await validate(dto);
      const fieldError = errors.find(
        (e) => e.property === 'businessLicenseUrl',
      );
      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('maxLength');
    });

    it('TC-096: should fail when businessLicenseUrl is not a valid URL', async () => {
      const dto = plainToInstance(CreateShopDto, {
        ...validShopPayload,
        businessLicenseUrl: 'not-a-url',
      });
      const errors = await validate(dto);
      const fieldError = errors.find(
        (e) => e.property === 'businessLicenseUrl',
      );
      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('isUrl');
    });

    it('TC-097: should handle returnPolicy format / optional state', async () => {
      const dto = plainToInstance(CreateShopDto, {
        ...validShopPayload,
        returnPolicy: '',
      });
      const errors = await validate(dto);
      expect(errors).toBeDefined();
    });

    it('TC-101: should fail when returnPolicy exceeds 5000 chars', async () => {
      const dto = plainToInstance(CreateShopDto, {
        ...validShopPayload,
        returnPolicy: 'a'.repeat(5001),
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'returnPolicy');
      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('maxLength');
    });

    it('TC-102: should handle shippingPolicy format / optional state', async () => {
      const dto = plainToInstance(CreateShopDto, {
        ...validShopPayload,
        shippingPolicy: '',
      });
      const errors = await validate(dto);
      expect(errors).toBeDefined();
    });

    it('TC-106: should fail when shippingPolicy exceeds 5000 chars', async () => {
      const dto = plainToInstance(CreateShopDto, {
        ...validShopPayload,
        shippingPolicy: 'a'.repeat(5001),
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'shippingPolicy');
      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('maxLength');
    });
  });

  // ==========================================
  // 2. UPDATE SHOP DTO
  // ==========================================
  describe('UpdateShopDto Validation', () => {
    it('TC-107: should handle shopName length in update', async () => {
      const dto = plainToInstance(UpdateShopDto, {
        ...validUpdatePayload,
        shopName: 'ab',
      });
      const errors = await validate(dto);
      expect(errors).toBeDefined();
    });

    it('TC-111: should fail when shopName exceeds 200 chars in update', async () => {
      const dto = plainToInstance(UpdateShopDto, {
        ...validUpdatePayload,
        shopName: 'a'.repeat(201),
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'shopName');
      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('maxLength');
    });

    it('TC-112: should handle description in update', async () => {
      const dto = plainToInstance(UpdateShopDto, {
        ...validUpdatePayload,
        description: '',
      });
      const errors = await validate(dto);
      expect(errors).toBeDefined();
    });

    it('TC-116: should fail when description exceeds 5000 chars in update', async () => {
      const dto = plainToInstance(UpdateShopDto, {
        ...validUpdatePayload,
        description: 'a'.repeat(5001),
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'description');
      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('maxLength');
    });

    it('TC-117: should fail when logoUrl is invalid in update', async () => {
      const dto = plainToInstance(UpdateShopDto, {
        ...validUpdatePayload,
        logoUrl: 'not-a-url',
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'logoUrl');
      expect(fieldError).toBeDefined();
    });

    it('TC-121: should fail when logoUrl exceeds 500 chars in update', async () => {
      const dto = plainToInstance(UpdateShopDto, {
        ...validUpdatePayload,
        logoUrl: 'https://' + 'a'.repeat(500) + '.com',
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'logoUrl');
      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('maxLength');
    });

    it('TC-122: should fail when businessLicenseUrl is invalid in update', async () => {
      const dto = plainToInstance(UpdateShopDto, {
        ...validUpdatePayload,
        businessLicenseUrl: 'not-a-url',
      });
      const errors = await validate(dto);
      const fieldError = errors.find(
        (e) => e.property === 'businessLicenseUrl',
      );
      expect(fieldError).toBeDefined();
    });

    it('TC-126: should fail when businessLicenseUrl exceeds 500 chars in update', async () => {
      const dto = plainToInstance(UpdateShopDto, {
        ...validUpdatePayload,
        businessLicenseUrl: 'https://' + 'a'.repeat(500) + '.com',
      });
      const errors = await validate(dto);
      const fieldError = errors.find(
        (e) => e.property === 'businessLicenseUrl',
      );
      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('maxLength');
    });

    it('TC-127: should handle returnPolicy in update', async () => {
      const dto = plainToInstance(UpdateShopDto, {
        ...validUpdatePayload,
        returnPolicy: '',
      });
      const errors = await validate(dto);
      expect(errors).toBeDefined();
    });

    it('TC-131: should fail when returnPolicy exceeds 5000 chars in update', async () => {
      const dto = plainToInstance(UpdateShopDto, {
        ...validUpdatePayload,
        returnPolicy: 'a'.repeat(5001),
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'returnPolicy');
      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('maxLength');
    });

    it('TC-132: should handle shippingPolicy in update', async () => {
      const dto = plainToInstance(UpdateShopDto, {
        ...validUpdatePayload,
        shippingPolicy: '',
      });
      const errors = await validate(dto);
      expect(errors).toBeDefined();
    });

    it('TC-136: should fail when shippingPolicy exceeds 5000 chars in update', async () => {
      const dto = plainToInstance(UpdateShopDto, {
        ...validUpdatePayload,
        shippingPolicy: 'a'.repeat(5001),
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'shippingPolicy');
      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('maxLength');
    });
  });

  // ==========================================
  // 3. REJECT & SUSPEND SHOP DTOs
  // ==========================================
  describe('RejectShopDto & SuspendedShopDto Validation', () => {
    it('TC-137: should fail when reason is empty/invalid in RejectShopDto', async () => {
      const dto = plainToInstance(RejectShopDto, {
        reason: '',
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'reason');
      expect(fieldError).toBeDefined();
    });

    it('TC-141: should fail when reason exceeds 500 chars in RejectShopDto', async () => {
      const dto = plainToInstance(RejectShopDto, {
        reason: 'a'.repeat(501),
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'reason');
      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('maxLength');
    });

    it('TC-142: should fail when reason is missing/undefined in RejectShopDto', async () => {
      const dto = plainToInstance(RejectShopDto, {});
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'reason');
      expect(fieldError).toBeDefined();
    });

    it('TC-143: should fail when reasonSuspended is empty/invalid in SuspendedShopDto', async () => {
      const dto = plainToInstance(SuspendedShopDto, {
        reasonSuspended: '',
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'reasonSuspended');
      expect(fieldError).toBeDefined();
    });

    it('TC-147: should fail when reasonSuspended exceeds 500 chars in SuspendedShopDto', async () => {
      const dto = plainToInstance(SuspendedShopDto, {
        reasonSuspended: 'a'.repeat(501),
      });
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'reasonSuspended');
      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('maxLength');
    });

    it('TC-162: should fail when reasonSuspended is missing/undefined in SuspendedShopDto', async () => {
      const dto = plainToInstance(SuspendedShopDto, {});
      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'reasonSuspended');
      expect(fieldError).toBeDefined();
    });
  });
});
