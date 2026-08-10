import {
  IsString,
  IsOptional,
  IsObject,
  IsNumber,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateProductVariantDto {
  @IsString()
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
  price!: number;

  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  stockQty!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;
}
