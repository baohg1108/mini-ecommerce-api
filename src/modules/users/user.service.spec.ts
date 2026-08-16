import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';

/**
 * `create`/`merge` nhận và trả `Record<string, unknown>` (thay vì `Partial<User>`)
 * vì service truyền vào đó những object trung gian chứa field không thuộc
 * entity `User` (vd. `passwordHash` trước khi map, hoặc test cố tình kiểm tra
 * `createArgs.password` phải là undefined). Dùng `Record<string, unknown>`
 * thay vì `any` để vẫn truy cập field tuỳ ý mà không bị `no-unsafe-*`.
 */
interface MockRepository {
  create: jest.Mock<Record<string, unknown>, [Record<string, unknown>]>;
  save: jest.Mock<Promise<Record<string, unknown>>, [Record<string, unknown>]>;
  findOne: jest.Mock<Promise<User | null>, [unknown]>;
  findAndCount: jest.Mock<Promise<[User[], number]>, [unknown]>;
  merge: jest.Mock<
    Record<string, unknown>,
    [Record<string, unknown>, Record<string, unknown>]
  >;
  remove: jest.Mock<
    Promise<Record<string, unknown>>,
    [Record<string, unknown>]
  >;
}

function createMockRepository(): MockRepository {
  return {
    create: jest.fn(
      (data: Record<string, unknown>): Record<string, unknown> => ({
        ...data,
      }),
    ),
    save: jest.fn(
      (entity: Record<string, unknown>): Promise<Record<string, unknown>> =>
        Promise.resolve(entity),
    ),
    findOne: jest.fn<Promise<User | null>, [unknown]>(),
    findAndCount: jest.fn<Promise<[User[], number]>, [unknown]>(),
    merge: jest.fn(
      (
        target: Record<string, unknown>,
        dto: Record<string, unknown>,
      ): Record<string, unknown> => Object.assign(target, dto),
    ),
    remove: jest.fn(
      (entity: Record<string, unknown>): Promise<Record<string, unknown>> =>
        Promise.resolve(entity),
    ),
  };
}

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'a3f1c9d2-1111-4a2b-8888-1234567890ab',
    email: 'user@example.com',
    passwordHash: '$2b$12$hashedvaluehere',
    fullName: 'Nguyen Van A',
    phone: '0901234567',
    avatarUrl: undefined,
    role: UserRole.CUSTOMER,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: null,
    lastLoginAt: null,
    refreshToken: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  } as User;
}

describe('UsersService (Unit) — Production Test Set', () => {
  let service: UsersService;
  let repo: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    repo = createMockRepository();
    service = new UsersService(repo as unknown as Repository<User>);
  });

  it('USER-UNIT-001: should create user successfully with valid input', async () => {
    const dto: CreateUserDto = {
      email: 'new.user@example.com',
      password: 'Abc12345!',
      fullName: 'New User',
    };

    repo.save.mockImplementation(
      (entity: Record<string, unknown>): Promise<Record<string, unknown>> =>
        Promise.resolve({
          ...entity,
          id: 'generated-id',
          createdAt: new Date(),
        }),
    );

    const result = await service.createUser(dto);

    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(result.email).toBe(dto.email);
    expect(result.fullName).toBe(dto.fullName);
  });

  it('USER-UNIT-002: should hash password with bcrypt and not store plaintext', async () => {
    const dto: CreateUserDto = {
      email: 'secure@example.com',
      password: 'Abc12345!',
      fullName: 'Secure User',
    };

    await service.createUser(dto);

    const createArgs = repo.create.mock.calls[0][0];
    expect(createArgs.passwordHash).toBeDefined();
    expect(createArgs.passwordHash).not.toBe(dto.password);
    expect(createArgs.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
    expect(createArgs.password).toBeUndefined();
  });

  it('USER-UNIT-003: should not expose passwordHash in createUser response', async () => {
    const dto: CreateUserDto = {
      email: 'noleak@example.com',
      password: 'Abc12345!',
      fullName: 'No Leak',
    };

    repo.save.mockImplementation(
      (entity: Record<string, unknown>): Promise<Record<string, unknown>> =>
        Promise.resolve({
          ...entity,
          id: 'generated-id',
          passwordHash: '$2b$12$somehashvalue.......................',
          createdAt: new Date(),
        }),
    );

    const result = await service.createUser(dto);
    const resultAsRecord = result as unknown as Record<string, unknown>;

    expect(resultAsRecord.passwordHash).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(result, 'passwordHash')).toBe(
      false,
    );
  });

  it('USER-UNIT-004: CreateUserDto should reject invalid email format', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'not-an-email',
      password: 'Abc12345!',
      fullName: 'Valid Name',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('USER-UNIT-006: CreateUserDto should reject password shorter than 8 characters', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'valid@example.com',
      password: 'Ab1!',
      fullName: 'Valid Name',
    });

    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');

    expect(passwordError).toBeDefined();
    expect(passwordError?.constraints).toHaveProperty('minLength');
  });

  it('USER-UNIT-010: should update user successfully with valid id', async () => {
    const existingUser = buildUser();
    repo.findOne.mockResolvedValue(existingUser);
    const dto: UpdateUserDto = { fullName: 'New Name' };

    const result = await service.updateUser(existingUser.id, dto);

    expect(repo.merge).toHaveBeenCalledWith(existingUser, dto);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(result.fullName).toBe('New Name');
  });

  it('USER-UNIT-011: should throw NotFoundException when updateUser id not found', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(
      service.updateUser('non-existent-id', { fullName: 'X' }),
    ).rejects.toThrow(NotFoundException);

    expect(repo.save).not.toHaveBeenCalled();
  });

  it('USER-UNIT-015: partial update should not affect untouched fields', async () => {
    const existingUser = buildUser({ phone: '0909999999' });
    repo.findOne.mockResolvedValue(existingUser);

    const result = await service.updateUser(existingUser.id, {
      fullName: 'Only Name Changed',
    });

    expect(result.fullName).toBe('Only Name Changed');
    expect(existingUser.phone).toBe('0909999999');
  });

  it('USER-UNIT-016: should soft delete user and set deletedAt', async () => {
    const existingUser = buildUser({ deletedAt: null });
    repo.findOne.mockResolvedValue(existingUser);

    await service.softDeleteUser(existingUser.id);

    expect(existingUser.deletedAt).toBeInstanceOf(Date);
    expect(repo.save).toHaveBeenCalledWith(existingUser);
  });

  it('USER-UNIT-017: should throw NotFoundException when softDeleteUser id not found', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.softDeleteUser('missing-id')).rejects.toThrow(
      NotFoundException,
    );

    expect(repo.save).not.toHaveBeenCalled();
  });

  it('USER-UNIT-018: should restore soft-deleted user (deletedAt=null)', async () => {
    const deletedUser = buildUser({ deletedAt: new Date('2026-02-01') });
    repo.findOne.mockResolvedValue(deletedUser);

    await service.restoreUser(deletedUser.id);

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: deletedUser.id },
      withDeleted: true,
    });

    expect(deletedUser.deletedAt).toBeNull();
    expect(repo.save).toHaveBeenCalledWith(deletedUser);
  });

  it('USER-UNIT-019: should throw NotFoundException when restoreUser id not found', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.restoreUser('missing-id')).rejects.toThrow(
      NotFoundException,
    );

    expect(repo.save).not.toHaveBeenCalled();
  });

  it('USER-UNIT-023: should compute correct offset with default page/limit', async () => {
    repo.findAndCount.mockResolvedValue([[], 0]);
    const query = plainToInstance(PaginationQueryDto, {});

    await service.findAllUsers(query);

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });

  it('USER-UNIT-025: PaginationQueryDto should accept limit=100 (max boundary)', async () => {
    const dto = plainToInstance(PaginationQueryDto, {
      page: 1,
      limit: 100,
    });

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('USER-UNIT-027: PaginationQueryDto should reject page=0 (below min boundary)', async () => {
    const dto = plainToInstance(PaginationQueryDto, {
      page: 0,
      limit: 20,
    });

    const errors = await validate(dto);
    const pageError = errors.find((e) => e.property === 'page');

    expect(pageError).toBeDefined();
    expect(pageError?.constraints).toHaveProperty('min');
  });

  it('USER-UNIT-028: should include soft-deleted users (withDeleted:true)', async () => {
    const activeUser = buildUser({ id: 'u1', deletedAt: null });
    const deletedUser = buildUser({ id: 'u2', deletedAt: new Date() });

    repo.findAndCount.mockResolvedValue([[activeUser, deletedUser], 2]);

    const query = plainToInstance(PaginationQueryDto, {});

    const result = await service.findAllUsers(query);

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ withDeleted: true }),
    );

    expect(result.data.length).toBe(2);
  });

  it('USER-UNIT-029: should return empty list with correct meta when totalItems=0', async () => {
    repo.findAndCount.mockResolvedValue([[], 0]);

    const query = plainToInstance(PaginationQueryDto, {
      page: 1,
      limit: 20,
    });

    const result = await service.findAllUsers(query);

    expect(result.data).toEqual([]);
    expect(result.pagination.total_items).toBe(0);
    expect(result.pagination.total_pages).toBe(0);
  });

  it('USER-UNIT-030: should map result to AdminUserResponseDto correctly', async () => {
    const user = buildUser({
      lastLoginAt: new Date('2026-03-01'),
    });

    repo.findAndCount.mockResolvedValue([[user], 1]);

    const query = plainToInstance(PaginationQueryDto, {});

    const result = await service.findAllUsers(query);
    const item = result.data[0] as unknown as Record<string, unknown>;

    expect(item.lastLoginAt).toEqual(user.lastLoginAt);
    expect(item.passwordHash).toBeUndefined();
  });

  it('USER-UNIT-031: should return correct user for valid id', async () => {
    const user = buildUser();
    repo.findOne.mockResolvedValue(user);

    const result = await service.findUserById(user.id);

    expect(result.id).toBe(user.id);
    expect(result.email).toBe(user.email);
  });

  it('USER-UNIT-032: should throw NotFoundException when findUserById id not found', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.findUserById('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('USER-UNIT-033: should not return soft-deleted user (no withDeleted flag)', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.findUserById('deleted-user-id')).rejects.toThrow(
      NotFoundException,
    );

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 'deleted-user-id' },
    });
  });

  it('USER-UNIT-034: should return raw User entity (not DTO-filtered)', async () => {
    const user = buildUser();
    repo.findOne.mockResolvedValue(user);

    const result = await service.findUserByIdOrNull(user.id);

    expect(result).toBe(user);
    expect(result?.passwordHash).toBeDefined();
  });

  it('USER-UNIT-035: should return null when id not found (no throw)', async () => {
    repo.findOne.mockResolvedValue(null);

    const result = await service.findUserByIdOrNull('missing-id');

    expect(result).toBeNull();
  });

  it('USER-UNIT-036: should return correct user for valid email', async () => {
    const user = buildUser({ email: 'find.me@example.com' });
    repo.findOne.mockResolvedValue(user);

    const result = await service.findUserByEmail(user.email);

    expect(result.email).toBe(user.email);
  });

  it('USER-UNIT-037: should throw NotFoundException when findUserByEmail not found', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(
      service.findUserByEmail('missing@example.com'),
    ).rejects.toThrow(NotFoundException);
  });

  it('USER-UNIT-038: should return null when email not found (no throw)', async () => {
    repo.findOne.mockResolvedValue(null);

    const result = await service.findUserByEmailOrNull('missing@example.com');

    expect(result).toBeNull();
  });
});
