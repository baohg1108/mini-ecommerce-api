import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateShopDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  // @Transform(({ value }) =>
  //   typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  // )
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  })
  shopName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description!: string | null;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logoUrl!: string | null;

  @IsOptional()
  @IsUrl({})
  @MaxLength(500)
  businessLicenseUrl!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  returnPolicy!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  shippingPolicy!: string | null;
}
