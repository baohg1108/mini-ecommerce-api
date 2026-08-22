import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VnpayIpnDto {
  @IsString()
  @IsNotEmpty()
  vnp_TxnRef!: string;

  @IsString()
  @IsNotEmpty()
  vnp_Amount!: string;

  @IsString()
  @IsNotEmpty()
  vnp_ResponseCode!: string;

  @IsString()
  @IsNotEmpty()
  vnp_TransactionStatus!: string;

  @IsString()
  @IsNotEmpty()
  vnp_SecureHash!: string;

  @IsString()
  @IsOptional()
  vnp_TransactionNo?: string;

  @IsString()
  @IsOptional()
  vnp_BankCode?: string;

  @IsString()
  @IsOptional()
  vnp_PayDate?: string;

  @IsString()
  @IsOptional()
  vnp_TmnCode?: string;

  @IsString()
  @IsOptional()
  vnp_SecureHashType?: string;

  [key: string]: unknown;
}
