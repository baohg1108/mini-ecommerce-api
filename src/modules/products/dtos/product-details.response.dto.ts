import { Product } from '../entities/product.entity';
import { ProductImageResponseDto } from './product-image.response.dto';

export class ProductDetailsResponseDto {
  id: string;
  shopId: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  status: string;
  avgRating: number;
  reviewCount: number;
  soldCount: number;
  images: ProductImageResponseDto[];

  constructor(product: Product) {
    this.id = product.id;
    this.shopId = product.shopId;
    this.categoryId = product.categoryId;
    this.name = product.name;
    this.slug = product.slug;
    this.description = product.description;
    this.basePrice = Number(product.basePrice);
    this.status = product.status;
    this.avgRating = Number(product.avgRating);
    this.reviewCount = product.reviewCount;
    this.soldCount = product.soldCount;
    this.images = (product.images ?? []).map(
      (image) => new ProductImageResponseDto(image),
    );
  }
}
