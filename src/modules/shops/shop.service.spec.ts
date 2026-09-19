import { Test, TestingModule } from '@nestjs/testing';
import { ShopService } from './shop.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Shop } from './entities/shop.entity';
import { User } from '../users/entities/user.entity';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ShopStatus } from '../../common/enums/shop-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { CreateShopDto } from './dtos/create-shop.dto';
import { UpdateShopDto } from './dtos/update-shop.dto';
import { RejectShopDto } from './dtos/reject-shop.dto';
import { SuspendedShopDto } from './dtos/suspended-shop.dto';

describe('ShopService (Service Unit Tests)', () => {
  let service: ShopService;

  const mockShopRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopService,
        {
          provide: getRepositoryToken(Shop),
          useValue: mockShopRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<ShopService>(ShopService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerShop', () => {
    const createShopDto: CreateShopDto = {
      shopName: 'Electronics Shop',
      description: 'Best electronics',
      logoUrl: 'https://example.com/logo.png',
      businessLicenseUrl: 'https://example.com/license.pdf',
      returnPolicy: '30 days return',
      shippingPolicy: 'Fast shipping',
    };

    it('should throw NotFoundException if user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.registerShop('user-1', createShopDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if shop already exists and status is not REJECTED', async () => {
      const user = { id: 'user-1', role: UserRole.CUSTOMER };
      const existingShop = {
        id: 'shop-1',
        userId: 'user-1',
        status: ShopStatus.ACTIVE,
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      mockShopRepository.findOne.mockResolvedValue(existingShop);

      await expect(
        service.registerShop('user-1', createShopDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should resubmit shop if existing shop status is REJECTED', async () => {
      const user = { id: 'user-1', role: UserRole.CUSTOMER };
      const existingShop = {
        id: 'shop-1',
        userId: 'user-1',
        status: ShopStatus.REJECTED,
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      mockShopRepository.findOne
        .mockResolvedValueOnce(existingShop) // existing shop lookup
        .mockResolvedValueOnce(null); // slug unique check

      mockShopRepository.save.mockResolvedValue({
        ...existingShop,
        ...createShopDto,
        status: ShopStatus.PENDING,
      });
      mockUserRepository.save.mockResolvedValue(user);

      const result = await service.registerShop('user-1', createShopDto);

      expect(result).toHaveProperty('status', ShopStatus.PENDING);
      expect(mockShopRepository.save).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should create new shop successfully when no existing shop is found', async () => {
      const user = { id: 'user-1', role: UserRole.CUSTOMER };

      mockUserRepository.findOne.mockResolvedValue(user);
      mockShopRepository.findOne
        .mockResolvedValueOnce(null) // existing shop lookup -> null
        .mockResolvedValueOnce(null); // slug unique check -> null

      mockShopRepository.create.mockReturnValue({
        id: 'shop-new',
        ...createShopDto,
        userId: 'user-1',
      });
      mockShopRepository.save.mockResolvedValue({
        id: 'shop-new',
        ...createShopDto,
        status: ShopStatus.PENDING,
      });
      mockUserRepository.save.mockResolvedValue(user);

      const result = await service.registerShop('user-1', createShopDto);

      expect(result).toBeDefined();
      expect(mockShopRepository.create).toHaveBeenCalled();
      expect(mockShopRepository.save).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should regenerate slug when a conflict exists on first attempt (SHOP-UNIT-030)', async () => {
      const user = { id: 'user-1', role: UserRole.CUSTOMER };

      mockUserRepository.findOne.mockResolvedValue(user);
      mockShopRepository.findOne
        .mockResolvedValueOnce(null) // existing shop lookup -> no existing shop for this user
        .mockResolvedValueOnce({
          id: 'other-shop-id',
          slug: 'electronics-shop',
        }) // 1st slug check -> conflict (different shop id) -> loop must retry
        .mockResolvedValueOnce(null); // 2nd slug check (after regenerating) -> no conflict -> loop breaks

      mockShopRepository.create.mockReturnValue({
        id: 'shop-new',
        ...createShopDto,
        userId: 'user-1',
      });
      mockShopRepository.save.mockResolvedValue({
        id: 'shop-new',
        ...createShopDto,
        status: ShopStatus.PENDING,
      });
      mockUserRepository.save.mockResolvedValue(user);

      const result = await service.registerShop('user-1', createShopDto);

      expect(result).toBeDefined();
      // existingShop lookup (1) + slug check attempt 1 (2) + slug check attempt 2 (3) = 3 calls
      expect(mockShopRepository.findOne).toHaveBeenCalledTimes(3);
      expect(mockShopRepository.save).toHaveBeenCalled();
    });
  });

  describe('getMyShop', () => {
    it('should return shop response dto when shop exists for user', async () => {
      const shop = { id: 'shop-1', userId: 'user-1', shopName: 'Test Shop' };
      mockShopRepository.findOne.mockResolvedValue(shop);

      const result = await service.getMyShop('user-1');

      expect(result).toHaveProperty('id', 'shop-1');
    });

    it('should throw NotFoundException if shop does not exist for user', async () => {
      mockShopRepository.findOne.mockResolvedValue(null);

      await expect(service.getMyShop('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPublicShopById', () => {
    it('should return public shop response if shop is active', async () => {
      const shop = {
        id: 'shop-1',
        status: ShopStatus.ACTIVE,
        shopName: 'Active Shop',
      };
      mockShopRepository.findOne.mockResolvedValue(shop);

      const result = await service.getPublicShopById('shop-1');

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if shop is not active or not found', async () => {
      const shop = { id: 'shop-1', status: ShopStatus.PENDING };
      mockShopRepository.findOne.mockResolvedValue(shop);

      await expect(service.getPublicShopById('shop-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('ensureShopIsActive', () => {
    it('should return shop if active', async () => {
      const shop = { id: 'shop-1', status: ShopStatus.ACTIVE };
      mockShopRepository.findOne.mockResolvedValue(shop);

      const result = await service.ensureShopIsActive('shop-1');

      expect(result).toEqual(shop);
    });

    it('should throw NotFoundException if shop not found', async () => {
      mockShopRepository.findOne.mockResolvedValue(null);

      await expect(service.ensureShopIsActive('shop-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if shop is not active', async () => {
      const shop = { id: 'shop-1', status: ShopStatus.SUSPENDED };
      mockShopRepository.findOne.mockResolvedValue(shop);

      await expect(service.ensureShopIsActive('shop-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('approveShop', () => {
    it('should approve pending shop successfully', async () => {
      const shop = { id: 'shop-1', status: ShopStatus.PENDING };
      mockShopRepository.findOne.mockResolvedValue(shop);
      mockShopRepository.save.mockResolvedValue({
        ...shop,
        status: ShopStatus.ACTIVE,
      });

      const result = await service.approveShop('shop-1', 'admin-1');

      expect(result).toHaveProperty('status', ShopStatus.ACTIVE);
      expect(mockShopRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if shop not found', async () => {
      mockShopRepository.findOne.mockResolvedValue(null);

      await expect(service.approveShop('shop-1', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if shop is not pending', async () => {
      const shop = { id: 'shop-1', status: ShopStatus.ACTIVE };
      mockShopRepository.findOne.mockResolvedValue(shop);

      await expect(service.approveShop('shop-1', 'admin-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('rejectShop', () => {
    it('should reject pending shop successfully', async () => {
      const shop = { id: 'shop-1', status: ShopStatus.PENDING };
      const rejectDto: RejectShopDto = { reason: 'Invalid documents' };

      mockShopRepository.findOne.mockResolvedValue(shop);
      mockShopRepository.save.mockResolvedValue({
        ...shop,
        status: ShopStatus.REJECTED,
      });

      const result = await service.rejectShop('shop-1', 'admin-1', rejectDto);

      expect(result).toHaveProperty('status', ShopStatus.REJECTED);
      expect(mockShopRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if shop is not pending', async () => {
      const shop = { id: 'shop-1', status: ShopStatus.ACTIVE };
      const rejectDto: RejectShopDto = { reason: 'Invalid documents' };

      mockShopRepository.findOne.mockResolvedValue(shop);

      await expect(
        service.rejectShop('shop-1', 'admin-1', rejectDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if shop not found (SHOP-UNIT-027)', async () => {
      mockShopRepository.findOne.mockResolvedValue(null);
      const rejectDto: RejectShopDto = { reason: 'Invalid documents' };

      await expect(
        service.rejectShop('shop-1', 'admin-1', rejectDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('suspendShop', () => {
    it('should suspend active shop successfully', async () => {
      const shop = { id: 'shop-1', status: ShopStatus.ACTIVE };
      const suspendDto: SuspendedShopDto = {
        reasonSuspended: 'Violation of terms',
      };

      mockShopRepository.findOne.mockResolvedValue(shop);
      mockShopRepository.save.mockResolvedValue({
        ...shop,
        status: ShopStatus.SUSPENDED,
      });

      const result = await service.suspendShop('shop-1', 'admin-1', suspendDto);

      expect(result).toHaveProperty('status', ShopStatus.SUSPENDED);
    });

    it('should throw ConflictException if shop is not active', async () => {
      const shop = { id: 'shop-1', status: ShopStatus.PENDING };
      const suspendDto: SuspendedShopDto = { reasonSuspended: 'Violation' };

      mockShopRepository.findOne.mockResolvedValue(shop);

      await expect(
        service.suspendShop('shop-1', 'admin-1', suspendDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if shop not found (SHOP-UNIT-028)', async () => {
      mockShopRepository.findOne.mockResolvedValue(null);
      const suspendDto: SuspendedShopDto = { reasonSuspended: 'Violation' };

      await expect(
        service.suspendShop('shop-1', 'admin-1', suspendDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unlockShop', () => {
    it('should unlock suspended shop successfully', async () => {
      const shop = { id: 'shop-1', status: ShopStatus.SUSPENDED };
      mockShopRepository.findOne.mockResolvedValue(shop);
      mockShopRepository.save.mockResolvedValue({
        ...shop,
        status: ShopStatus.ACTIVE,
      });

      const result = await service.unlockShop('shop-1', 'admin-1');

      expect(result).toHaveProperty('status', ShopStatus.ACTIVE);
    });

    it('should throw ConflictException if shop is not suspended', async () => {
      const shop = { id: 'shop-1', status: ShopStatus.ACTIVE };
      mockShopRepository.findOne.mockResolvedValue(shop);

      await expect(service.unlockShop('shop-1', 'admin-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if shop not found (SHOP-UNIT-029)', async () => {
      mockShopRepository.findOne.mockResolvedValue(null);

      await expect(service.unlockShop('shop-1', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateShop', () => {
    it('should update shop successfully', async () => {
      const shop = { id: 'shop-1', userId: 'user-1', shopName: 'Old Name' };
      const updateDto: UpdateShopDto = { shopName: 'New Name' };

      mockShopRepository.findOne.mockResolvedValue(shop);
      mockShopRepository.save.mockResolvedValue({ ...shop, ...updateDto });

      const result = await service.updateShop('user-1', updateDto);

      expect(result).toHaveProperty('shopName', 'New Name');
    });

    it('should throw NotFoundException if shop not found for user', async () => {
      mockShopRepository.findOne.mockResolvedValue(null);

      await expect(service.updateShop('user-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAllShops & getShopById', () => {
    it('should return list of all shops with optional status filter', async () => {
      mockShopRepository.find.mockResolvedValue([
        { id: 'shop-1', status: ShopStatus.ACTIVE },
      ]);

      const result = await service.getAllShops(ShopStatus.ACTIVE);

      expect(result.length).toEqual(1);
      expect(mockShopRepository.find).toHaveBeenCalledWith({
        where: { status: ShopStatus.ACTIVE },
      });
    });

    it('should return shop by id', async () => {
      mockShopRepository.findOne.mockResolvedValue({ id: 'shop-1' });

      const result = await service.getShopById('shop-1');

      expect(result).toHaveProperty('id', 'shop-1');
    });

    it('should throw NotFoundException if getShopById misses shop', async () => {
      mockShopRepository.findOne.mockResolvedValue(null);

      await expect(service.getShopById('shop-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAllActiveShops', () => {
    it('should return paginated active shops', async () => {
      const shops = [{ id: 'shop-1', status: ShopStatus.ACTIVE }];
      mockShopRepository.findAndCount.mockResolvedValue([shops, 1]);

      const result = await service.getAllActiveShops({ page: 1, limit: 10 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
    });
  });
});
