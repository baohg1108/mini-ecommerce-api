import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  Get,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { UserResponseDto } from '../users/dtos/user-response.dto';
import { LoginDto } from './dtos/login.dto';
import { AuthResponse } from './interfaces/auth-response.interface';
import { IsPublic } from '../../common/decorators/public.decorator';
import { TokenPair } from './interfaces/token-pair.interface';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RefreshTokenGuard } from '../../common/guards/refresh-token.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // register
  @Post('register')
  @IsPublic()
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto): Promise<UserResponseDto> {
    return this.authService.register(registerDto);
  }

  // login
  @Post('login')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  // logout
  @Post('logout')
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUserId() userId: string): Promise<void> {
    return this.authService.logout(userId);
  }

  // refresh token
  // @IsPublic()
  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  @HttpCode(HttpStatus.OK)
  refresh(
    @CurrentUserId() userId: string,
    @CurrentUser('refreshToken') refreshToken: string,
  ): Promise<TokenPair> {
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @Get('whoami')
  @UseGuards(AccessTokenGuard)
  whoAmI(@CurrentUser() user: unknown) {
    return user;
  }
}
