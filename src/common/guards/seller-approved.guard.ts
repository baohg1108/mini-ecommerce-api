import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { Shop } from '../../modules/shops/entities/shop.entity';
import { ShopStatus } from '../enums/shop-status.enum';

interface AuthenticatedUser {
  id?: string;
  sub?: string;
  [key: string]: unknown;
}

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class SellerApprovedGuard implements CanActivate {
  constructor(
    @InjectRepository(Shop) private readonly shopRepository: Repository<Shop>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userId = request.user?.sub ?? request.user?.id;

    if (!userId) {
      throw new ForbiddenException('Seller account is required');
    }

    const shop = await this.shopRepository.findOne({ where: { userId } });

    if (!shop) {
      throw new ForbiddenException(
        'You do not have a shop registered. Please register a shop first',
      );
    }

    switch (shop.status) {
      case ShopStatus.ACTIVE:
        return true;

      // BR-08
      case ShopStatus.SUSPENDED:
        throw new ForbiddenException(
          'Your shop is suspended. Please contact Admin',
        );

      case ShopStatus.PENDING:
      case ShopStatus.REJECTED:
      default:
        // BR-01
        throw new ForbiddenException(
          'Your shop has not been approved by Admin',
        );
    }
  }
}
