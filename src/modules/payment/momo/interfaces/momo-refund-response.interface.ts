export interface MomoRefundApiResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  transId?: number;
  resultCode: number;
  message: string;
  responseTime?: number;
}
