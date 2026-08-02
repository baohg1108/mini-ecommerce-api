import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { UserResponseDto } from '../users/dtos/user-response.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';

jest.mock('bcrypt');

const mockCompare = jest.mocked(bcrypt.compare);
const mockHash = jest.mocked(bcrypt.hash);

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUserEntity: User = {
    id: 'user-id-1',
    email: 'test@gmail.com',
    passwordHash: 'hashed-password-in-db',
    fullName: 'Test User',
    phone: '1234567890',
    avatarUrl: 'http://example.com/avatar.jpg',
    role: UserRole.CUSTOMER,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    lastLoginAt: new Date(),
    refreshToken: 'hashed-refresh-token-in-db',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockUserResponse: UserResponseDto = {
    id: mockUserEntity.id,
    email: mockUserEntity.email,
    fullName: mockUserEntity.fullName,
    phone: mockUserEntity.phone,
    avatarUrl: mockUserEntity.avatarUrl,
    role: mockUserEntity.role,
    status: mockUserEntity.status,
    emailVerifiedAt: mockUserEntity.emailVerifiedAt,
    lastLoginAt: mockUserEntity.lastLoginAt,
    createdAt: mockUserEntity.createdAt,
    updatedAt: mockUserEntity.updatedAt,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findUserByEmailOrNull: jest.fn(),
            createUser: jest.fn(),
            findUserByIdOrNull: jest.fn(),
            updateUser: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                JWT_ACCESS_TOKEN_SECRET: 'access-secret',
                JWT_ACCESS_TOKEN_EXPIRATION_TIME: '15m',
                JWT_REFRESH_TOKEN_SECRET: 'refresh-secret',
                JWT_REFRESH_TOKEN_EXPIRATION_TIME: '7d',
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // register
  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@gmail.com',
      password: 'Pqass13!@!aq',
      fullName: 'Gia Bao',
    };

    it('AUTH-001: should register successfully', async () => {
      const findEmailSpy = jest.spyOn(usersService, 'findUserByEmailOrNull');
      const createUserSpy = jest.spyOn(usersService, 'createUser');

      findEmailSpy.mockResolvedValue(null);
      createUserSpy.mockResolvedValue(mockUserResponse);

      const result = await service.register(registerDto);

      expect(findEmailSpy).toHaveBeenCalledWith(registerDto.email);
      expect(createUserSpy).toHaveBeenCalledWith(registerDto);
      expect(result.email).toBe(mockUserResponse.email);
      expect(result.fullName).toBe(mockUserResponse.fullName);
    });

    it('AUTH-002: should throw ConflictException when email already exists', async () => {
      const findEmailSpy = jest.spyOn(usersService, 'findUserByEmailOrNull');
      const createUserSpy = jest.spyOn(usersService, 'createUser');

      findEmailSpy.mockResolvedValue(mockUserEntity);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );

      expect(createUserSpy).not.toHaveBeenCalled();
    });

    it('AUTH-003: should return response without passwordHash', async () => {
      const findEmailSpy = jest.spyOn(usersService, 'findUserByEmailOrNull');
      const createUserSpy = jest.spyOn(usersService, 'createUser');

      findEmailSpy.mockResolvedValue(null);
      createUserSpy.mockResolvedValue(mockUserResponse);

      const result = await service.register(registerDto);

      expect(result).not.toHaveProperty('passwordHash');
    });

    it('AUTH-019: should propagate error when UsersService.createUser throws', async () => {
      const findEmailSpy = jest.spyOn(usersService, 'findUserByEmailOrNull');
      const createUserSpy = jest.spyOn(usersService, 'createUser');

      findEmailSpy.mockResolvedValue(null);
      const dbError = new Error('DB connection lost');
      createUserSpy.mockRejectedValue(dbError);

      await expect(service.register(registerDto)).rejects.toThrow(
        'DB connection lost',
      );
    });
  });

  // login
  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@gmail.com',
      password: 'Pqass13!@!aq',
    };

    const setupHappyPath = () => {
      jest
        .spyOn(usersService, 'findUserByEmailOrNull')
        .mockResolvedValue(mockUserEntity);
      mockCompare.mockResolvedValue(true);
      jest
        .spyOn(jwtService, 'signAsync')
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');
      mockHash.mockResolvedValue('new-hashed-refresh-token');
      jest
        .spyOn(usersService, 'updateUser')
        .mockResolvedValue(mockUserResponse);
    };

    it('AUTH-004: should login successfully and return access and refresh tokens', async () => {
      setupHappyPath();

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.user.email).toBe(mockUserEntity.email);
    });

    it('AUTH-005: should throw UnauthorizedException when email does not exist', async () => {
      jest.spyOn(usersService, 'findUserByEmailOrNull').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockCompare).not.toHaveBeenCalled();
    });

    it('AUTH-006: should throw UnauthorizedException when password is incorrect', async () => {
      jest
        .spyOn(usersService, 'findUserByEmailOrNull')
        .mockResolvedValue(mockUserEntity);
      mockCompare.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('AUTH-007: should return consistent error message for both invalid email and password', async () => {
      const findEmailSpy = jest.spyOn(usersService, 'findUserByEmailOrNull');
      findEmailSpy.mockResolvedValue(null);
      let errorMessageCase1 = '';
      try {
        await service.login(loginDto);
      } catch (err) {
        errorMessageCase1 = (err as Error).message;
      }

      findEmailSpy.mockResolvedValue(mockUserEntity);
      mockCompare.mockResolvedValue(false);
      let errorMessageCase2 = '';
      try {
        await service.login(loginDto);
      } catch (err) {
        errorMessageCase2 = (err as Error).message;
      }

      expect(errorMessageCase1).toBe(errorMessageCase2);
      expect(errorMessageCase1).toBe('Email or password is incorrect');
    });

    it('AUTH-008: should call updateRefreshTokenHash with correct userId and new refreshToken', async () => {
      setupHappyPath();
      const spy = jest.spyOn(service, 'updateRefreshTokenHash');

      await service.login(loginDto);

      expect(spy).toHaveBeenCalledWith(mockUserEntity.id, 'mock-refresh-token');
    });

    it('AUTH-009: should call generateTokens with correct userId and email', async () => {
      setupHappyPath();
      const spy = jest.spyOn(service, 'generateTokens');

      await service.login(loginDto);

      expect(spy).toHaveBeenCalledWith(mockUserEntity.id, mockUserEntity.email);
    });

    it('AUTH-010: should return user object without passwordHash', async () => {
      setupHappyPath();

      const result = await service.login(loginDto);

      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('AUTH-020: should propagate error when dependency throws', async () => {
      jest
        .spyOn(usersService, 'findUserByEmailOrNull')
        .mockResolvedValue(mockUserEntity);
      mockCompare.mockResolvedValue(true);
      jest
        .spyOn(jwtService, 'signAsync')
        .mockRejectedValue(new Error('JWT signing failed'));

      await expect(service.login(loginDto)).rejects.toThrow(
        'JWT signing failed',
      );
    });
  });

  // logout
  describe('logout', () => {
    it('AUTH-011: should set refreshToken to null upon successful logout', async () => {
      const updateUserSpy = jest.spyOn(usersService, 'updateUser');
      updateUserSpy.mockResolvedValue(mockUserResponse);

      await service.logout(mockUserEntity.id);

      expect(updateUserSpy).toHaveBeenCalledWith(mockUserEntity.id, {
        refreshToken: null,
      });
    });

    it('AUTH-021: should propagate dependency errors', async () => {
      const updateUserSpy = jest.spyOn(usersService, 'updateUser');
      updateUserSpy.mockRejectedValue(new Error('Database timeout'));

      await expect(service.logout(mockUserEntity.id)).rejects.toThrow(
        'Database timeout',
      );
    });

    it('AUTH-027: should throw NotFoundException when user does not exist', async () => {
      const updateUserSpy = jest.spyOn(usersService, 'updateUser');
      updateUserSpy.mockRejectedValue(
        new NotFoundException('User with id not-exist not found'),
      );

      await expect(service.logout('not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('AUTH-025: should allow multiple consecutive logout calls without throwing errors', async () => {
      const updateUserSpy = jest.spyOn(usersService, 'updateUser');
      updateUserSpy.mockResolvedValue(mockUserResponse);

      await service.logout(mockUserEntity.id);
      await service.logout(mockUserEntity.id);

      expect(updateUserSpy).toHaveBeenCalledTimes(2);
      expect(updateUserSpy).toHaveBeenNthCalledWith(1, mockUserEntity.id, {
        refreshToken: null,
      });
      expect(updateUserSpy).toHaveBeenNthCalledWith(2, mockUserEntity.id, {
        refreshToken: null,
      });
    });
  });

  // refresh tokens
  describe('refreshTokens', () => {
    const oldRawRefreshToken = 'old-raw-refresh-token';

    it('AUTH-012: should refresh successfully and return new token pair', async () => {
      jest
        .spyOn(usersService, 'findUserByIdOrNull')
        .mockResolvedValue(mockUserEntity);
      mockCompare.mockResolvedValue(true);
      jest
        .spyOn(jwtService, 'signAsync')
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      mockHash.mockResolvedValue('new-hashed-refresh-token');
      jest
        .spyOn(usersService, 'updateUser')
        .mockResolvedValue(mockUserResponse);

      const result = await service.refreshTokens(
        mockUserEntity.id,
        oldRawRefreshToken,
      );

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('AUTH-013: should throw UnauthorizedException when user does not exist', async () => {
      jest.spyOn(usersService, 'findUserByIdOrNull').mockResolvedValue(null);

      await expect(
        service.refreshTokens('not-exist', oldRawRefreshToken),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('AUTH-014: should throw UnauthorizedException when user has logged out', async () => {
      jest.spyOn(usersService, 'findUserByIdOrNull').mockResolvedValue({
        ...mockUserEntity,
        refreshToken: null,
      });

      await expect(
        service.refreshTokens(mockUserEntity.id, oldRawRefreshToken),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockCompare).not.toHaveBeenCalled();
    });

    it('AUTH-015: should throw UnauthorizedException when client refreshToken does not match hash in database', async () => {
      jest
        .spyOn(usersService, 'findUserByIdOrNull')
        .mockResolvedValue(mockUserEntity);
      mockCompare.mockResolvedValue(false);

      await expect(
        service.refreshTokens(mockUserEntity.id, 'wrong-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('AUTH-016: should rotate refresh token and store new hash', async () => {
      jest
        .spyOn(usersService, 'findUserByIdOrNull')
        .mockResolvedValue(mockUserEntity);
      mockCompare.mockResolvedValue(true);
      jest
        .spyOn(jwtService, 'signAsync')
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('brand-new-refresh-token');
      mockHash.mockResolvedValue('hash-of-brand-new-token');
      const updateUserSpy = jest.spyOn(usersService, 'updateUser');
      updateUserSpy.mockResolvedValue(mockUserResponse);

      await service.refreshTokens(mockUserEntity.id, oldRawRefreshToken);

      expect(mockHash).toHaveBeenCalledWith('brand-new-refresh-token', 12);
      expect(updateUserSpy).toHaveBeenCalledWith(mockUserEntity.id, {
        refreshToken: 'hash-of-brand-new-token',
      });
    });

    it('AUTH-022: should propagate error when dependency throws', async () => {
      jest
        .spyOn(usersService, 'findUserByIdOrNull')
        .mockRejectedValue(new Error('DB timeout'));

      await expect(
        service.refreshTokens(mockUserEntity.id, oldRawRefreshToken),
      ).rejects.toThrow('DB timeout');
    });
  });

  // generate tokens
  describe('generateTokens', () => {
    it('AUTH-017: should sign access and refresh tokens using different secrets', async () => {
      const signAsyncSpy = jest.spyOn(jwtService, 'signAsync');
      signAsyncSpy
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await service.generateTokens(mockUserEntity.id, mockUserEntity.email);

      expect(signAsyncSpy).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.objectContaining({ secret: 'access-secret' }),
      );
      expect(signAsyncSpy).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        expect.objectContaining({ secret: 'refresh-secret' }),
      );
    });

    it('AUTH-024: should include correct sub and email in JWT payload', async () => {
      const signAsyncSpy = jest.spyOn(jwtService, 'signAsync');
      signAsyncSpy
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await service.generateTokens(mockUserEntity.id, mockUserEntity.email);

      expect(signAsyncSpy).toHaveBeenNthCalledWith(
        1,
        { sub: mockUserEntity.id, email: mockUserEntity.email },
        expect.anything(),
      );
      expect(signAsyncSpy).toHaveBeenNthCalledWith(
        2,
        { sub: mockUserEntity.id, email: mockUserEntity.email },
        expect.anything(),
      );
    });
  });

  // update refresh token hash
  describe('updateRefreshTokenHash', () => {
    it('AUTH-018: should hash refresh token before saving to database', async () => {
      const rawToken = 'raw-refresh-token-plaintext';
      mockHash.mockResolvedValue('hashed-value');
      const updateUserSpy = jest.spyOn(usersService, 'updateUser');
      updateUserSpy.mockResolvedValue(mockUserResponse);

      await service.updateRefreshTokenHash(mockUserEntity.id, rawToken);

      expect(mockHash).toHaveBeenCalledWith(rawToken, 12);
      expect(updateUserSpy).toHaveBeenCalledWith(mockUserEntity.id, {
        refreshToken: 'hashed-value',
      });
      expect(updateUserSpy).not.toHaveBeenCalledWith(mockUserEntity.id, {
        refreshToken: rawToken,
      });
    });

    it('AUTH-023: should propagate error when bcrypt.hash or updateUser throws', async () => {
      mockHash.mockRejectedValue(new Error('bcrypt internal error'));
      const updateUserSpy = jest.spyOn(usersService, 'updateUser');

      await expect(
        service.updateRefreshTokenHash(mockUserEntity.id, 'any-token'),
      ).rejects.toThrow('bcrypt internal error');

      expect(updateUserSpy).not.toHaveBeenCalled();
    });
  });
});
