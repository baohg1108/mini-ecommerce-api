import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRefundRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Reason is required' })
  @MinLength(10, { message: 'Reason must be at least 10 characters' })
  @MaxLength(1000, { message: 'Reason must not exceed 1000 characters' })
  reason!: string;
}
