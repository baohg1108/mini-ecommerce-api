// docs: https://developers.momo.vn/v3/docs/payment/api/wallet/onetime
export interface MomoCreateApiResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  responseTime: number;
  message: string;
  resultCode: number;
  payUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
  signature?: string;
}

export interface MomoCreatePaymentResult {
  payUrl: string;
  deeplink?: string;
  qrCodeUrl?: string;
  gatewayOrderId: string;
  requestId: string;
  resultCode: number;
  message: string;
}
