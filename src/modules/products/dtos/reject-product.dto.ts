import { IsString, MinLength } from 'class-validator';

export class RejectProductDto {
  @IsString()
  @MinLength(5, {
    message: 'The reason for refusal must be at least 5 characters long',
  })
  rejectionReason!: string;
}
