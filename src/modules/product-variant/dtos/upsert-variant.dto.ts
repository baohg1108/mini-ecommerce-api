import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VariantItemDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsNotEmpty()
  @IsString()
  sku!: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string | number>;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsNumber()
  @Min(0)
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
