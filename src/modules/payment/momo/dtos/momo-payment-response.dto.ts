export class MomoPaymentResponseDto {
  orderId!: string;
  amount!: string;
  payUrl!: string;
  qrCodeUrl?: string;
  deeplink?: string;

  constructor(partial: Partial<MomoPaymentResponseDto>) {
    Object.assign(this, partial);
  }
}
