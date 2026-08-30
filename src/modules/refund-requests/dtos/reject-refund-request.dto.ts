import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RejectRefundRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @MinLength(10, { message: 'Rejection reason must be at least 10 characters' })
  @MaxLength(1000, {
    message: 'Rejection reason must not exceed 1000 characters',
  })
  rejectionReason!: string;
}
