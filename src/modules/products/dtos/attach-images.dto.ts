import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ProductImageItemDto {
  @IsString()
  url!: string;

  @IsString()
  publicId!: string;
}

export class AttachProductImagesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => ProductImageItemDto)
  images!: ProductImageItemDto[];
}
