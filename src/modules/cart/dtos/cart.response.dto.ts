import { CartItemResponseDto } from './cart-item.response.dto';

export class CartResponseDto {
  id!: string;
  userId!: string;
  items!: CartItemResponseDto[];
  hasUnavailableItems!: boolean;

  constructor(partial: Partial<CartResponseDto>) {
    Object.assign(this, partial);
    this.hasUnavailableItems = (this.items ?? []).some(
      (item) => !item.isAvailable,
    );
  }
}
