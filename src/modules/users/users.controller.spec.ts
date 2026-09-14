import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';

const mockGuard = { canActivate: jest.fn(() => true) };

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    createUser: jest.fn(),
    updateUser: jest.fn(),
    softDeleteUser: jest.fn(),
    restoreUser: jest.fn(),
    hardDeleteUser: jest.fn(),
    findAllUsers: jest.fn(),
    lockUser: jest.fn(),
    unlockUser: jest.fn(),
    findUserById: jest.fn(),
    findUserByEmail: jest.fn(),
    becomeToSeller: jest.fn(),
  };

  const userId = 'user-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createUser', () => {
    it('should call usersService.createUser with the dto', async () => {
      const dto = {
        email: 'user@example.com',
        password: 'Password123',
      } as CreateUserDto;
      const expected = { id: userId, email: dto.email } as UserResponseDto;
      mockUsersService.createUser.mockResolvedValue(expected);

      const result = await controller.createUser(dto);

      expect(mockUsersService.createUser).toHaveBeenCalledWith(dto);
      expect(result).toBe(expected);
    });
  });

  describe('updateUser', () => {
    it('should call usersService.updateUser with id and dto', async () => {
      const dto = { fullName: 'Updated Name' } as UpdateUserDto;
      const expected = {
        id: userId,
        fullName: 'Updated Name',
      } as UserResponseDto;
      mockUsersService.updateUser.mockResolvedValue(expected);

      const result = await controller.updateUser(userId, dto);

      expect(mockUsersService.updateUser).toHaveBeenCalledWith(userId, dto);
      expect(result).toBe(expected);
    });
  });

  describe('softDeleteUser', () => {
    it('should call usersService.softDeleteUser with the id', async () => {
      const expected = { id: userId, deletedAt: new Date() };
      mockUsersService.softDeleteUser.mockResolvedValue(expected);

      const result = await controller.softDeleteUser(userId);

      expect(mockUsersService.softDeleteUser).toHaveBeenCalledWith(userId);
      expect(result).toBe(expected);
    });
  });

  describe('restoreUser', () => {
    it('should call usersService.restoreUser with the id', async () => {
      const expected = { id: userId, deletedAt: null };
      mockUsersService.restoreUser.mockResolvedValue(expected);

      const result = await controller.restoreUser(userId);

      expect(mockUsersService.restoreUser).toHaveBeenCalledWith(userId);
      expect(result).toBe(expected);
    });
  });

  describe('hardDeleteUser', () => {
    it('should call usersService.hardDeleteUser with the id', async () => {
      const expected = { success: true };
      mockUsersService.hardDeleteUser.mockResolvedValue(expected);

      const result = await controller.hardDeleteUser(userId);

      expect(mockUsersService.hardDeleteUser).toHaveBeenCalledWith(userId);
      expect(result).toBe(expected);
    });
  });

  describe('findAllUsers', () => {
    it('should call usersService.findAllUsers with the pagination dto', () => {
      const query = { page: 1, limit: 20 };
      const expected = { data: [], total: 0 };
      mockUsersService.findAllUsers.mockReturnValue(expected);

      const result = controller.findAllUsers(query);

      expect(mockUsersService.findAllUsers).toHaveBeenCalledWith(query);
      expect(result).toBe(expected);
    });
  });

  describe('lockUser', () => {
    it('should call usersService.lockUser with the id', async () => {
      const expected = { id: userId, isLocked: true } as UserResponseDto;
      mockUsersService.lockUser.mockResolvedValue(expected);

      const result = await controller.lockUser(userId);

      expect(mockUsersService.lockUser).toHaveBeenCalledWith(userId);
      expect(result).toBe(expected);
    });
  });

  describe('unlockUser', () => {
    it('should call usersService.unlockUser with the id', async () => {
      const expected = { id: userId, isLocked: false } as UserResponseDto;
      mockUsersService.unlockUser.mockResolvedValue(expected);

      const result = await controller.unlockUser(userId);

      expect(mockUsersService.unlockUser).toHaveBeenCalledWith(userId);
      expect(result).toBe(expected);
    });
  });

  describe('findUserById', () => {
    it('should call usersService.findUserById with the id', async () => {
      const expected = { id: userId } as UserResponseDto;
      mockUsersService.findUserById.mockResolvedValue(expected);

      const result = await controller.findUserById(userId);

      expect(mockUsersService.findUserById).toHaveBeenCalledWith(userId);
      expect(result).toBe(expected);
    });
  });

  describe('findUserByEmail', () => {
    it('should call usersService.findUserByEmail with the email', () => {
      const email = 'user@example.com';
      const expected = { id: userId, email };
      mockUsersService.findUserByEmail.mockReturnValue(expected);

      const result = controller.findUserByEmail(email);

      expect(mockUsersService.findUserByEmail).toHaveBeenCalledWith(email);
      expect(result).toBe(expected);
    });
  });

  describe('findUserByEmailOrNull', () => {
    it('should call usersService.findUserByEmail with the email', () => {
      const email = 'user@example.com';
      mockUsersService.findUserByEmail.mockReturnValue(null);

      const result = controller.findUserByEmailOrNull(email);

      expect(mockUsersService.findUserByEmail).toHaveBeenCalledWith(email);
      expect(result).toBeNull();
    });
  });

  describe('becomeToSeller', () => {
    it('should call usersService.becomeToSeller with the current user id', async () => {
      const expected = { id: userId, role: 'seller' } as UserResponseDto;
      mockUsersService.becomeToSeller.mockResolvedValue(expected);

      const result = await controller.becomeToSeller(userId);

      expect(mockUsersService.becomeToSeller).toHaveBeenCalledWith(userId);
      expect(result).toBe(expected);
    });
  });
});
