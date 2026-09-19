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

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

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
    it('should create a valid user and return UserResponseDto with save called once (USER-UNIT-001)', async () => {
      const dto: CreateUserDto = {
        email: 'test@example.com',
        password: 'Password@123',
        fullName: 'Bao Hoang',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const createdEntity = { ...dto };
      const savedUserEntity = {
        id: '1',
        email: dto.email,
        fullName: dto.fullName,
        passwordHash: 'hashed-password',
      };

      mockUserRepository.create.mockReturnValue(createdEntity);
      mockUserRepository.save.mockResolvedValue(savedUserEntity);

      const result = await service.createUser(dto);

      expect(mockUserRepository.create).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toHaveProperty('id', '1');
    });

    it('should hash the password via bcrypt and never persist the plaintext (USER-UNIT-002)', async () => {
      const dto: CreateUserDto = {
        email: 'test2@example.com',
        password: 'Abc12345!',
        fullName: 'Bao Hoang',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-value');

      mockUserRepository.create.mockImplementation((entity) => entity);
      mockUserRepository.save.mockImplementation((entity) =>
        Promise.resolve({ id: '2', ...entity }),
      );

      await service.createUser(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, expect.anything());

      const createArg = mockUserRepository.create.mock.calls[0][0];
      expect(createArg.passwordHash).toBeDefined();
      expect(createArg.passwordHash).not.toEqual(dto.password);
      expect(createArg.passwordHash).toEqual('hashed-value');
      expect(createArg).not.toHaveProperty('password');
    });

    it('should return a DTO without exposing passwordHash (USER-UNIT-003)', async () => {
      const dto: CreateUserDto = {
        email: 'test3@example.com',
        password: 'Password@123',
        fullName: 'Bao Hoang',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const savedUserEntity = {
        id: '3',
        email: dto.email,
        fullName: dto.fullName,
        passwordHash: 'hashed-password',
      };

      mockUserRepository.create.mockReturnValue(savedUserEntity);
      mockUserRepository.save.mockResolvedValue(savedUserEntity);

      const result = await service.createUser(dto);

      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  // USER-UNIT-004, 005, 006: updateUser
  describe('updateUser', () => {
    it('should successfully update user profile with valid id (USER-UNIT-004)', async () => {
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
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result.fullName).toEqual('New Name');
    });

    it('should throw NotFoundException if user to update is not found (USER-UNIT-005)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateUser('999', { fullName: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should only update fields passed in dto, leaving other fields unchanged (USER-UNIT-006)', async () => {
      const existingUser = {
        id: '1',
        fullName: 'Old Name',
        phone: '0912345678',
      };
      const updateDto = { fullName: 'X' };

      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserRepository.merge.mockImplementation(
        (user: unknown, dto: unknown) => Object.assign(user as object, dto),
      );
      mockUserRepository.save.mockImplementation((user) =>
        Promise.resolve(user),
      );

      const result = await service.updateUser('1', updateDto);

      expect(result.fullName).toEqual('X');
      expect(result.phone).toEqual('0912345678');
    });
  });

  // USER-UNIT-007, 008: softDeleteUser
  describe('softDeleteUser', () => {
    it('should soft delete user by setting deletedAt (USER-UNIT-007)', async () => {
      const user = { id: '1', deletedAt: null };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue({
        ...user,
        deletedAt: new Date(),
      });

      await service.softDeleteUser('1');

      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(user.deletedAt).toBeDefined();
      expect(user.deletedAt).not.toBeNull();
    });

    it('should throw NotFoundException if user to soft delete is not found (USER-UNIT-008)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.softDeleteUser('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // USER-UNIT-009, 010: restoreUser
  describe('restoreUser', () => {
    it('should restore soft-deleted user (USER-UNIT-009)', async () => {
      const user = { id: '1', deletedAt: new Date() };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue({ ...user, deletedAt: null });

      await service.restoreUser('1');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        withDeleted: true,
      });
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(user.deletedAt).toBeNull();
    });

    it('should throw NotFoundException if user to restore is not found (USER-UNIT-010)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.restoreUser('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // USER-UNIT-011, 012, 013: hardDeleteUser
  describe('hardDeleteUser', () => {
    it('should permanently remove user, including already soft-deleted ones (USER-UNIT-011, 013)', async () => {
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

    it('should throw NotFoundException if user for hard delete not found (USER-UNIT-012)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.hardDeleteUser('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // USER-UNIT-014, 015, 016, 017, 018: findAllUsers
  describe('findAllUsers', () => {
    it('should compute offset correctly with page=1, limit=10 (USER-UNIT-014)', async () => {
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

    it('should compute offset correctly when page=2, limit=10 (USER-UNIT-015)', async () => {
      const users = [{ id: '2', email: 'test2@example.com', deletedAt: null }];
      mockUserRepository.findAndCount.mockResolvedValue([users, 11]);

      await service.findAllUsers({ page: 2, limit: 10 });

      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith({
        withDeleted: true,
        skip: 10,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });

    it('should include both active and soft-deleted users (withDeleted:true) (USER-UNIT-016)', async () => {
      const activeUser = {
        id: '1',
        email: 'active@example.com',
        deletedAt: null,
      };
      const softDeletedUser = {
        id: '2',
        email: 'deleted@example.com',
        deletedAt: new Date(),
      };
      mockUserRepository.findAndCount.mockResolvedValue([
        [activeUser, softDeletedUser],
        2,
      ]);

      const result = await service.findAllUsers({ page: 1, limit: 10 });

      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ withDeleted: true }),
      );
      expect(result.data).toHaveLength(2);
      expect(result.data.some((u) => u.deletedAt === null)).toBe(true);
      expect(result.data.some((u) => u.deletedAt !== null)).toBe(true);
    });

    it('should return empty list with correct pagination meta when totalItems=0 (USER-UNIT-017)', async () => {
      mockUserRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAllUsers({ page: 1, limit: 10 });

      expect(result.data).toEqual([]);
      expect(result.pagination.total_items).toEqual(0);
    });

    it('should map each item to AdminUserResponseDto with admin-only fields (USER-UNIT-018)', async () => {
      const users = [
        {
          id: '1',
          email: 'test@example.com',
          lastLoginAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-02-01'),
          deletedAt: null,
        },
      ];
      mockUserRepository.findAndCount.mockResolvedValue([users, 1]);

      const result = await service.findAllUsers({ page: 1, limit: 10 });

      expect(result.data[0]).toHaveProperty('lastLoginAt');
      expect(result.data[0]).toHaveProperty('updatedAt');
      expect(result.data[0]).toHaveProperty('deletedAt');
    });
  });

  // USER-UNIT-019, 020, 021: findUserById
  describe('findUserById', () => {
    it('should return user response dto when user exists (USER-UNIT-019)', async () => {
      const user = { id: '1', email: 'test@example.com' };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.findUserById('1');

      expect(result).toHaveProperty('id', '1');
    });

    it('should throw NotFoundException when user does not exist (USER-UNIT-020)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findUserById('999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should NOT return a soft-deleted user (USER-UNIT-021)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findUserById('deleted-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'deleted-id' },
      });
    });
  });

  // USER-UNIT-022, 023: findUserByIdOrNull
  describe('findUserByIdOrNull', () => {
    it('should return raw entity when user exists (USER-UNIT-022)', async () => {
      const user = { id: '1', email: 'test@example.com', passwordHash: 'hash' };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.findUserByIdOrNull('1');

      expect(result).toEqual(user);
      expect(result).toHaveProperty('passwordHash');
    });

    it('should return null when user does not exist (USER-UNIT-023)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findUserByIdOrNull('999');

      expect(result).toBeNull();
    });
  });

  // USER-UNIT-024, 025: findUserByEmail
  describe('findUserByEmail', () => {
    it('should return user response dto when email exists (USER-UNIT-024)', async () => {
      const user = { id: '1', email: 'test@example.com' };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.findUserByEmail('test@example.com');

      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should throw NotFoundException when email does not exist (USER-UNIT-025)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findUserByEmail('wrong@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // USER-UNIT-026: findUserByEmailOrNull
  describe('findUserByEmailOrNull', () => {
    it('should return null when email does not exist (USER-UNIT-026)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findUserByEmailOrNull('wrong@example.com');

      expect(result).toBeNull();
    });

    it('should return raw entity when email exists (coverage)', async () => {
      const user = { id: '1', email: 'test@example.com', passwordHash: 'hash' };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.findUserByEmailOrNull('test@example.com');

      expect(result).toEqual(user);
    });
  });

  // add methods not yet in the sheet: becomeToSeller, lockUser, unlockUser
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

    it('should throw NotFoundException if user for becomeToSeller is not found (coverage)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.becomeToSeller('999')).rejects.toThrow(
        NotFoundException,
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

    it('should throw NotFoundException if user for lockUser is not found (coverage)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.lockUser('999')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if user is already locked (coverage)', async () => {
      const user = { id: '1', status: UserStatus.LOCKED };
      mockUserRepository.findOne.mockResolvedValue(user);

      await expect(service.lockUser('1')).rejects.toThrow(ConflictException);
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

    it('should throw NotFoundException if user for unlockUser is not found (coverage)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.unlockUser('999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if user is not locked (coverage)', async () => {
      const user = { id: '1', status: UserStatus.ACTIVE };
      mockUserRepository.findOne.mockResolvedValue(user);

      await expect(service.unlockUser('1')).rejects.toThrow(ConflictException);
    });
  });
});
