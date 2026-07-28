import { Controller, Post, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { UserResponseDto } from '../users/dtos/user-response.dto';
import { LoginDto } from './dtos/login.dto';
import { AuthResponse } from './interfaces/auth-response.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // register
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto): Promise<UserResponseDto> {
    return this.authService.register(registerDto);
  }

  // login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  // logout
  // @Post('logout')
  // @HttpCode(HttpStatus.OK)
  // async logout(@CurrentUserId() userId: number) {
  //   return this.authService.logout(userId);
  // }

  // refresh token
  // @Public()
  // @UseGuards(RefreshTokenGuard)
  // @Post('refresh')
  // @HttpCode(HttpStatus.OK)
  // async refresh(
  //   @CurrentUserId() userId: number,
  //   @CurrentUser('refreshToken') refreshToken: string,
  // ) {
  //   return this.authService.refreshTokens(userId, refreshToken);
  // }

  // @Get('whoami')
  // whoAmI(@CurrentUser() user: JwtPayload) {
  //   return user;
  // }
}
