import { Product } from '../entities/product.entity';

export class PublicProductResponseDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  avgRating: number;
  reviewCount: number;
  soldCount: number;
  images: { id: string; imageUrl: string; isPrimary: boolean }[];
  createdAt: Date;

  constructor(product: Product) {
    this.id = product.id;
    this.name = product.name;
    this.slug = product.slug;
    this.description = product.description;
    this.basePrice = product.basePrice;
    this.avgRating = product.avgRating;
    this.reviewCount = product.reviewCount;
    this.soldCount = product.soldCount;
    this.images = (product.images ?? []).map((img) => ({
      id: img.id,
      imageUrl: img.imageUrl,
      isPrimary: img.isPrimary,
    }));
    this.createdAt = product.createdAt;
  }
}
