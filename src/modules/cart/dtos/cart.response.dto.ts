import { CartItemResponseDto } from './cart-item.response.dto';

export class CartResponseDto {
  id!: string;
  userId!: string;
  items!: CartItemResponseDto[];

  constructor(partial: Partial<CartResponseDto>) {
    Object.assign(this, partial);
  }
}
