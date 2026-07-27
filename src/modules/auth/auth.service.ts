import { ConflictException, Injectable } from '@nestjs/common';
import { RegisterDto } from './dtos/register.dto';
import { UsersService } from '../users/users.service';
import { UserResponseDto } from '../users/dtos/user-response.dto';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async register(registerDto: RegisterDto): Promise<UserResponseDto> {
    const existingUser = await this.usersService.findUserByEmailOrNull(
      registerDto.email,
    );

    if (existingUser) {
      throw new ConflictException('User is already registered with this email');
    }

    return this.usersService.createUser({
      ...registerDto,
    });
  }
}
