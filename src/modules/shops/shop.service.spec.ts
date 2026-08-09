import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';

import { ShopService } from './shop.service';
import { Shop } from './entities/shop.entity';
import { User } from '../users/entities/user.entity';
import { ShopStatus } from '../../common/enums/shop-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { CreateShopDto } from './dtos/create-shop.dto';
import { UpdateShopDto } from './dtos/update-shop.dto';
import { RejectShopDto } from './dtos/reject-shop.dto';
import { SuspendedShopDto } from './dtos/suspended-shop.dto';
import { slugify, randomSuffix } from '../../common/utils/slugify';

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
  create: jest.fn(),
  save: jest.fn(),
});

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

    it('SHOP-003 (adapted): duplicate slug → a new slug is generated via randomSuffix instead of throwing', async () => {
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

    it('SHOP-005 (adapted): CUSTOMER user is automatically promoted to SELLER (FR-06)', async () => {
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

    it('SHOP-037 (adapted): suspending twice in a row → second call throws ConflictException (not idempotent)', async () => {
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

    it('SHOP-038 (adapted): unlocking twice in a row → second call throws ConflictException (not idempotent)', async () => {
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

    it("SHOP-022 (adapted): a different userId with no shop → NotFoundException (cannot update someone else's shop)", async () => {
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
});
