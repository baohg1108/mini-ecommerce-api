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
  category: { id: string; name: string; slug: string } | null;
  images: { id: string; imageUrl: string; isPrimary: boolean }[];
  createdAt: Date;

  constructor(product: Product) {
    this.id = product.id;
    this.name = product.name;
    this.slug = product.slug;
    this.description = product.description;
    this.basePrice = Number(product.basePrice);
    this.avgRating = Number(product.avgRating);
    this.reviewCount = Number(product.reviewCount);
    this.soldCount = Number(product.soldCount);
    this.category = product.category
      ? {
          id: product.category.id,
          name: product.category.name,
          slug: product.category.slug,
        }
      : null;
    this.images = (product.images ?? []).map((img) => ({
      id: img.id,
      imageUrl: img.imageUrl,
      isPrimary: img.isPrimary,
    }));
    this.createdAt = product.createdAt;
  }
}
