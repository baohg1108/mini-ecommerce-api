import {
  Injectable,
  NotFoundException,
  ConflictException,
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
import { RejectShopDto } from './dtos/reject-shop.dto';
import { SuspendedShopDto } from './dtos/suspended-shop.dto';

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(Shop) private readonly shopRepository: Repository<Shop>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async registerShop(
    userId: string,
    createShopDto: CreateShopDto,
  ): Promise<ShopResponseDto> {
    // check if the user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // one seller has only one shop
    const existingShop = await this.shopRepository.findOne({
      where: { userId },
    });
    if (existingShop) {
      throw new ConflictException('Shop already exists for this user');
    }

    // auto generate slug from shop name
    const slug = await this.generateUniqueSlug(createShopDto.shopName);

    // create the new shop
    const newShop = this.shopRepository.create({
      ...createShopDto,
      userId,
      slug,
    });

    const savedShop = await this.shopRepository.save(newShop);
    return plainToInstance(ShopResponseDto, savedShop);
  }

  async getMyShop(userId: string): Promise<ShopResponseDto> {
    const shop = await this.shopRepository.findOne({ where: { userId } });
    if (!shop) {
      throw new NotFoundException('Shop not found for this user');
    }
    return plainToInstance(ShopResponseDto, shop);
  }

  private async generateUniqueSlug(shopName: string): Promise<string> {
    const base = slugify(shopName);
    let slug = base;

    while (await this.shopRepository.findOne({ where: { slug } })) {
      slug = `${base}-${randomSuffix()}`;
    }

    return slug;
  }

  // approve shop
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

  // reject shop
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

  // suspend shop
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
}
