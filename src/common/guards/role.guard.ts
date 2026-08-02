import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/role.decorator';
import { UserRole } from '../enums/user-role.enum';
import { UsersService } from '../../modules/users/users.service';

interface RequestWithUser extends Request {
  user: {
    sub: string;
    email: string;
    [key: string]: unknown;
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const currentUser = await this.usersService.findUserById(request.user.sub);

    if (!currentUser) {
      return false;
    }

    return requiredRoles.includes(currentUser.role);
  }
}
