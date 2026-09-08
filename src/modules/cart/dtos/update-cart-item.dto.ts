import { IsInt, Max, Min } from 'class-validator';

export class UpdateCartItemDto {
  @IsInt()
  @Min(1, { message: 'Quantity must be greater than 0' })
  @Max(10, { message: 'Quantity cannot exceed 10' })
  quantity!: number;
}
