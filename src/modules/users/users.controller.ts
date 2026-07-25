import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Get,
  Patch,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { AdminUserResponseDto } from './dtos/admin-user-response.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // create user
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.createUser(createUserDto);
  }

  // update user
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateUser(id, updateUserDto);
  }

  // soft delete user
  @Patch(':id/soft-delete')
  @HttpCode(HttpStatus.OK)
  async softDeleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.softDeleteUser(id);
  }

  // restore user
  @Patch(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restoreUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.restoreUser(id);
  }

  // hard delete user
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async hardDeleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.hardDeleteUser(id);
  }

  // find all
  @Get()
  @HttpCode(HttpStatus.OK)
  findAllUsers(): Promise<AdminUserResponseDto[]> {
    return this.usersService.findAllUsers();
  }

  // find user by id
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findUserById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return this.usersService.findUserById(id);
  }

  // find user by email
  @Get('email/:email')
  @HttpCode(HttpStatus.OK)
  findUserByEmail(@Param('email') email: string) {
    return this.usersService.findUserByEmail(email);
  }
}
