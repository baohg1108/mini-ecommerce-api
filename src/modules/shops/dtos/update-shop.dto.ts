import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateShopDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  shopName?: string;

  @IsOptional()
  @IsString()
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
  returnPolicy?: string;

  @IsOptional()
  @IsString()
  shippingPolicy?: string;
}
