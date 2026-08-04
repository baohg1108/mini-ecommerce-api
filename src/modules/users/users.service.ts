import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { AdminUserResponseDto } from './dtos/admin-user-response.dto';
import { PaginationQueryDto } from './../../common/dtos/pagination-query.dto';
import {
  buildPaginationMeta,
  getOffset,
} from './../../common/utils/pagination.util';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  // create user
  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { password, ...userData } = createUserDto;
    const SALT_ROUNDS = 12;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = this.userRepository.create({
      ...userData,
      passwordHash,
    });
    const savedUser = await this.userRepository.save(user);

    return plainToInstance(UserResponseDto, savedUser, {
      excludeExtraneousValues: true,
    });
  }

  // update user
  // i can use: [preload] - [postgres returning] - [merge + save]
  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    this.userRepository.merge(user, updateUserDto);

    const updatedUser = await this.userRepository.save(user);

    return plainToInstance(UserResponseDto, updatedUser, {
      excludeExtraneousValues: true,
    });
  }

  // soft delete user
  async softDeleteUser(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    user.deletedAt = new Date();
    await this.userRepository.save(user);
  }

  // restore user
  async restoreUser(id: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    user.deletedAt = null;
    await this.userRepository.save(user);
  }

  // hard delete user
  // @IsPublic()
  async hardDeleteUser(id: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    await this.userRepository.remove(user);
  }

  // find all users
  async findAllUsers(paginationQuery: PaginationQueryDto) {
    const { page, limit } = paginationQuery;
    const offset = getOffset(page, limit);

    const [users, totalItems] = await this.userRepository.findAndCount({
      withDeleted: true,
      skip: offset,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const data = users.map((user) =>
      plainToInstance(AdminUserResponseDto, user, {
        excludeExtraneousValues: true,
      }),
    );

    return {
      data,
      pagination: buildPaginationMeta(page, limit, totalItems),
    };
  }

  // find user by id
  async findUserById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  // find user by id (raw entity)
  async findUserByIdOrNull(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  // find user by email
  async findUserByEmail(email: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  // find user by email — check is exist
  async findUserByEmailOrNull(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  // become to seller
  async becomeToSeller(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    // i can write if (user.role !== UserRole.CUSTOMER) but i want to be more specific and clear
    // alow-list
    if (user.role === UserRole.SELLER) {
      throw new ConflictException(`User with id ${id} is already a seller`);
    }

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        `Admin accounts cannot be converted into seller accounts`,
      );
    }

    user.role = UserRole.SELLER;
    const updatedUser = await this.userRepository.save(user);

    return plainToInstance(UserResponseDto, updatedUser, {
      excludeExtraneousValues: true,
    });
  }
}
