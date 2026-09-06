import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VariantItemDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  sku!: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string | number>;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(100000000)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  stockQty!: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpsertVariantsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantItemDto)
  variants!: VariantItemDto[];
}
