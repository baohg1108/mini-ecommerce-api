export class CartItemResponseDto {
  id!: string;
  variantId!: string;
  quantity!: number;
  productId?: string;
  productName?: string;
  price?: number;
  stockQty?: number;

  constructor(partial: Partial<CartItemResponseDto>) {
    Object.assign(this, partial);
  }
}
