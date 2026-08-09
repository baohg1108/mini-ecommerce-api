import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop } from './entities/shop.entity';
import { User } from '../users/entities/user.entity';
import { CreateShopDto } from './dtos/create-shop.dto';
import { ShopResponseDto } from './dtos/shop-response.dto';
import { slugify, randomSuffix } from '../../common/utils/slugify';
import { ShopStatus } from '../../common/enums/shop-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { RejectShopDto } from './dtos/reject-shop.dto';
import { SuspendedShopDto } from './dtos/suspended-shop.dto';
import { UpdateShopDto } from './dtos/update-shop.dto';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { PublicShopResponseDto } from './dtos/public-shop-response.dto';

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(Shop) private readonly shopRepository: Repository<Shop>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  // FR-06: register shop
  async registerShop(
    userId: string,
    createShopDto: CreateShopDto,
  ): Promise<ShopResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const shopName = createShopDto.shopName?.trim();

    const existingShop = await this.shopRepository.findOne({
      where: { userId },
    });

    if (existingShop) {
      if (existingShop.status !== ShopStatus.REJECTED) {
        throw new ConflictException('Shop already exists for this user');
      }

      const slug = await this.generateUniqueSlug(shopName, existingShop.id);

      Object.assign(existingShop, createShopDto, {
        shopName,
        slug,
        status: ShopStatus.PENDING,
        rejectionReason: null,
        rejectedAt: null,
        rejectedBy: null,
      });

      const resubmittedShop = await this.shopRepository.save(existingShop);
      await this.promoteToSellerIfNeeded(user);
      return plainToInstance(ShopResponseDto, resubmittedShop);
    }

    const slug = await this.generateUniqueSlug(shopName);

    const newShop = this.shopRepository.create({
      ...createShopDto,
      shopName,
      userId,
      slug,
    });

    const savedShop = await this.shopRepository.save(newShop);
    await this.promoteToSellerIfNeeded(user);
    return plainToInstance(ShopResponseDto, savedShop);
  }

  // get my shop
  async getMyShop(userId: string): Promise<ShopResponseDto> {
    const shop = await this.shopRepository.findOne({ where: { userId } });
    if (!shop) {
      throw new NotFoundException('Shop not found for this user');
    }
    return plainToInstance(ShopResponseDto, shop);
  }

  // FR-18 + BR-01: get public shop by id
  async getPublicShopById(id: string): Promise<PublicShopResponseDto> {
    const shop = await this.shopRepository.findOne({ where: { id } });
    if (shop?.status !== ShopStatus.ACTIVE) {
      throw new NotFoundException('Shop not found or no longer active');
    }
    return new PublicShopResponseDto(shop);
  }

  // BR-01 + BR-08:
  async ensureShopIsActive(shopId: string): Promise<Shop> {
    const shop = await this.shopRepository.findOne({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    if (shop.status !== ShopStatus.ACTIVE) {
      throw new ForbiddenException(
        `This action requires an active shop. Current shop status: ${shop.status}`,
      );
    }
    return shop;
  }

  private async generateUniqueSlug(
    shopName: string,
    excludeShopId?: string,
  ): Promise<string> {
    const base = slugify(shopName);
    let slug = base;

    while (true) {
      const conflict = await this.shopRepository.findOne({ where: { slug } });
      if (!conflict || conflict.id === excludeShopId) {
        break;
      }
      slug = `${base}-${randomSuffix()}`;
    }

    return slug;
  }

  // FR-06: update role from CUSTOMER to SELLER if needed
  private async promoteToSellerIfNeeded(user: User): Promise<void> {
    if (user.role === UserRole.CUSTOMER) {
      user.role = UserRole.SELLER;
      await this.userRepository.save(user);
    }
  }

  // FR-07: approve shop
  async approveShop(id: string, userId: string): Promise<ShopResponseDto> {
    const shop = await this.shopRepository.findOne({ where: { id } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.status !== ShopStatus.PENDING) {
      throw new ConflictException('Only pending shops can be approved');
    }

    shop.status = ShopStatus.ACTIVE;
    shop.approvedAt = new Date();
    shop.approvedBy = userId;
    shop.rejectionReason = null;
    shop.rejectedAt = null;
    shop.rejectedBy = null;
    shop.suspendedReason = null;
    shop.suspendedAt = null;
    shop.suspendedBy = null;

    const updatedShop = await this.shopRepository.save(shop);
    return plainToInstance(ShopResponseDto, updatedShop);
  }

  // FR-07: reject shop
  async rejectShop(
    id: string,
    userId: string,
    rejectShopDto: RejectShopDto,
  ): Promise<ShopResponseDto> {
    const shop = await this.shopRepository.findOne({ where: { id } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.status !== ShopStatus.PENDING) {
      throw new ConflictException('Only pending shops can be rejected');
    }

    shop.status = ShopStatus.REJECTED;
    shop.rejectionReason = rejectShopDto.reason;
    shop.rejectedAt = new Date();
    shop.rejectedBy = userId;
    shop.approvedBy = null;
    shop.approvedAt = null;
    shop.suspendedReason = null;
    shop.suspendedAt = null;
    shop.suspendedBy = null;

    const updatedShop = await this.shopRepository.save(shop);
    return plainToInstance(ShopResponseDto, updatedShop);
  }

  // FR-09: suspend shop
  async suspendShop(
    shopId: string,
    adminId: string,
    suspendedShopDto: SuspendedShopDto,
  ): Promise<ShopResponseDto> {
    const shop = await this.shopRepository.findOne({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.status !== ShopStatus.ACTIVE) {
      throw new ConflictException('Only active shops can be suspended');
    }

    shop.status = ShopStatus.SUSPENDED;
    shop.suspendedReason = suspendedShopDto.reasonSuspended;
    shop.suspendedBy = adminId;
    shop.suspendedAt = new Date();
    shop.rejectionReason = null;
    shop.rejectedAt = null;
    shop.rejectedBy = null;

    const updatedShop = await this.shopRepository.save(shop);
    return plainToInstance(ShopResponseDto, updatedShop);
  }

  // FR-09: un-suspend shop
  async unlockShop(shopId: string, userId: string): Promise<ShopResponseDto> {
    const shop = await this.shopRepository.findOne({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.status !== ShopStatus.SUSPENDED) {
      throw new ConflictException('Only suspended shops can be unlocked');
    }

    shop.status = ShopStatus.ACTIVE;
    shop.suspendedReason = null;
    shop.suspendedAt = null;
    shop.suspendedBy = null;
    shop.approvedBy = userId;

    const updatedShop = await this.shopRepository.save(shop);
    return plainToInstance(ShopResponseDto, updatedShop);
  }

  // FR-08: update shop
  async updateShop(
    userId: string,
    updateShopDto: UpdateShopDto,
  ): Promise<ShopResponseDto> {
    const shop = await this.shopRepository.findOne({ where: { userId } });
    if (!shop) {
      throw new NotFoundException('Shop not found for this user');
    }

    const sanitizedDto: UpdateShopDto = { ...updateShopDto };
    if (typeof sanitizedDto.shopName === 'string') {
      sanitizedDto.shopName = sanitizedDto.shopName.trim();
    }

    Object.assign(shop, sanitizedDto);

    const updatedShop = await this.shopRepository.save(shop);
    return plainToInstance(ShopResponseDto, updatedShop);
  }

  // get all shops
  async getAllShops(status?: ShopStatus): Promise<ShopResponseDto[]> {
    const shops = await this.shopRepository.find(
      status ? { where: { status } } : {},
    );
    return shops.map((shop) => plainToInstance(ShopResponseDto, shop));
  }

  // get shop by id
  async getShopById(id: string): Promise<ShopResponseDto> {
    const shop = await this.shopRepository.findOne({ where: { id } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    return plainToInstance(ShopResponseDto, shop);
  }

  // FR-18: public active shops
  async getAllActiveShops(
    query: PaginationQueryDto,
  ): Promise<{ data: PublicShopResponseDto[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [shops, total] = await this.shopRepository.findAndCount({
      where: { status: ShopStatus.ACTIVE },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: shops.map((shop) => new PublicShopResponseDto(shop)),
      total,
    };
  }
}
