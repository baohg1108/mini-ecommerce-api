import { IsString, Max, MinLength } from 'class-validator';

export class RejectProductDto {
  @IsString()
  @MinLength(5, {
    message: 'The reason for refusal must be at least 5 characters long',
  })
  @Max(500, {
    message: 'The reason for refusal must be at most 500 characters long',
  })
  rejectionReason!: string;
}
