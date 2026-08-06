import { ProductImage } from '../entities/product-image.entity';

export class ProductImageResponseDto {
  id: string;
  imageUrl: string;
  displayOrder: number;
  isPrimary: boolean;

  constructor(image: ProductImage) {
    this.id = image.id;
    this.imageUrl = image.imageUrl;
    this.displayOrder = image.displayOrder;
    this.isPrimary = image.isPrimary;
  }
}
