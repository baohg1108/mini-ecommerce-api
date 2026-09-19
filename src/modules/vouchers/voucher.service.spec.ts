import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';
import { VouchersService } from './vouchers.service';
import { Voucher } from './entities/voucher.entity';
import { Shop } from '../shops/entities/shop.entity';
import { UsersService } from '../users/users.service';
import { CreateVoucherDto } from './dtos/create-voucher.dto';
import { VoucherResponseDto } from './dtos/voucher-response.dto';
import { VoucherType } from '../../common/enums/voucher-type.enum';
import { VoucherScope } from '../../common/enums/voucher-scope.enum';
import { VoucherStatus } from '../../common/enums/voucher-status.enum';
import { ShopStatus } from '../../common/enums/shop-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';

describe('VouchersService (Comprehensive Unit Tests)', () => {
  let service: VouchersService;

  const mockVoucherRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };
  const mockShopRepository = { findOne: jest.fn() };
  const mockUsersService = { findUserById: jest.fn() };

  const DAY = 86400000;
  const iso = (offsetMs: number) =>
    new Date(Date.now() + offsetMs).toISOString();

  const buildDto = (
    override: Partial<CreateVoucherDto> = {},
  ): CreateVoucherDto => ({
    code: '  summer10 ',
    discountType: VoucherType.FIXED_AMOUNT,
    discountValue: 50000,
    startDate: iso(-DAY),
    endDate: iso(7 * DAY),
    usageLimit: 100,
    ...override,
  });

  const activeShop = {
    id: 'shop-1',
    userId: 'seller-1',
    status: ShopStatus.ACTIVE,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VouchersService,
        {
          provide: getRepositoryToken(Voucher),
          useValue: mockVoucherRepository,
        },
        { provide: getRepositoryToken(Shop), useValue: mockShopRepository },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<VouchersService>(VouchersService);

    // Happy-path defaults
    mockUsersService.findUserById.mockResolvedValue({
      id: 'admin-1',
      role: UserRole.ADMIN,
    });
    mockVoucherRepository.findOne.mockResolvedValue(null);
    mockVoucherRepository.create.mockImplementation((data: unknown) => data);
    mockVoucherRepository.save.mockImplementation((v: unknown) =>
      Promise.resolve({ id: 'v-1', ...(v as object) }),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createVoucher - user & scope resolution', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      mockUsersService.findUserById.mockResolvedValue(null);
      await expect(service.createVoucher('x', buildDto())).rejects.toThrow(
        NotFoundException,
      );
      expect(mockVoucherRepository.save).not.toHaveBeenCalled();
    });

    it('should create SYSTEM voucher for ADMIN with normalized code and ACTIVE status', async () => {
      const result = await service.createVoucher('admin-1', buildDto());

      expect(result).toBeInstanceOf(VoucherResponseDto);
      expect(mockVoucherRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'SUMMER10', shopId: IsNull() },
      });
      expect(mockVoucherRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'SUMMER10',
          scope: VoucherScope.SYSTEM,
          shopId: null,
          status: VoucherStatus.ACTIVE,
          usedCount: 0,
          createdBy: 'admin-1',
        }),
      );
    });

    it('should create SHOP voucher for SELLER with an active shop', async () => {
      mockUsersService.findUserById.mockResolvedValue({
        id: 'seller-1',
        role: UserRole.SELLER,
      });
      mockShopRepository.findOne.mockResolvedValue(activeShop);

      await service.createVoucher('seller-1', buildDto());

      expect(mockShopRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'seller-1' },
      });
      expect(mockVoucherRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'SUMMER10', shopId: 'shop-1' },
      });
      expect(mockVoucherRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ scope: VoucherScope.SHOP, shopId: 'shop-1' }),
      );
    });

    it('should throw ForbiddenException when seller has no shop', async () => {
      mockUsersService.findUserById.mockResolvedValue({
        id: 'seller-1',
        role: UserRole.SELLER,
      });
      mockShopRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createVoucher('seller-1', buildDto()),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when seller shop is not active', async () => {
      mockUsersService.findUserById.mockResolvedValue({
        id: 'seller-1',
        role: UserRole.SELLER,
      });
      mockShopRepository.findOne.mockResolvedValue({
        ...activeShop,
        status: 'INACTIVE',
      });

      await expect(
        service.createVoucher('seller-1', buildDto()),
      ).rejects.toThrow('Your shop must be active to create vouchers');
    });

    it('should throw ForbiddenException for roles other than ADMIN/SELLER', async () => {
      mockUsersService.findUserById.mockResolvedValue({
        id: 'u-1',
        role: 'OTHER_ROLE' as unknown as UserRole,
      });

      await expect(service.createVoucher('u-1', buildDto())).rejects.toThrow(
        'You do not have permission to create vouchers',
      );
    });
  });

  describe('createVoucher - validation', () => {
    it('should throw BadRequestException for invalid date strings', async () => {
      await expect(
        service.createVoucher('admin-1', buildDto({ startDate: 'not-a-date' })),
      ).rejects.toThrow('Invalid start date or end date');

      await expect(
        service.createVoucher('admin-1', buildDto({ endDate: 'garbage' })),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when end date equals or precedes start date', async () => {
      const same = iso(DAY);
      await expect(
        service.createVoucher(
          'admin-1',
          buildDto({ startDate: same, endDate: same }),
        ),
      ).rejects.toThrow('End date must be after start date');

      await expect(
        service.createVoucher(
          'admin-1',
          buildDto({ startDate: iso(2 * DAY), endDate: iso(DAY) }),
        ),
      ).rejects.toThrow('End date must be after start date');
    });

    it('should throw BadRequestException when end date is in the past', async () => {
      await expect(
        service.createVoucher(
          'admin-1',
          buildDto({ startDate: iso(-3 * DAY), endDate: iso(-DAY) }),
        ),
      ).rejects.toThrow('End date must be in the future');
    });

    it('should throw BadRequestException when percentage discount exceeds 100', async () => {
      await expect(
        service.createVoucher(
          'admin-1',
          buildDto({
            discountType: VoucherType.PERCENTAGE,
            discountValue: 101,
          }),
        ),
      ).rejects.toThrow('Percentage discount value must not exceed 100');
    });

    it('should accept percentage discount of exactly 100', async () => {
      await expect(
        service.createVoucher(
          'admin-1',
          buildDto({
            discountType: VoucherType.PERCENTAGE,
            discountValue: 100,
          }),
        ),
      ).resolves.toBeDefined();
    });

    it('should allow fixed amount discount greater than 100', async () => {
      await expect(
        service.createVoucher(
          'admin-1',
          buildDto({
            discountType: VoucherType.FIXED_AMOUNT,
            discountValue: 999999,
          }),
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('createVoucher - status & optional fields', () => {
    it('should set status UPCOMING when start date is in the future', async () => {
      await service.createVoucher(
        'admin-1',
        buildDto({ startDate: iso(DAY), endDate: iso(5 * DAY) }),
      );
      expect(mockVoucherRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: VoucherStatus.UPCOMING }),
      );
    });

    it('should apply defaults for optional fields when omitted', async () => {
      await service.createVoucher('admin-1', buildDto());
      expect(mockVoucherRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          minOrderValue: 0,
          maxDiscountValue: null,
          usageLimitPerUser: null,
        }),
      );
    });

    it('should use provided optional fields when supplied', async () => {
      await service.createVoucher(
        'admin-1',
        buildDto({
          minOrderValue: 200000,
          maxDiscountValue: 80000,
          usageLimitPerUser: 3,
        }),
      );
      expect(mockVoucherRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          minOrderValue: 200000,
          maxDiscountValue: 80000,
          usageLimitPerUser: 3,
        }),
      );
    });
  });

  describe('createVoucher - code uniqueness', () => {
    it('should throw ConflictException when SYSTEM code already exists', async () => {
      mockVoucherRepository.findOne.mockResolvedValue({ id: 'existing' });
      await expect(
        service.createVoucher('admin-1', buildDto()),
      ).rejects.toThrow('Voucher code already exists in the system');
      expect(mockVoucherRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when SHOP code already exists', async () => {
      mockUsersService.findUserById.mockResolvedValue({
        id: 'seller-1',
        role: UserRole.SELLER,
      });
      mockShopRepository.findOne.mockResolvedValue(activeShop);
      mockVoucherRepository.findOne.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createVoucher('seller-1', buildDto()),
      ).rejects.toThrow('Voucher code already exists in your shop');
    });
  });

  describe('createVoucher - save error handling', () => {
    it('should map DB unique violation (23505) to ConflictException for SYSTEM scope', async () => {
      mockVoucherRepository.save.mockRejectedValue({ code: '23505' });
      await expect(
        service.createVoucher('admin-1', buildDto()),
      ).rejects.toThrow(
        new ConflictException('Voucher code already exists in the system'),
      );
    });

    it('should map DB unique violation (23505) to ConflictException for SHOP scope', async () => {
      mockUsersService.findUserById.mockResolvedValue({
        id: 'seller-1',
        role: UserRole.SELLER,
      });
      mockShopRepository.findOne.mockResolvedValue(activeShop);
      mockVoucherRepository.save.mockRejectedValue({ code: '23505' });

      await expect(
        service.createVoucher('seller-1', buildDto()),
      ).rejects.toThrow(
        new ConflictException('Voucher code already exists in your shop'),
      );
    });

    it.each([
      [
        'object with a different code',
        Object.assign(new Error('boom'), { code: '42P01' }),
      ],
      ['object without code', new Error('boom')],
      ['primitive string', 'boom'],
      ['null', null],
    ])(
      'should rethrow non-unique-violation error (%s)',
      async (_label, err) => {
        mockVoucherRepository.save.mockRejectedValue(err);
        await expect(service.createVoucher('admin-1', buildDto())).rejects.toBe(
          err,
        );
      },
    );
  });
});
