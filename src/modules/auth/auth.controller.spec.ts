import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { UserResponseDto } from '../users/dtos/user-response.dto';
import { AuthResponse } from './interfaces/auth-response.interface';
import { TokenPair } from './interfaces/token-pair.interface';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RefreshTokenGuard } from '../../common/guards/refresh-token.guard';

const mockGuard = { canActivate: jest.fn(() => true) };

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    refreshTokens: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockGuard)
      .overrideGuard(RefreshTokenGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register with the dto and return its result', async () => {
      const dto = {
        email: 'user@example.com',
        password: 'Password123',
        fullName: 'Nguyen Van A',
      };
      const expected = { id: 'user-1', email: dto.email } as UserResponseDto;
      mockAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
      expect(result).toBe(expected);
    });
  });

  describe('login', () => {
    it('should call authService.login with the dto and return the auth response', async () => {
      const dto = {
        email: 'user@example.com',
        password: 'Password123',
      };
      const expected = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      } as AuthResponse;
      mockAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(dto);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result).toBe(expected);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with the current user id', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout('user-1');

      expect(mockAuthService.logout).toHaveBeenCalledWith('user-1');
      expect(result).toBeUndefined();
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshTokens with user id and refresh token', async () => {
      const expected: TokenPair = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      mockAuthService.refreshTokens.mockResolvedValue(expected);

      const result = await controller.refresh('user-1', 'old-refresh-token');

      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
        'user-1',
        'old-refresh-token',
      );
      expect(result).toBe(expected);
    });
  });

  describe('whoAmI', () => {
    it('should return whatever the CurrentUser decorator resolved, without calling the service', () => {
      const user = { sub: 'user-1', email: 'user@example.com' };

      const result = controller.whoAmI(user);

      expect(result).toBe(user);
      expect(mockAuthService.register).not.toHaveBeenCalled();
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });
  });
});
