import { IsIn, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

// docs: https://developers.momo.vn/v3/docs/payment/api/wallet/onetime#ipn-handler
export class MomoIpnDto {
  @IsString()
  partnerCode!: string;

  @IsString()
  orderId!: string;

  @IsString()
  requestId!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  orderInfo!: string;

  @IsOptional()
  @IsString()
  orderType?: string;

  @IsString()
  transId!: string;

  @IsInt()
  resultCode!: number;

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  payType?: string;

  @IsNumber()
  responseTime!: number;

  @IsOptional()
  @IsIn(['captureWallet', 'payWithMethod'])
  requestType?: string;

  @IsOptional()
  @IsString()
  extraData?: string;

  @IsString()
  signature!: string;
}
