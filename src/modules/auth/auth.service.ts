import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dtos/register.dto';
import { UsersService } from '../users/users.service';
import { UserResponseDto } from '../users/dtos/user-response.dto';
import { LoginDto } from './dtos/login.dto';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { StringValue } from 'ms';
import { TokenPair } from './interfaces/token-pair.interface';
import { AuthResponse } from './interfaces/auth-response.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private jwtService: JwtService,
    private ConfigService: ConfigService,
  ) {}

  // register
  async register(registerDto: RegisterDto): Promise<UserResponseDto> {
    const existingUser = await this.usersService.findUserByEmailOrNull(
      registerDto.email,
    );

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    return this.usersService.createUser({
      ...registerDto,
    });
  }

  // login
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    const user = await this.usersService.findUserByEmailOrNull(email);
    if (!user) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      user: plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      }),
      ...tokens,
    };
  }

  // logout
  async logout(userId: string) {
    await this.usersService.updateUser(userId, { refreshToken: null });
  }

  // refresh tokens
  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<TokenPair> {
    const user = await this.usersService.findUserByIdOrNull(userId);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access Denied');
    }
    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Access Denied');
    }
    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
    return tokens;
  }

  // generate tokens: helper function to generate access and refresh tokens
  async generateTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: this.ConfigService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
          expiresIn: this.ConfigService.get<string>(
            'JWT_ACCESS_TOKEN_EXPIRATION_TIME',
          ) as StringValue,
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: this.ConfigService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
          expiresIn: this.ConfigService.get<string>(
            'JWT_REFRESH_TOKEN_EXPIRATION_TIME',
          ) as StringValue,
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  // update refresh token
  async updateRefreshTokenHash(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
    await this.usersService.updateUser(userId, {
      refreshToken: hashedRefreshToken,
    });
  }
}
