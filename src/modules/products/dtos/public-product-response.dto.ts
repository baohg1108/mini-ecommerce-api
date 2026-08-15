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
    this.reviewCount = product.reviewCount;
    this.soldCount = product.soldCount;
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

export class ProductListItemDto {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  avgRating: number;
  reviewCount: number;
  soldCount: number;
  category: { id: string; name: string; slug: string } | null;
  primaryImageUrl: string | null;

  constructor(product: Product) {
    this.id = product.id;
    this.name = product.name;
    this.slug = product.slug;
    this.basePrice = Number(product.basePrice);
    this.avgRating = Number(product.avgRating);
    this.reviewCount = product.reviewCount;
    this.soldCount = product.soldCount;
    this.category = product.category
      ? {
          id: product.category.id,
          name: product.category.name,
          slug: product.category.slug,
        }
      : null;
    this.primaryImageUrl =
      product.images?.find((img) => img.isPrimary)?.imageUrl ??
      product.images?.[0]?.imageUrl ??
      null;
  }
}
