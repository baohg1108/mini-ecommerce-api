import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateShopDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  shopName?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  businessLicenseUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  returnPolicy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  shippingPolicy?: string;
}
