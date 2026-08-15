import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { LogoutDto } from './dtos/logout.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { RolesGuard } from '../../common/guards/role.guard';
import { UserRole } from '../../common/enums/user-role.enum';

jest.mock('bcrypt');

describe('RegisterDto', () => {
  const validPayload = {
    email: 'a@test.com',
    password: 'Abc@1234',
    fullName: 'Nguyen Van A',
  };

  it('AUTH-UNIT-001: should pass validation with valid data', async () => {
    const dto = plainToInstance(RegisterDto, validPayload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('AUTH-UNIT-002: should fail when email format is invalid', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validPayload,
      email: 'invalid-email',
    });
    const errors = await validate(dto);
    const emailError = errors.find((e) => e.property === 'email');
    expect(emailError).toBeDefined();
    expect(emailError?.constraints).toHaveProperty('isEmail');
  });

  it('AUTH-UNIT-003: should fail when password is shorter than 8 characters', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validPayload,
      password: 'Ab@1',
    });
    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
    expect(passwordError?.constraints).toHaveProperty('minLength');
  });

  it('AUTH-UNIT-004: should fail when password is longer than 100 characters', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validPayload,
      password: 'Aa1@' + 'x'.repeat(100),
    });
    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
    expect(passwordError?.constraints).toHaveProperty('maxLength');
  });

  it('AUTH-UNIT-005: should fail when password is missing a special character', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validPayload,
      password: 'Abcd1234',
    });
    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
    expect(passwordError?.constraints).toHaveProperty('matches');
  });

  it('AUTH-UNIT-006: should fail when password is missing an uppercase letter', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validPayload,
      password: 'abc@1234',
    });
    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
    expect(passwordError?.constraints).toHaveProperty('matches');
  });

  it('AUTH-UNIT-007: should fail when password is missing a lowercase letter', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validPayload,
      password: 'ABC@1234',
    });
    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
    expect(passwordError?.constraints).toHaveProperty('matches');
  });

  it('AUTH-UNIT-008: should fail when password is missing a digit', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validPayload,
      password: 'Abcd@efg',
    });
    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
    expect(passwordError?.constraints).toHaveProperty('matches');
  });

  it('AUTH-UNIT-009: should fail when fullName is shorter than 2 characters', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validPayload,
      fullName: 'A',
    });
    const errors = await validate(dto);
    const fullNameError = errors.find((e) => e.property === 'fullName');
    expect(fullNameError).toBeDefined();
    expect(fullNameError?.constraints).toHaveProperty('minLength');
  });

  it('AUTH-UNIT-010: should fail when fullName is longer than 100 characters', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validPayload,
      fullName: 'x'.repeat(101),
    });
    const errors = await validate(dto);
    const fullNameError = errors.find((e) => e.property === 'fullName');
    expect(fullNameError).toBeDefined();
    expect(fullNameError?.constraints).toHaveProperty('maxLength');
  });
});

describe('LoginDto', () => {
  it('AUTH-UNIT-011: should pass validation with valid data', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'a@test.com',
      password: 'Abc@1234',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('AUTH-UNIT-012: should fail when email format is invalid', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'not-an-email',
      password: 'Abc@1234',
    });
    const errors = await validate(dto);
    const emailError = errors.find((e) => e.property === 'email');
    expect(emailError).toBeDefined();
    expect(emailError?.constraints).toHaveProperty('isEmail');
  });

  it('AUTH-UNIT-013: should fail when password is missing', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'a@test.com',
    });
    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
    expect(passwordError?.constraints).toHaveProperty('isString');
  });
});

describe('LogoutDto', () => {
  it('AUTH-UNIT-014: should pass validation when userId is a valid UUID', async () => {
    const dto = plainToInstance(LogoutDto, {
      userId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('AUTH-UNIT-015: should fail when userId is not a valid UUID', async () => {
    const dto = plainToInstance(LogoutDto, {
      userId: 'abc123',
    });
    const errors = await validate(dto);
    const userIdError = errors.find((e) => e.property === 'userId');
    expect(userIdError).toBeDefined();
    expect(userIdError?.constraints).toHaveProperty('isUuid');
  });
});

describe('RefreshTokenDto', () => {
  it('AUTH-UNIT-016: should pass validation with valid data', async () => {
    const dto = plainToInstance(RefreshTokenDto, {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('AUTH-UNIT-017: should fail when refreshToken is missing', async () => {
    const dto = plainToInstance(RefreshTokenDto, {
      userId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);
    const tokenError = errors.find((e) => e.property === 'refreshToken');
    expect(tokenError).toBeDefined();
    expect(tokenError?.constraints).toHaveProperty('isString');
  });

  it('AUTH-UNIT-018: should fail when userId is not a valid UUID', async () => {
    const dto = plainToInstance(RefreshTokenDto, {
      userId: '12345',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
    });
    const errors = await validate(dto);
    const userIdError = errors.find((e) => e.property === 'userId');
    expect(userIdError).toBeDefined();
    expect(userIdError?.constraints).toHaveProperty('isUuid');
  });
});

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'existing@test.com',
    passwordHash: 'hashed-password',
    fullName: 'Existing User',
    refreshToken: 'hashed-refresh-token',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findUserByEmailOrNull: jest.fn(),
            findUserByIdOrNull: jest.fn(),
            createUser: jest.fn(),
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
              const config: Record<string, string> = {
                JWT_ACCESS_TOKEN_SECRET: 'access-secret',
                JWT_ACCESS_TOKEN_EXPIRATION_TIME: '15m',
                JWT_REFRESH_TOKEN_SECRET: 'refresh-secret',
                JWT_REFRESH_TOKEN_EXPIRATION_TIME: '7d',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register()', () => {
    const registerDto: RegisterDto = {
      email: 'NewUser@Test.com',
      password: 'Abc@1234',
      fullName: 'New User',
    };

    it('AUTH-UNIT-019: should create a user successfully when the email does not exist', async () => {
      usersService.findUserByEmailOrNull.mockResolvedValue(null);
      usersService.createUser.mockResolvedValue({
        id: 'new-user-id',
        email: 'newuser@test.com',
        fullName: 'New User',
      } as any);

      const result = await authService.register(registerDto);

      expect(usersService.findUserByEmailOrNull).toHaveBeenCalledWith(
        'newuser@test.com',
      );
      expect(usersService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@test.com',
          fullName: 'New User',
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ email: 'newuser@test.com' }),
      );
    });

    it('AUTH-UNIT-020: should throw ConflictException when the email already exists', async () => {
      usersService.findUserByEmailOrNull.mockResolvedValue(mockUser as any);

      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(authService.register(registerDto)).rejects.toThrow(
        'Email already exists',
      );
      expect(usersService.createUser).not.toHaveBeenCalled();
    });

    it('AUTH-UNIT-021: should normalize the email before persisting it', async () => {
      usersService.findUserByEmailOrNull.mockResolvedValue(null);
      usersService.createUser.mockResolvedValue({} as any);

      await authService.register({
        ...registerDto,
        email: 'TEST@Test.com',
      });

      expect(usersService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@test.com' }),
      );
    });
  });

  describe('login()', () => {
    const loginDto: LoginDto = {
      email: 'existing@test.com',
      password: 'Abc@1234',
    };

    beforeEach(() => {
      jwtService.signAsync
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');
    });

    it('AUTH-UNIT-022: should log in successfully and return an AuthResponse', async () => {
      usersService.findUserByEmailOrNull.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-refresh-token');

      const result = await authService.login(loginDto);

      expect(result).toEqual(
        expect.objectContaining({
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        }),
      );
      expect(result.user).toBeDefined();
      expect(usersService.updateUser).toHaveBeenCalledTimes(1);
      expect(usersService.updateUser).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ refreshToken: expect.any(String) }),
      );
    });

    it('AUTH-UNIT-023: should throw UnauthorizedException when the user is not found', async () => {
      usersService.findUserByEmailOrNull.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.login(loginDto)).rejects.toThrow(
        'Email or password is incorrect',
      );
    });

    it('AUTH-UNIT-024: should throw UnauthorizedException when the password is incorrect', async () => {
      usersService.findUserByEmailOrNull.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.login(loginDto)).rejects.toThrow(
        'Email or password is incorrect',
      );
    });
  });

  describe('logout()', () => {
    it('AUTH-UNIT-026: should set the refresh token to null', async () => {
      usersService.updateUser.mockResolvedValue(undefined as any);

      await authService.logout(mockUser.id);

      expect(usersService.updateUser).toHaveBeenCalledWith(mockUser.id, {
        refreshToken: null,
      });
    });
  });

  describe('refreshTokens()', () => {
    const refreshToken = 'valid-refresh-token';

    beforeEach(() => {
      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
    });

    it('AUTH-UNIT-027: should return a new TokenPair when the refresh token is valid', async () => {
      usersService.findUserByIdOrNull.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-refresh-token');

      const result = await authService.refreshTokens(mockUser.id, refreshToken);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(usersService.updateUser).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ refreshToken: expect.any(String) }),
      );
    });

    it('AUTH-UNIT-028: should throw UnauthorizedException when the user does not exist', async () => {
      usersService.findUserByIdOrNull.mockResolvedValue(null);

      await expect(
        authService.refreshTokens(mockUser.id, refreshToken),
      ).rejects.toThrow(new UnauthorizedException('Access Denied'));
    });

    it('AUTH-UNIT-029: should throw UnauthorizedException when user.refreshToken is null', async () => {
      usersService.findUserByIdOrNull.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      } as any);

      await expect(
        authService.refreshTokens(mockUser.id, refreshToken),
      ).rejects.toThrow(new UnauthorizedException('Access Denied'));
    });

    it('AUTH-UNIT-030: should throw UnauthorizedException when the token does not match the stored hash (anti-reuse)', async () => {
      usersService.findUserByIdOrNull.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.refreshTokens(mockUser.id, 'stale-refresh-token'),
      ).rejects.toThrow(new UnauthorizedException('Access Denied'));
    });
  });

  describe('generateTokens()', () => {
    it('AUTH-UNIT-031: should sign the access and refresh tokens with distinct secrets/expirations', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await authService.generateTokens(
        mockUser.id,
        mockUser.email,
      );

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        { sub: mockUser.id, email: mockUser.email },
        expect.objectContaining({
          secret: 'access-secret',
          expiresIn: '15m',
        }),
      );
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        { sub: mockUser.id, email: mockUser.email },
        expect.objectContaining({
          secret: 'refresh-secret',
          expiresIn: '7d',
        }),
      );
    });
  });

  describe('updateRefreshTokenHash()', () => {
    it('AUTH-UNIT-032: should hash the token with bcrypt before saving it', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token-value');

      await authService.updateRefreshTokenHash(mockUser.id, 'plain-jwt-token');

      expect(bcrypt.hash).toHaveBeenCalledWith('plain-jwt-token', 12);
      expect(usersService.updateUser).toHaveBeenCalledWith(mockUser.id, {
        refreshToken: 'hashed-token-value',
      });
      expect(usersService.updateUser).not.toHaveBeenCalledWith(mockUser.id, {
        refreshToken: 'plain-jwt-token',
      });
    });
  });
});

describe('AccessTokenGuard', () => {
  let guard: AccessTokenGuard;
  let reflector: jest.Mocked<Reflector>;

  const passportBaseProto = Object.getPrototypeOf(AccessTokenGuard.prototype);

  const createMockContext = (): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new AccessTokenGuard(reflector);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('AUTH-UNIT-033: should return true immediately for a route marked @IsPublic()', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const superCanActivateSpy = jest.spyOn(passportBaseProto, 'canActivate');

    const context = createMockContext();
    const result = guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    expect(result).toBe(true);
    expect(superCanActivateSpy).not.toHaveBeenCalled();
  });

  it('AUTH-UNIT-034: should delegate to super.canActivate() (Passport "jwt") when the route is not public', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const superCanActivateSpy = jest
      .spyOn(passportBaseProto, 'canActivate')
      .mockReturnValue(true);

    const context = createMockContext();
    const result = guard.canActivate(context);

    expect(superCanActivateSpy).toHaveBeenCalledWith(context);
    expect(result).toBe(true);
  });
});

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;
  let usersService: jest.Mocked<UsersService>;

  const createMockContext = (userId = 'user-uuid-1'): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { sub: userId, email: 'user@test.com' },
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    usersService = {
      findUserById: jest.fn(),
    };
    guard = new RolesGuard(reflector, usersService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('AUTH-UNIT-036: should return true when the route does not require any specific role', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(usersService.findUserById).not.toHaveBeenCalled();
  });

  it('AUTH-UNIT-037: should return true when the user has the required role', async () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    usersService.findUserById.mockResolvedValue({
      id: 'user-uuid-1',
      role: UserRole.ADMIN,
    } as any);

    const result = await guard.canActivate(createMockContext());

    expect(result).toBe(true);
  });

  it('AUTH-UNIT-038: should return false when the user does not have the required role', async () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    usersService.findUserById.mockResolvedValue({
      id: 'user-uuid-1',
      role: UserRole.CUSTOMER,
    } as any);

    const result = await guard.canActivate(createMockContext());

    expect(result).toBe(false);
  });

  it('AUTH-UNIT-039: should return false when the user no longer exists in the database', async () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    usersService.findUserById.mockResolvedValue(null as any);

    const result = await guard.canActivate(createMockContext());

    expect(result).toBe(false);
  });
});
