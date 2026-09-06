import {
  IsString,
  IsOptional,
  IsObject,
  IsNumber,
  Min,
  MaxLength,
  Matches,
  MinLength,
  Max,
} from 'class-validator';

export class CreateProductVariantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'sku have letters, numbers, hyphens (-), and underscores (_)',
  })
  sku!: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string | number>;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000000)
  price!: number;

  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  @Max(1000000)
  stockQty!: number;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  imageUrl?: string;
}
