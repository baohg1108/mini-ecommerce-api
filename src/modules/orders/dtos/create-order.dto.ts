import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';

export class ShippingAddressDto {
  @IsString()
  @MaxLength(150)
  recipientName!: string;

  @IsString()
  @MaxLength(20)
  phone!: string;

  @IsString()
  @MaxLength(500)
  fullAddress!: string;
}

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  address!: ShippingAddressDto;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  voucherCode?: string;
}
