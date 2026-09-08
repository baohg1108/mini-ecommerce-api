import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class AddToCartDto {
  @IsUUID()
  variantId!: string;

  @IsInt()
  @Min(1, { message: 'Should be a positive integer' })
  @Max(10, { message: 'Quantity cannot exceed 10' })
  quantity!: number;
}
