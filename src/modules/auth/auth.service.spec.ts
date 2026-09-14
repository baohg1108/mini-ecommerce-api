import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '../../common/enums/user-status.enum';
import { RegisterDto } from './dtos/register.dto';

describe('AuthService (Pure Service Unit Tests)', () => {
  let authService: AuthService;
  let usersService: UsersService;

  const mockUsersService = {
    findUserByEmailOrNull: jest.fn(),
    findUserByIdOrNull: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_TOKEN_SECRET') return 'access-secret';
      if (key === 'JWT_REFRESH_TOKEN_SECRET') return 'refresh-secret';
      return '15m';
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      mockUsersService.findUserByEmailOrNull.mockResolvedValue(null);
      const createdUser = {
        id: '1',
        email: 'user@example.com',
        fullName: 'Bao Hoang',
      };
      mockUsersService.createUser.mockResolvedValue(createdUser);

      const dto: RegisterDto = {
        email: 'user@example.com',
        password: 'Password@123',
        fullName: 'Bao Hoang',
      };
      const result = await authService.register(dto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(usersService.createUser).toHaveBeenCalled();
      expect(result).toEqual(createdUser);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUsersService.findUserByEmailOrNull.mockResolvedValue({ id: '1' });
      const dto: RegisterDto = {
        email: 'user@example.com',
        password: 'Password@123',
        fullName: 'Bao Hoang',
      };

      await expect(authService.register(dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should return tokens when login successful', async () => {
      const hashedPassword = await bcrypt.hash('Password@123', 10);
      mockUsersService.findUserByEmailOrNull.mockResolvedValue({
        id: '1',
        email: 'user@example.com',
        passwordHash: hashedPassword,
        status: UserStatus.ACTIVE,
      });
      mockJwtService.signAsync.mockResolvedValue('token-mock');
      mockUsersService.updateUser.mockResolvedValue(null);

      const result = await authService.login({
        email: 'user@example.com',
        password: 'Password@123',
      });
      expect(result).toHaveProperty('accessToken');
    });

    it('should throw UnauthorizedException if email not found', async () => {
      mockUsersService.findUserByEmailOrNull.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'wrong@example.com',
          password: 'Password@123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password incorrect', async () => {
      const hashedPassword = await bcrypt.hash('Password@123', 10);
      mockUsersService.findUserByEmailOrNull.mockResolvedValue({
        id: '1',
        passwordHash: hashedPassword,
        status: UserStatus.ACTIVE,
      });

      await expect(
        authService.login({
          email: 'user@example.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is locked', async () => {
      const hashedPassword = await bcrypt.hash('Password@123', 10);
      mockUsersService.findUserByEmailOrNull.mockResolvedValue({
        id: '1',
        email: 'user@example.com',
        passwordHash: hashedPassword,
        status: UserStatus.LOCKED,
      });

      await expect(
        authService.login({
          email: 'user@example.com',
          password: 'Password@123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should clear refresh token on logout', async () => {
      mockUsersService.updateUser.mockResolvedValue(null);
      await authService.logout('1');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(usersService.updateUser).toHaveBeenCalledWith('1', {
        refreshToken: null,
      });
    });
  });

  describe('refreshTokens', () => {
    it('should successfully refresh tokens', async () => {
      const hashedToken = await bcrypt.hash('valid-refresh', 10);
      mockUsersService.findUserByIdOrNull.mockResolvedValue({
        id: '1',
        email: 'user@example.com',
        refreshToken: hashedToken,
        status: UserStatus.ACTIVE,
      });
      mockJwtService.signAsync.mockResolvedValue('new-token');
      mockUsersService.updateUser.mockResolvedValue(null);

      const result = await authService.refreshTokens('1', 'valid-refresh');
      expect(result).toHaveProperty('accessToken');
    });

    it('should throw UnauthorizedException if user not found or has no refresh token', async () => {
      mockUsersService.findUserByIdOrNull.mockResolvedValue(null);

      await expect(
        authService.refreshTokens('1', 'some-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token invalid', async () => {
      const hashedToken = await bcrypt.hash('valid-refresh', 10);
      mockUsersService.findUserByIdOrNull.mockResolvedValue({
        id: '1',
        refreshToken: hashedToken,
        status: UserStatus.ACTIVE,
      });

      await expect(
        authService.refreshTokens('1', 'wrong-refresh'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is locked on refresh', async () => {
      mockUsersService.findUserByIdOrNull.mockResolvedValue({
        id: '1',
        refreshToken: 'hashed',
        status: UserStatus.LOCKED,
      });

      await expect(authService.refreshTokens('1', 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
