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
}
