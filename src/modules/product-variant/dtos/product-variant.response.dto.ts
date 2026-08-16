export class ProductVariantResponseDto {
  id!: string;
  productId!: string;
  sku!: string;
  attributes!: Record<string, string | number>;
  price!: number;
  stockQty!: number;
  reservedQty!: number;
  availableQty!: number;
  imageUrl!: string | null;
  status!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
