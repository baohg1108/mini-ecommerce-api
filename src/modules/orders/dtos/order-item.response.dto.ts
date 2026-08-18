export class OrderItemResponseDto {
  id!: string;
  variantId!: string;
  productName!: string;
  quantity!: number;
  priceAtOrder!: string;
  lineTotal!: string;

  constructor(partial: Partial<OrderItemResponseDto>) {
    Object.assign(this, partial);
  }
}
