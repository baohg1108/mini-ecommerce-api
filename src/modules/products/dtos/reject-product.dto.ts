import { IsString, MinLength, MaxLength } from 'class-validator';

export class RejectProductDto {
  @IsString()
  @MinLength(5, {
    message: 'The reason for refusal must be at least 5 characters long',
  })
  @MaxLength(500, {
    message: 'The reason for refusal must be at most 500 characters long',
  })
  rejectionReason!: string;
}
