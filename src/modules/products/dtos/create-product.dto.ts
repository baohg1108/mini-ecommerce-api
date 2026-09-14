import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsNotEmpty,
} from 'class-validator';

export class CreateProductDto {
  @IsUUID()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(280)
  slug!: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description?: string;

  @IsNumber()
  @Min(1000)
  @Max(100000000)
  basePrice!: number;
}
