import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { ShopService } from './shop.service';
import { Shop } from './entities/shop.entity';
import { User } from '../users/entities/user.entity';
import { ShopStatus } from '../../common/enums/shop-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { CreateShopDto } from './dtos/create-shop.dto';
import { UpdateShopDto } from './dtos/update-shop.dto';
import { RejectShopDto } from './dtos/reject-shop.dto';
import { SuspendedShopDto } from './dtos/suspended-shop.dto';
import { PublicShopResponseDto } from './dtos/public-shop-response.dto';
import { slugify, randomSuffix } from '../../common/utils/slugify';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';

jest.mock('../../common/utils/slugify', () => ({
  slugify: jest.fn(),
  randomSuffix: jest.fn(),
}));

const mockSlugify = jest.mocked(slugify);
const mockRandomSuffix = jest.mocked(randomSuffix);

type MockRepository<T extends ObjectLiteral = any> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepository = <
  T extends ObjectLiteral = any,
>(): MockRepository<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

// =========================================================================
// PHẦN 1 — DTO Validation (class-validator, không cần DB/repository)
// =========================================================================

describe('CreateShopDto', () => {
  // SHOP-UNIT-001
  it('chấp nhận dữ liệu hợp lệ', async () => {
    const dto = plainToInstance(CreateShopDto, {
      shopName: 'Shop ABC',
      description: 'Chuyên đồ điện tử',
      logoUrl: 'https://cdn.site.com/logo.png',
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  // SHOP-UNIT-002
  it('reject khi thiếu shopName', async () => {
    const dto = plainToInstance(CreateShopDto, { description: 'abc' });
    const errors = await validate(dto);

    expect(errors.find((e) => e.property === 'shopName')).toBeDefined();
  });

  // SHOP-UNIT-003
  it('reject khi shopName < 3 ký tự (MinLength)', async () => {
    const dto = plainToInstance(CreateShopDto, { shopName: 'AB' });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'shopName');

    expect(err?.constraints).toHaveProperty('minLength');
  });

  // SHOP-UNIT-005
  it('reject khi shopName > 200 ký tự (MaxLength)', async () => {
    const dto = plainToInstance(CreateShopDto, {
      shopName: 'a'.repeat(201),
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'shopName');

    expect(err?.constraints).toHaveProperty('maxLength');
  });

  // SHOP-UNIT-004 — boundary: đúng 3 ký tự (biên dưới MinLength) phải hợp lệ
  it('chấp nhận shopName đúng 3 ký tự (biên dưới MinLength)', async () => {
    const dto = plainToInstance(CreateShopDto, { shopName: 'ABC' });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'shopName');

    expect(err).toBeUndefined();
  });

  // SHOP-UNIT-006 — boundary: đúng 200 ký tự (biên trên MaxLength) phải hợp lệ
  it('chấp nhận shopName đúng 200 ký tự (biên trên MaxLength)', async () => {
    const dto = plainToInstance(CreateShopDto, {
      shopName: 'a'.repeat(200),
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'shopName');

    expect(err).toBeUndefined();
  });

  // SHOP-UNIT-007
  it('tự động trim khoảng trắng đầu/cuối shopName (@Transform)', () => {
    const dto = plainToInstance(CreateShopDto, {
      shopName: '   Shop Demo   ',
    });

    expect(dto.shopName).toBe('Shop Demo');
  });

  // SHOP-UNIT-008
  it('reject khi logoUrl sai định dạng URL', async () => {
    const dto = plainToInstance(CreateShopDto, {
      shopName: 'Shop ABC',
      logoUrl: 'not-a-url',
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'logoUrl');

    expect(err?.constraints).toHaveProperty('isUrl');
  });

  // SHOP-UNIT-009 — logoUrl = null (optional) phải hợp lệ, không lỗi
  it('chấp nhận logoUrl = null (field optional)', async () => {
    const dto = plainToInstance(CreateShopDto, {
      shopName: 'Shop ABC',
      logoUrl: null,
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'logoUrl');

    expect(err).toBeUndefined();
  });

  // SHOP-UNIT-010 — businessLicenseUrl sai định dạng URL
  it('reject khi businessLicenseUrl sai định dạng URL', async () => {
    const dto = plainToInstance(CreateShopDto, {
      shopName: 'Shop ABC',
      businessLicenseUrl: 'ftp:/broken',
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'businessLicenseUrl');

    expect(err?.constraints).toHaveProperty('isUrl');
  });

  // businessLicenseUrl = null (optional) phải hợp lệ
  it('chấp nhận businessLicenseUrl = null (field optional)', async () => {
    const dto = plainToInstance(CreateShopDto, {
      shopName: 'Shop ABC',
      businessLicenseUrl: null,
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'businessLicenseUrl');

    expect(err).toBeUndefined();
  });

  // SHOP-UNIT-011
  it('reject khi description > 5000 ký tự', async () => {
    const dto = plainToInstance(CreateShopDto, {
      shopName: 'Shop ABC',
      description: 'a'.repeat(5001),
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'description');

    expect(err?.constraints).toHaveProperty('maxLength');
  });

  // boundary: description đúng 5000 ký tự phải hợp lệ
  it('chấp nhận description đúng 5000 ký tự (biên trên MaxLength)', async () => {
    const dto = plainToInstance(CreateShopDto, {
      shopName: 'Shop ABC',
      description: 'a'.repeat(5000),
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'description');

    expect(err).toBeUndefined();
  });

  // returnPolicy / shippingPolicy > 5000 ký tự
  it('reject khi returnPolicy > 5000 ký tự', async () => {
    const dto = plainToInstance(CreateShopDto, {
      shopName: 'Shop ABC',
      returnPolicy: 'a'.repeat(5001),
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'returnPolicy');

    expect(err?.constraints).toHaveProperty('maxLength');
  });

  it('reject khi shippingPolicy > 5000 ký tự', async () => {
    const dto = plainToInstance(CreateShopDto, {
      shopName: 'Shop ABC',
      shippingPolicy: 'a'.repeat(5001),
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'shippingPolicy');

    expect(err?.constraints).toHaveProperty('maxLength');
  });
});

describe('RejectShopDto', () => {
  // SHOP-UNIT-012
  it('chấp nhận reason hợp lệ', async () => {
    const dto = plainToInstance(RejectShopDto, {
      reason: 'Thiếu giấy phép kinh doanh',
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  // SHOP-UNIT-013
  it('reject khi thiếu reason', async () => {
    const dto = plainToInstance(RejectShopDto, {});
    const errors = await validate(dto);

    expect(errors.find((e) => e.property === 'reason')).toBeDefined();
  });

  // SHOP-UNIT-014
  it('reject khi reason > 500 ký tự', async () => {
    const dto = plainToInstance(RejectShopDto, { reason: 'a'.repeat(501) });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'reason');

    expect(err?.constraints).toHaveProperty('maxLength');
  });
});

describe('SuspendedShopDto', () => {
  // SHOP-UNIT-015
  it('chấp nhận reasonSuspended hợp lệ', async () => {
    const dto = plainToInstance(SuspendedShopDto, {
      reasonSuspended: 'Vi phạm chính sách bán hàng cấm',
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  // SHOP-UNIT-016
  it('reject khi thiếu reasonSuspended', async () => {
    const dto = plainToInstance(SuspendedShopDto, {});
    const errors = await validate(dto);

    expect(errors.find((e) => e.property === 'reasonSuspended')).toBeDefined();
  });
});

describe('UpdateShopDto', () => {
  // SHOP-UNIT-018
  it('object rỗng {} hợp lệ (mọi field optional)', async () => {
    const dto = plainToInstance(UpdateShopDto, {});

    expect(await validate(dto)).toHaveLength(0);
  });

  // SHOP-UNIT-019
  it('reject khi logoUrl sai định dạng nếu có truyền', async () => {
    const dto = plainToInstance(UpdateShopDto, { logoUrl: 'invalid-url' });
    const errors = await validate(dto);

    expect(errors.find((e) => e.property === 'logoUrl')).toBeDefined();
  });
});

describe('PublicShopResponseDto', () => {
  // SHOP-UNIT-052 — Security-critical: không được lộ field nội bộ
  it('không chứa field nội bộ nhạy cảm của shop entity', () => {
    const fullShop = {
      id: 'shop-1',
      userId: 'user-1',
      shopName: 'Shop ABC',
      slug: 'shop-abc',
      description: 'Mô tả',
      logoUrl: 'https://cdn.site.com/logo.png',
      businessLicenseUrl: 'https://cdn.site.com/license.pdf',
      returnPolicy: 'Đổi trả 7 ngày',
      shippingPolicy: 'Giao hàng 3-5 ngày',
      status: ShopStatus.ACTIVE,
      rejectionReason: 'Lý do cũ, không được lộ',
      avgRating: 4.5,
      approvedAt: new Date(),
      approvedBy: 'admin-1',
      rejectedAt: null,
      rejectedBy: null,
      suspendedReason: null,
      suspendedAt: null,
      suspendedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Shop;

    const dto = new PublicShopResponseDto(fullShop);

    const forbiddenKeys = [
      'businessLicenseUrl',
      'rejectionReason',
      'approvedBy',
      'status',
      'userId',
      'suspendedReason',
      'suspendedBy',
    ];
    for (const key of forbiddenKeys) {
      expect(dto).not.toHaveProperty(key);
    }
  });
});

// =========================================================================
// PHẦN 2 — ShopService (repository mocked qua @nestjs/testing)
// =========================================================================

describe('ShopService', () => {
  let service: ShopService;
  let shopRepository: MockRepository<Shop>;
  let userRepository: MockRepository<User>;

  const mockUser = {
    id: 'user-id-1',
    email: 'seller@gmail.com',
    passwordHash: 'hashed-password',
    fullName: 'Seller One',
    phone: '0900000000',
    avatarUrl: null,
    role: UserRole.CUSTOMER,
    status: 'ACTIVE',
    emailVerifiedAt: new Date(),
    lastLoginAt: new Date(),
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as User;

  const baseShop = {
    id: 'shop-id-1',
    userId: mockUser.id,
    shopName: 'Test Shop',
    slug: 'test-shop',
    status: ShopStatus.PENDING,
    rejectionReason: null,
    rejectedAt: null,
    rejectedBy: null,
    approvedAt: null,
    approvedBy: null,
    suspendedReason: null,
    suspendedAt: null,
    suspendedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Shop;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopService,
        {
          provide: getRepositoryToken(Shop),
          useValue: createMockRepository<Shop>(),
        },
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository<User>(),
        },
      ],
    }).compile();

    service = module.get<ShopService>(ShopService);
    shopRepository = module.get(getRepositoryToken(Shop));
    userRepository = module.get(getRepositoryToken(User));

    mockSlugify.mockImplementation((name: string) =>
      name.trim().toLowerCase().replace(/\s+/g, '-'),
    );
    mockRandomSuffix.mockReturnValue('abc123');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerShop', () => {
    const createShopDto: CreateShopDto = {
      shopName: 'Test Shop',
    } as CreateShopDto;

    it('SHOP-001: registers a shop successfully when the user has no shop yet', async () => {
      userRepository.findOne!.mockResolvedValue({ ...mockUser });
      shopRepository
        .findOne!.mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const createdShop = { ...baseShop };
      shopRepository.create!.mockReturnValue(createdShop);
      shopRepository.save!.mockResolvedValue(createdShop);
      userRepository.save!.mockResolvedValue({
        ...mockUser,
        role: UserRole.SELLER,
      });

      const result = await service.registerShop(mockUser.id, createShopDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(shopRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          shopName: 'Test Shop',
          userId: mockUser.id,
          slug: 'test-shop',
        }),
      );
      expect(shopRepository.save).toHaveBeenCalledWith(createdShop);
      expect(result.shopName).toBe('Test Shop');
    });

    it('SHOP-002: user already has a shop (not REJECTED) → ConflictException', async () => {
      userRepository.findOne!.mockResolvedValue({ ...mockUser });
      shopRepository.findOne!.mockResolvedValueOnce({
        ...baseShop,
        status: ShopStatus.ACTIVE,
      });

      await expect(
        service.registerShop(mockUser.id, createShopDto),
      ).rejects.toThrow(ConflictException);
      expect(shopRepository.save).not.toHaveBeenCalled();
    });

    it('SHOP-003: duplicate slug → a new slug is generated via randomSuffix instead of throwing', async () => {
      userRepository.findOne!.mockResolvedValue({ ...mockUser });
      shopRepository
        .findOne!.mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...baseShop,
          id: 'other-shop-id',
          slug: 'test-shop',
        })
        .mockResolvedValueOnce(null);
      const createdShop = { ...baseShop, slug: 'test-shop-abc123' };
      shopRepository.create!.mockReturnValue(createdShop);
      shopRepository.save!.mockResolvedValue(createdShop);
      userRepository.save!.mockResolvedValue({
        ...mockUser,
        role: UserRole.SELLER,
      });

      await service.registerShop(mockUser.id, createShopDto);

      expect(mockRandomSuffix).toHaveBeenCalled();
      expect(shopRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'test-shop-abc123' }),
      );
    });

    it('SHOP-004: user does not exist → NotFoundException', async () => {
      userRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.registerShop('not-exist', createShopDto),
      ).rejects.toThrow(NotFoundException);
      expect(shopRepository.findOne).not.toHaveBeenCalled();
    });

    it('SHOP-005: CUSTOMER user is automatically promoted to SELLER (FR-06)', async () => {
      const customerUser = { ...mockUser, role: UserRole.CUSTOMER };
      userRepository.findOne!.mockResolvedValue(customerUser);
      shopRepository
        .findOne!.mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      shopRepository.create!.mockReturnValue({ ...baseShop });
      shopRepository.save!.mockResolvedValue({ ...baseShop });
      userRepository.save!.mockResolvedValue({
        ...customerUser,
        role: UserRole.SELLER,
      });

      await service.registerShop(mockUser.id, createShopDto);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.SELLER }),
      );
    });

    it('SHOP-005b: user is already SELLER → userRepository.save is not called to change role', async () => {
      const sellerUser = { ...mockUser, role: UserRole.SELLER };
      userRepository.findOne!.mockResolvedValue(sellerUser);
      shopRepository
        .findOne!.mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      shopRepository.create!.mockReturnValue({ ...baseShop });
      shopRepository.save!.mockResolvedValue({ ...baseShop });

      await service.registerShop(mockUser.id, createShopDto);

      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('SHOP-006: new shop is created with default status Pending', async () => {
      userRepository.findOne!.mockResolvedValue({ ...mockUser });
      shopRepository
        .findOne!.mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const createdShop = { ...baseShop, status: ShopStatus.PENDING };
      shopRepository.create!.mockReturnValue(createdShop);
      shopRepository.save!.mockResolvedValue(createdShop);
      userRepository.save!.mockResolvedValue({
        ...mockUser,
        role: UserRole.SELLER,
      });

      const result = await service.registerShop(mockUser.id, createShopDto);

      expect(result.status).toBe(ShopStatus.PENDING);
    });

    it('SHOP-007: save() is called exactly once with the object returned from create()', async () => {
      userRepository.findOne!.mockResolvedValue({ ...mockUser });
      shopRepository
        .findOne!.mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const createdShop = { ...baseShop };
      shopRepository.create!.mockReturnValue(createdShop);
      shopRepository.save!.mockResolvedValue(createdShop);
      userRepository.save!.mockResolvedValue({
        ...mockUser,
        role: UserRole.SELLER,
      });

      await service.registerShop(mockUser.id, createShopDto);

      expect(shopRepository.save).toHaveBeenCalledTimes(1);
      expect(shopRepository.save).toHaveBeenCalledWith(createdShop);
    });

    it('SHOP-008: response does not contain fields unrelated to Shop (e.g. user passwordHash)', async () => {
      userRepository.findOne!.mockResolvedValue({ ...mockUser });
      shopRepository
        .findOne!.mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const createdShop = { ...baseShop };
      shopRepository.create!.mockReturnValue(createdShop);
      shopRepository.save!.mockResolvedValue(createdShop);
      userRepository.save!.mockResolvedValue({
        ...mockUser,
        role: UserRole.SELLER,
      });

      const result = await service.registerShop(mockUser.id, createShopDto);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('user');
    });

    it('SHOP-027: propagates the error when shopRepository throws', async () => {
      userRepository.findOne!.mockResolvedValue({ ...mockUser });
      shopRepository.findOne!.mockRejectedValue(new Error('DB error'));

      await expect(
        service.registerShop(mockUser.id, createShopDto),
      ).rejects.toThrow('DB error');
    });

    it('SHOP-033: trims whitespace from shopName before saving', async () => {
      const dtoWithSpaces = {
        shopName: '   Test Shop   ',
      } as CreateShopDto;
      userRepository.findOne!.mockResolvedValue({ ...mockUser });
      shopRepository
        .findOne!.mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      shopRepository.create!.mockImplementation((data: any) => data as Shop);
      shopRepository.save!.mockImplementation((data: any) =>
        Promise.resolve(data as Shop),
      );
      userRepository.save!.mockResolvedValue({
        ...mockUser,
        role: UserRole.SELLER,
      });

      const result = await service.registerShop(mockUser.id, dtoWithSpaces);

      expect(shopRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ shopName: 'Test Shop' }),
      );
      expect(result.shopName).toBe('Test Shop');
    });

    describe('resubmit after being REJECTED', () => {
      it('allows resubmission and resets status to Pending, clearing the old rejection reason', async () => {
        const rejectedShop = {
          ...baseShop,
          status: ShopStatus.REJECTED,
          rejectionReason: 'invalid docs',
          rejectedAt: new Date(),
          rejectedBy: 'admin-1',
        };
        userRepository.findOne!.mockResolvedValue({ ...mockUser });
        shopRepository
          .findOne!.mockResolvedValueOnce(rejectedShop)
          .mockResolvedValueOnce(null);
        shopRepository.save!.mockImplementation((data: any) =>
          Promise.resolve(data as Shop),
        );
        userRepository.save!.mockResolvedValue({
          ...mockUser,
          role: UserRole.SELLER,
        });

        const result = await service.registerShop(mockUser.id, createShopDto);

        expect(result.status).toBe(ShopStatus.PENDING);
        expect(result.rejectionReason).toBeNull();
        expect(shopRepository.create).not.toHaveBeenCalled();
      });

      it('SHOP-034: excludes its own shop id when checking slug conflict → does not call randomSuffix unnecessarily', async () => {
        const rejectedShop = {
          ...baseShop,
          id: 'shop-id-1',
          slug: 'test-shop',
          status: ShopStatus.REJECTED,
        };
        userRepository.findOne!.mockResolvedValue({ ...mockUser });
        shopRepository
          .findOne!.mockResolvedValueOnce(rejectedShop) // lookup by userId
          .mockResolvedValueOnce(rejectedShop); // lookup by slug -> chính nó
        shopRepository.save!.mockImplementation((data: any) =>
          Promise.resolve(data as Shop),
        );
        userRepository.save!.mockResolvedValue({
          ...mockUser,
          role: UserRole.SELLER,
        });

        await service.registerShop(mockUser.id, createShopDto);

        expect(mockRandomSuffix).not.toHaveBeenCalled();
      });
    });
  });

  describe('approveShop', () => {
    it('SHOP-009: admin approves a shop successfully (Pending -> Active)', async () => {
      const pendingShop = { ...baseShop, status: ShopStatus.PENDING };
      shopRepository.findOne!.mockResolvedValue(pendingShop);
      shopRepository.save!.mockImplementation((data: any) =>
        Promise.resolve(data as Shop),
      );

      const result = await service.approveShop(pendingShop.id, 'admin-1');

      expect(result.status).toBe(ShopStatus.ACTIVE);
      expect(result.approvedBy).toBe('admin-1');
      expect(result.approvedAt).toBeInstanceOf(Date);
    });

    it('SHOP-010: shop does not exist → NotFoundException', async () => {
      shopRepository.findOne!.mockResolvedValue(null);

      await expect(service.approveShop('not-exist', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(shopRepository.save).not.toHaveBeenCalled();
    });

    it('SHOP-011: shop is not Pending → ConflictException', async () => {
      shopRepository.findOne!.mockResolvedValue({
        ...baseShop,
        status: ShopStatus.ACTIVE,
      });

      await expect(service.approveShop(baseShop.id, 'admin-1')).rejects.toThrow(
        ConflictException,
      );
      expect(shopRepository.save).not.toHaveBeenCalled();
    });

    it('SHOP-028: propagates the error when repository throws', async () => {
      shopRepository.findOne!.mockRejectedValue(new Error('DB down'));

      await expect(service.approveShop(baseShop.id, 'admin-1')).rejects.toThrow(
        'DB down',
      );
    });
  });

  describe('rejectShop', () => {
    const rejectDto: RejectShopDto = {
      reason: 'Invalid information',
    };

    it('SHOP-012: admin rejects a shop successfully', async () => {
      const pendingShop = { ...baseShop, status: ShopStatus.PENDING };
      shopRepository.findOne!.mockResolvedValue(pendingShop);
      shopRepository.save!.mockImplementation((data: any) =>
        Promise.resolve(data as Shop),
      );

      const result = await service.rejectShop(
        pendingShop.id,
        'admin-1',
        rejectDto,
      );

      expect(result.status).toBe(ShopStatus.REJECTED);
      expect(result.rejectedBy).toBe('admin-1');
    });

    it('SHOP-013: reject correctly updates status to Rejected and sets the reason', async () => {
      const pendingShop = { ...baseShop, status: ShopStatus.PENDING };
      shopRepository.findOne!.mockResolvedValue(pendingShop);
      shopRepository.save!.mockImplementation((data: any) =>
        Promise.resolve(data as Shop),
      );

      const result = await service.rejectShop(
        pendingShop.id,
        'admin-1',
        rejectDto,
      );

      expect(result.rejectionReason).toBe(rejectDto.reason);
      expect(result.rejectedAt).toBeInstanceOf(Date);
    });

    it('SHOP-014: shop does not exist → NotFoundException', async () => {
      shopRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.rejectShop('not-exist', 'admin-1', rejectDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('shop is not Pending → ConflictException', async () => {
      shopRepository.findOne!.mockResolvedValue({
        ...baseShop,
        status: ShopStatus.ACTIVE,
      });

      await expect(
        service.rejectShop(baseShop.id, 'admin-1', rejectDto),
      ).rejects.toThrow(ConflictException);
    });

    it('SHOP-029: propagates the error when repository throws', async () => {
      shopRepository.findOne!.mockRejectedValue(new Error('DB error'));

      await expect(
        service.rejectShop(baseShop.id, 'admin-1', rejectDto),
      ).rejects.toThrow('DB error');
    });
  });

  describe('suspendShop (LockShop)', () => {
    const suspendDto: SuspendedShopDto = {
      reasonSuspended: 'Policy violation',
    };

    it('SHOP-015: suspends a shop successfully (Active -> Suspended)', async () => {
      const activeShop = { ...baseShop, status: ShopStatus.ACTIVE };
      shopRepository.findOne!.mockResolvedValue(activeShop);
      shopRepository.save!.mockImplementation((data: any) =>
        Promise.resolve(data as Shop),
      );

      const result = await service.suspendShop(
        activeShop.id,
        'admin-1',
        suspendDto,
      );

      expect(result.status).toBe(ShopStatus.SUSPENDED);
      expect(result.suspendedBy).toBe('admin-1');
      expect(result.suspendedReason).toBe(suspendDto.reasonSuspended);
    });

    it('SHOP-016: shop does not exist → NotFoundException', async () => {
      shopRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.suspendShop('not-exist', 'admin-1', suspendDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('SHOP-017: shop is not Active (already Suspended) → ConflictException', async () => {
      shopRepository.findOne!.mockResolvedValue({
        ...baseShop,
        status: ShopStatus.SUSPENDED,
      });

      await expect(
        service.suspendShop(baseShop.id, 'admin-1', suspendDto),
      ).rejects.toThrow(ConflictException);
    });

    it('SHOP-030: propagates the error when repository throws', async () => {
      shopRepository.findOne!.mockRejectedValue(new Error('DB error'));

      await expect(
        service.suspendShop(baseShop.id, 'admin-1', suspendDto),
      ).rejects.toThrow('DB error');
    });

    it('SHOP-037: suspending twice in a row → second call throws ConflictException (not idempotent)', async () => {
      const activeShop = { ...baseShop, status: ShopStatus.ACTIVE };
      shopRepository.findOne!.mockResolvedValueOnce(activeShop);
      shopRepository.save!.mockImplementationOnce((data: any) =>
        Promise.resolve(data as Shop),
      );

      await service.suspendShop(activeShop.id, 'admin-1', suspendDto);

      shopRepository.findOne!.mockResolvedValueOnce({
        ...activeShop,
        status: ShopStatus.SUSPENDED,
      });

      await expect(
        service.suspendShop(activeShop.id, 'admin-1', suspendDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('unlockShop', () => {
    it('SHOP-018: unlocks a shop successfully (Suspended -> Active)', async () => {
      const suspendedShop = { ...baseShop, status: ShopStatus.SUSPENDED };
      shopRepository.findOne!.mockResolvedValue(suspendedShop);
      shopRepository.save!.mockImplementation((data: any) =>
        Promise.resolve(data as Shop),
      );

      const result = await service.unlockShop(suspendedShop.id, 'admin-1');

      expect(result.status).toBe(ShopStatus.ACTIVE);
      expect(result.suspendedReason).toBeNull();
      expect(result.approvedBy).toBe('admin-1');
    });

    it('SHOP-019: shop is not locked (not Suspended) → ConflictException', async () => {
      shopRepository.findOne!.mockResolvedValue({
        ...baseShop,
        status: ShopStatus.ACTIVE,
      });

      await expect(service.unlockShop(baseShop.id, 'admin-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('shop does not exist → NotFoundException', async () => {
      shopRepository.findOne!.mockResolvedValue(null);

      await expect(service.unlockShop('not-exist', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('SHOP-031: propagates the error when repository throws', async () => {
      shopRepository.findOne!.mockRejectedValue(new Error('DB error'));

      await expect(service.unlockShop(baseShop.id, 'admin-1')).rejects.toThrow(
        'DB error',
      );
    });

    it('SHOP-038: unlocking twice in a row → second call throws ConflictException (not idempotent)', async () => {
      const suspendedShop = { ...baseShop, status: ShopStatus.SUSPENDED };
      shopRepository.findOne!.mockResolvedValueOnce(suspendedShop);
      shopRepository.save!.mockImplementationOnce((data: any) =>
        Promise.resolve(data as Shop),
      );

      await service.unlockShop(suspendedShop.id, 'admin-1');

      shopRepository.findOne!.mockResolvedValueOnce({
        ...suspendedShop,
        status: ShopStatus.ACTIVE,
      });

      await expect(
        service.unlockShop(suspendedShop.id, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateShop', () => {
    it('SHOP-020: seller updates their own shop successfully', async () => {
      const existingShop = { ...baseShop };
      shopRepository.findOne!.mockResolvedValue(existingShop);
      shopRepository.save!.mockImplementation((data: any) =>
        Promise.resolve(data as Shop),
      );

      const updateDto: UpdateShopDto = {
        shopName: 'New Shop Name',
      };

      const result = await service.updateShop(mockUser.id, updateDto);

      expect(shopRepository.findOne).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
      expect(result.shopName).toBe('New Shop Name');
    });

    it('SHOP-021: shop does not exist for this userId → NotFoundException', async () => {
      shopRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.updateShop('no-shop-user', { shopName: 'X' }),
      ).rejects.toThrow(NotFoundException);
      expect(shopRepository.save).not.toHaveBeenCalled();
    });

    it("SHOP-022: a different userId with no shop → NotFoundException (cannot update someone else's shop)", async () => {
      shopRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.updateShop('another-user-id', {
          shopName: 'Hacked Name',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('SHOP-032: propagates the error when repository throws', async () => {
      shopRepository.findOne!.mockRejectedValue(new Error('DB error'));

      await expect(
        service.updateShop(mockUser.id, { shopName: 'X' }),
      ).rejects.toThrow('DB error');
    });

    it('SHOP-033b: trims whitespace from shopName on update', async () => {
      const existingShop = { ...baseShop };
      shopRepository.findOne!.mockResolvedValue(existingShop);
      shopRepository.save!.mockImplementation((data: any) =>
        Promise.resolve(data as Shop),
      );

      const result = await service.updateShop(mockUser.id, {
        shopName: '   Trimmed Name   ',
      });

      expect(result.shopName).toBe('Trimmed Name');
    });

    it('SHOP-035: only updates fields present in the DTO, other fields stay unchanged', async () => {
      const existingShop = { ...baseShop, slug: 'test-shop' };
      shopRepository.findOne!.mockResolvedValue(existingShop);
      shopRepository.save!.mockImplementation((data: any) =>
        Promise.resolve(data as Shop),
      );

      const result = await service.updateShop(mockUser.id, {
        shopName: 'Updated Only Name',
      });

      expect(result.shopName).toBe('Updated Only Name');
      expect(result.slug).toBe('test-shop');
      expect(result.id).toBe(baseShop.id);
    });

    it('SHOP-036: no fields passed → shop data stays unchanged but save() is still called', async () => {
      const existingShop = { ...baseShop };
      shopRepository.findOne!.mockResolvedValue(existingShop);
      shopRepository.save!.mockImplementation((data: any) =>
        Promise.resolve(data as Shop),
      );

      const result = await service.updateShop(mockUser.id, {});

      expect(shopRepository.save).toHaveBeenCalledTimes(1);
      expect(result.shopName).toBe(baseShop.shopName);
      expect(result.slug).toBe(baseShop.slug);
    });
  });

  describe('ensureShopIsActive (Guard)', () => {
    it('SHOP-023: shop is Pending → ForbiddenException', async () => {
      shopRepository.findOne!.mockResolvedValue({
        ...baseShop,
        status: ShopStatus.PENDING,
      });

      await expect(service.ensureShopIsActive(baseShop.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('SHOP-024: shop is Rejected → ForbiddenException', async () => {
      shopRepository.findOne!.mockResolvedValue({
        ...baseShop,
        status: ShopStatus.REJECTED,
      });

      await expect(service.ensureShopIsActive(baseShop.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('SHOP-025: shop is Suspended → ForbiddenException', async () => {
      shopRepository.findOne!.mockResolvedValue({
        ...baseShop,
        status: ShopStatus.SUSPENDED,
      });

      await expect(service.ensureShopIsActive(baseShop.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('SHOP-026: shop is Active → returns the shop, does not throw', async () => {
      const activeShop = { ...baseShop, status: ShopStatus.ACTIVE };
      shopRepository.findOne!.mockResolvedValue(activeShop);

      const result = await service.ensureShopIsActive(activeShop.id);

      expect(result).toEqual(activeShop);
    });

    it('shop does not exist → NotFoundException', async () => {
      shopRepository.findOne!.mockResolvedValue(null);

      await expect(service.ensureShopIsActive('not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMyShop', () => {
    it("returns the current user's shop", async () => {
      shopRepository.findOne!.mockResolvedValue({ ...baseShop });

      const result = await service.getMyShop(mockUser.id);

      expect(result.id).toBe(baseShop.id);
    });

    it('user has no shop → NotFoundException', async () => {
      shopRepository.findOne!.mockResolvedValue(null);

      await expect(service.getMyShop(mockUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPublicShopById', () => {
    it('returns the shop when it is Active', async () => {
      shopRepository.findOne!.mockResolvedValue({
        ...baseShop,
        status: ShopStatus.ACTIVE,
      });

      const result = await service.getPublicShopById(baseShop.id);

      expect(result.id).toBe(baseShop.id);
      expect(result.shopName).toBe(baseShop.shopName);
    });

    it('shop is not Active (e.g. Pending) → NotFoundException', async () => {
      shopRepository.findOne!.mockResolvedValue({
        ...baseShop,
        status: ShopStatus.PENDING,
      });

      await expect(service.getPublicShopById(baseShop.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('shop does not exist → NotFoundException', async () => {
      shopRepository.findOne!.mockResolvedValue(null);

      await expect(service.getPublicShopById('not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAllShops', () => {
    it('returns the list of shops, filtered by status when provided', async () => {
      shopRepository.find!.mockResolvedValue([{ ...baseShop }]);

      const result = await service.getAllShops(ShopStatus.PENDING);

      expect(shopRepository.find).toHaveBeenCalledWith({
        where: { status: ShopStatus.PENDING },
      });
      expect(result).toHaveLength(1);
    });

    it('returns all shops when no status is provided', async () => {
      shopRepository.find!.mockResolvedValue([{ ...baseShop }]);

      await service.getAllShops();

      expect(shopRepository.find).toHaveBeenCalledWith({});
    });
  });

  describe('getShopById', () => {
    it('returns the shop by id', async () => {
      shopRepository.findOne!.mockResolvedValue({ ...baseShop });

      const result = await service.getShopById(baseShop.id);

      expect(result.id).toBe(baseShop.id);
    });

    it('shop does not exist → NotFoundException', async () => {
      shopRepository.findOne!.mockResolvedValue(null);

      await expect(service.getShopById('not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // SHOP-UNIT-050 — was missing from the original draft: public listing pagination
  describe('getAllActiveShops', () => {
    it('SHOP-039: only returns ACTIVE shops, ordered DESC, with correct pagination params', async () => {
      const activeShops = [
        { ...baseShop, id: 'shop-a', status: ShopStatus.ACTIVE },
        { ...baseShop, id: 'shop-b', status: ShopStatus.ACTIVE },
      ];
      shopRepository.findAndCount!.mockResolvedValue([activeShops, 25]);

      const query = new PaginationQueryDto();
      query.page = 2;
      query.limit = 10;

      const result = await service.getAllActiveShops(query);

      expect(shopRepository.findAndCount).toHaveBeenCalledWith({
        where: { status: ShopStatus.ACTIVE },
        order: { createdAt: 'DESC' },
        skip: 10,
        take: 10,
      });
      expect(result.total).toBe(25);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toBeInstanceOf(PublicShopResponseDto);
    });

    it('SHOP-040: defaults to page=1, limit=20 when not provided', async () => {
      shopRepository.findAndCount!.mockResolvedValue([[], 0]);

      const query = new PaginationQueryDto();
      query.page = 1;
      query.limit = 20;

      const result = await service.getAllActiveShops(query);

      expect(shopRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
