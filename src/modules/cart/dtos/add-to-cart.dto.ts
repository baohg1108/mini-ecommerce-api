import { IsInt, IsUUID, Min } from 'class-validator';

export class AddToCartDto {
  @IsUUID()
  variantId!: string;

  @IsInt()
  @Min(1, { message: 'Should be a positive integer' })
  quantity!: number;
}
