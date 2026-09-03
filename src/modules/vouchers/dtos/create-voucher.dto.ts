import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { VoucherType } from '../../../common/enums/voucher-type.enum';

export class CreateVoucherDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  code!: string;

  @IsEnum(VoucherType)
  discountType!: VoucherType;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  discountValue!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderValue?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDiscountValue?: number;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit!: number;

  // limit 1 user used voucher
  // if none or undefined = no limit (ex: freeship voucher)
  // if = 1 = limit (ex: voucher discount 50% for new user)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimitPerUser?: number;
}
