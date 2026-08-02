import { Product } from '../entities/product.entity';

export class ProductResponseDto {
  id: string;
  shopId: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  status: string;
  rejectionReason: string | null;
  approvedAt: Date | null;
  avgRating: number;
  reviewCount: number;
  soldCount: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(product: Product) {
    this.id = product.id;
    this.shopId = product.shopId;
    this.categoryId = product.categoryId;
    this.name = product.name;
    this.slug = product.slug;
    this.description = product.description;
    this.basePrice = Number(product.basePrice);
    this.status = product.status;
    this.rejectionReason = product.rejectionReason;
    this.approvedAt = product.approvedAt;
    this.avgRating = Number(product.avgRating);
    this.reviewCount = product.reviewCount;
    this.soldCount = product.soldCount;
    this.createdAt = product.createdAt;
    this.updatedAt = product.updatedAt;
  }
}
