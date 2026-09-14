import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { Shop } from '../../modules/shops/entities/shop.entity';
import { ShopStatus } from '../../common/enums/shop-status.enum';
import { Category } from '../../modules/categogies/entities/category.entity';
import { CategoryStatus } from '../../common/enums/category-status.enum';
import { Product } from '../../modules/products/entities/product.entity';
import { ProductStatus } from '../../common/enums/product-status.enum';
import { ProductVariant } from '../../modules/product-variant/entities/product-variant.entity';

@Injectable()
export class AdminSeedService {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
  ) {}

  async seed(): Promise<void> {
    const admins = [
      {
        email: 'admin1@example.com',
        fullName: 'Admin 1',
        password: 'Admin@123',
      },
      {
        email: 'admin2@example.com',
        fullName: 'Admin 2',
        password: 'Admin@123',
      },
      {
        email: 'admin3@example.com',
        fullName: 'Admin 3',
        password: 'Admin@123',
      },
    ];

    for (const admin of admins) {
      const exists = await this.userRepository.exists({
        where: { email: admin.email },
      });

      if (exists) {
        this.logger.log(`Admin already exists: ${admin.email}`);
        continue;
      }

      const passwordHash = await bcrypt.hash(admin.password, 12);

      await this.userRepository.save(
        this.userRepository.create({
          email: admin.email,
          passwordHash,
          fullName: admin.fullName,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        }),
      );

      this.logger.log(`Seeded admin: ${admin.email}`);
    }

    const seller = await this.ensureSeller();
    const shop = await this.ensureShop(seller);
    const category = await this.ensureCategory();
    await this.ensureProducts(shop, category);
  }

  private async ensureSeller(): Promise<User> {
    const email = 'seller@example.com';
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) return existing;

    const passwordHash = await bcrypt.hash('Seller@123', 12);
    return this.userRepository.save(
      this.userRepository.create({
        email,
        passwordHash,
        fullName: 'Demo Seller',
        role: UserRole.SELLER,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      }),
    );
  }

  private async ensureShop(seller: User): Promise<Shop> {
    const existing = await this.shopRepository.findOne({
      where: { userId: seller.id },
    });
    if (existing) {
      if (existing.status !== ShopStatus.ACTIVE) {
        existing.status = ShopStatus.ACTIVE;
        existing.approvedAt ??= new Date();
        return this.shopRepository.save(existing);
      }
      return existing;
    }

    return this.shopRepository.save(
      this.shopRepository.create({
        userId: seller.id,
        shopName: 'Everyday Goods',
        slug: 'everyday-goods',
        description: 'San pham gia dung va phu kien cho cuoc song hang ngay.',
        status: ShopStatus.ACTIVE,
        approvedAt: new Date(),
      }),
    );
  }

  private async ensureCategory(): Promise<Category> {
    const existing = await this.categoryRepository.findOne({
      where: { slug: 'do-gia-dung' },
    });
    if (existing) return existing;

    return this.categoryRepository.save(
      this.categoryRepository.create({
        name: 'Do gia dung',
        slug: 'do-gia-dung',
        status: CategoryStatus.ACTIVE,
        displayOrder: 1,
      }),
    );
  }

  private async ensureProducts(shop: Shop, category: Category): Promise<void> {
    const products = [
      {
        slug: 'binh-nuoc-inox-500ml',
        name: 'Binh nuoc inox 500ml',
        description: 'Binh nuoc inox gon nhe, phu hop mang theo moi ngay.',
        basePrice: 189000,
        variants: [
          { sku: 'BNI-500-BLACK', color: 'Den', price: 189000, stockQty: 30 },
          { sku: 'BNI-500-WHITE', color: 'Trang', price: 189000, stockQty: 24 },
        ],
      },
      {
        slug: 'tui-vai-canvas-da-nang',
        name: 'Tui vai canvas da nang',
        description: 'Tui vai ben, nhieu ngan, su dung cho di hoc va di lam.',
        basePrice: 249000,
        variants: [
          { sku: 'TVC-01-NATURAL', color: 'Tu nhien', price: 249000, stockQty: 18 },
          { sku: 'TVC-01-GREEN', color: 'Xanh reu', price: 269000, stockQty: 12 },
        ],
      },
    ];

    for (const item of products) {
      let product = await this.productRepository.findOne({
        where: { slug: item.slug },
      });
      if (!product) {
        product = await this.productRepository.save(
          this.productRepository.create({
            shopId: shop.id,
            categoryId: category.id,
            name: item.name,
            slug: item.slug,
            description: item.description,
            basePrice: item.basePrice,
            status: ProductStatus.ACTIVE,
            approvedAt: new Date(),
          }),
        );
      }

      for (const variant of item.variants) {
        const exists = await this.variantRepository.findOne({
          where: { sku: variant.sku },
        });
        if (!exists) {
          await this.variantRepository.save(
            this.variantRepository.create({
              productId: product.id,
              sku: variant.sku,
              attributes: { color: variant.color },
              price: variant.price,
              stockQty: variant.stockQty,
              status: 'active',
            }),
          );
        }
      }
    }
  }
}
