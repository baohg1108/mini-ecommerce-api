import { CartItemResponseDto } from './cart-item.response.dto';

export class ShopInfoDto {
  id!: string;
  name!: string;

  constructor(partial: Partial<ShopInfoDto>) {
    Object.assign(this, partial);
  }
}

export class GroupedCartDto {
  shop!: ShopInfoDto;
  items!: CartItemResponseDto[];

  constructor(partial: Partial<GroupedCartDto>) {
    Object.assign(this, partial);
  }
}
