import { Shop } from '../entities/shop.entity';

export class PublicShopResponseDto {
  id: string;
  shopName: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  returnPolicy: string | null;
  shippingPolicy: string | null;
  avgRating: number;
  createdAt: Date;

  constructor(shop: Shop) {
    this.id = shop.id;
    this.shopName = shop.shopName;
    this.slug = shop.slug;
    this.description = shop.description;
    this.logoUrl = shop.logoUrl;
    this.returnPolicy = shop.returnPolicy;
    this.shippingPolicy = shop.shippingPolicy;
    this.avgRating = shop.avgRating;
    this.createdAt = shop.createdAt;
  }
}
