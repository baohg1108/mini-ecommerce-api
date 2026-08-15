export class CartItemResponseDto {
  id!: string;
  variantId!: string;
  quantity!: number;
  productId?: string;
  productName?: string;
  price?: number;
  stockQty?: number;
  isAvailable!: boolean;
  warning?: string;

  constructor(partial: Partial<CartItemResponseDto>) {
    Object.assign(this, partial);
    this.isAvailable = partial.isAvailable ?? true;
  }
}
