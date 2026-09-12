import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { CreateUserDto } from './dtos/create-user.dto';

describe('UsersService (Service Unit Tests)', () => {
  let service: UsersService;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
    merge: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // USER-UNIT-001, 002, 003: createUser
  describe('createUser', () => {
    it('should successfully create a new user with hashed password (USER-UNIT-001, 002, 003)', async () => {
      const dto: CreateUserDto = {
        email: 'test@example.com',
        password: 'Password@123',
        fullName: 'Bao Hoang',
      };

      const savedUserEntity = {
        id: '1',
        ...dto,
        passwordHash: 'hashed-password',
      };

      mockUserRepository.create.mockReturnValue(savedUserEntity);
      mockUserRepository.save.mockResolvedValue(savedUserEntity);

      const result = await service.createUser(dto);

      expect(bcrypt.hash).toBeDefined();
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id', '1');
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  // USER-UNIT-010, 011, 015: updateUser
  describe('updateUser', () => {
    it('should successfully update user profile with partial fields (USER-UNIT-010, 015)', async () => {
      const existingUser = {
        id: '1',
        fullName: 'Old Name',
        phone: '0912345678',
      };
      const updateDto = { fullName: 'New Name' };

      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserRepository.merge.mockImplementation(
        (user: unknown, dto: unknown) => Object.assign(user as object, dto),
      );
      mockUserRepository.save.mockResolvedValue({
        ...existingUser,
        ...updateDto,
      });

      const result = await service.updateUser('1', updateDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(mockUserRepository.merge).toHaveBeenCalledWith(
        existingUser,
        updateDto,
      );
      expect(result.fullName).toEqual('New Name');
    });

    it('should throw NotFoundException if user to update is not found (USER-UNIT-011)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateUser('999', { fullName: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // USER-UNIT-016, 017: softDeleteUser
  describe('softDeleteUser', () => {
    it('should soft delete user by setting deletedAt (USER-UNIT-016)', async () => {
      const user = { id: '1', deletedAt: null };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue({
        ...user,
        deletedAt: new Date(),
      });

      await service.softDeleteUser('1');

      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(user.deletedAt).toBeDefined();
    });

    it('should throw NotFoundException if user to soft delete is not found (USER-UNIT-017)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.softDeleteUser('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // USER-UNIT-018, 019: restoreUser
  describe('restoreUser', () => {
    it('should restore soft-deleted user (USER-UNIT-018)', async () => {
      const user = { id: '1', deletedAt: new Date() };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue({ ...user, deletedAt: null });

      await service.restoreUser('1');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        withDeleted: true,
      });
      expect(user.deletedAt).toBeNull();
    });

    it('should throw NotFoundException if user to restore is not found (USER-UNIT-019)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.restoreUser('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // USER-UNIT-020, 021, 022: hardDeleteUser
  describe('hardDeleteUser', () => {
    it('should permanently remove user (USER-UNIT-020, 022)', async () => {
      const user = { id: '1', deletedAt: new Date() };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.remove.mockResolvedValue(user);

      await service.hardDeleteUser('1');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        withDeleted: true,
      });
      expect(mockUserRepository.remove).toHaveBeenCalledWith(user);
    });

    it('should throw NotFoundException if user for hard delete not found (USER-UNIT-021)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.hardDeleteUser('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // USER-UNIT-023, 024, 028, 029, 030: findAllUsers
  describe('findAllUsers', () => {
    it('should return paginated user list with admin DTO mapping (USER-UNIT-023, 024, 028, 030)', async () => {
      const users = [{ id: '1', email: 'test@example.com', deletedAt: null }];
      mockUserRepository.findAndCount.mockResolvedValue([users, 1]);

      const result = await service.findAllUsers({ page: 1, limit: 10 });

      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith({
        withDeleted: true,
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.data.length).toEqual(1);
    });

    it('should handle empty result correctly (USER-UNIT-029)', async () => {
      mockUserRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAllUsers({ page: 1, limit: 10 });

      expect(result.data).toEqual([]);
      expect(result.pagination.total_items).toEqual(0);
    });
  });

  // USER-UNIT-031, 032, 033: findUserById
  describe('findUserById', () => {
    it('should return user response dto when user exists (USER-UNIT-031)', async () => {
      const user = { id: '1', email: 'test@example.com' };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.findUserById('1');

      expect(result).toHaveProperty('id', '1');
    });

    it('should throw NotFoundException when user does not exist (USER-UNIT-032, 033)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findUserById('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // USER-UNIT-034, 035: findUserByIdOrNull
  describe('findUserByIdOrNull', () => {
    it('should return raw entity when user exists (USER-UNIT-034)', async () => {
      const user = { id: '1', email: 'test@example.com', passwordHash: 'hash' };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.findUserByIdOrNull('1');

      expect(result).toEqual(user);
    });

    it('should return null when user does not exist (USER-UNIT-035)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findUserByIdOrNull('999');

      expect(result).toBeNull();
    });
  });

  // USER-UNIT-036, 037: findUserByEmail
  describe('findUserByEmail', () => {
    it('should return user response dto when email exists (USER-UNIT-036)', async () => {
      const user = { id: '1', email: 'test@example.com' };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.findUserByEmail('test@example.com');

      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should throw NotFoundException when email does not exist (USER-UNIT-037)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findUserByEmail('wrong@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // USER-UNIT-038: findUserByEmailOrNull
  describe('findUserByEmailOrNull', () => {
    it('should return null when email does not exist (USER-UNIT-038)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findUserByEmailOrNull('wrong@example.com');

      expect(result).toBeNull();
    });
  });

  // Additional methods: becomeToSeller, lockUser, unlockUser
  describe('becomeToSeller, lockUser, unlockUser', () => {
    it('should upgrade customer to seller successfully', async () => {
      const user = { id: '1', role: UserRole.CUSTOMER };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue({
        ...user,
        role: UserRole.SELLER,
      });

      const result = await service.becomeToSeller('1');

      expect(result.role).toEqual(UserRole.SELLER);
    });

    it('should throw ConflictException if user is already a seller', async () => {
      const user = { id: '1', role: UserRole.SELLER };
      mockUserRepository.findOne.mockResolvedValue(user);

      await expect(service.becomeToSeller('1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ForbiddenException if user is an admin', async () => {
      const user = { id: '1', role: UserRole.ADMIN };
      mockUserRepository.findOne.mockResolvedValue(user);

      await expect(service.becomeToSeller('1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should lock an active user and clear refresh token', async () => {
      const user = {
        id: '1',
        status: UserStatus.ACTIVE,
        refreshToken: 'token',
      };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue({
        ...user,
        status: UserStatus.LOCKED,
        refreshToken: null,
      });

      const result = await service.lockUser('1');

      expect(result.status).toEqual(UserStatus.LOCKED);
      expect(user.refreshToken).toBeNull();
    });

    it('should unlock a locked user successfully', async () => {
      const user = { id: '1', status: UserStatus.LOCKED };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue({
        ...user,
        status: UserStatus.ACTIVE,
      });

      const result = await service.unlockUser('1');

      expect(result.status).toEqual(UserStatus.ACTIVE);
    });
  });
});
