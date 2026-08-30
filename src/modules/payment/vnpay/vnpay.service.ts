import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import axios, { AxiosError } from 'axios';
import { Order } from '../../orders/entities/order.entity';
import { Payment } from '../entities/payment.entity';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';
import {
  buildSignedQuery,
  buildRefundSignature,
  formatVnpDate,
  verifySignedQuery,
  verifyRefundResponseSignature,
} from '../../../common/utils/vnpay-sign.util';

export interface GatewayRefundResult {
  success: boolean;
  gatewayTxnId?: string;
  responseCode?: string;
  message?: string;
  raw?: Record<string, unknown>;
}

/**
 * Ép kiểu an toàn cho các field lấy từ response JSON (kiểu `unknown`) sang
 * string, tránh lỗi @typescript-eslint/no-base-to-string khi dùng String()
 * trực tiếp trên giá trị có thể là object.
 */
function toSafeString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

@Injectable()
export class VnpayService {
  private readonly logger = new Logger(VnpayService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly configService: ConfigService,
  ) {}

  async createPaymentUrl(
    userId: string,
    orderId: string,
    ipAddr: string,
  ): Promise<{ paymentUrl: string }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You are not allowed to pay this order');
    }

    if (order.paymentMethod !== PaymentMethod.VNPAY) {
      throw new BadRequestException(
        'This order is not configured for VNPay payment',
      );
    }

    const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE');
    const hashSecret = this.configService.get<string>('VNPAY_HASH_SECRET');
    const vnpayUrl = this.configService.get<string>('VNPAY_PAYMENT_URL');
    const returnUrl = this.configService.get<string>('VNPAY_RETURN_URL');

    if (!tmnCode || !hashSecret || !vnpayUrl || !returnUrl) {
      throw new BadRequestException('VNPay configuration is missing');
    }

    const amount = Math.round(Number(order.totalAmount) * 100);

    const params: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: amount,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: order.orderCode,
      vnp_OrderInfo: `Pay for the order ${order.orderCode}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: formatVnpDate(new Date()),
    };

    const { queryString } = buildSignedQuery(params, hashSecret);

    return { paymentUrl: `${vnpayUrl}?${queryString}` };
  }

  verifyIpnSignature(query: Record<string, string | undefined>): boolean {
    const hashSecret = this.configService.get<string>('VNPAY_HASH_SECRET');

    if (!hashSecret) {
      return false;
    }

    return verifySignedQuery(query, hashSecret);
  }

  async findOrderForIpn(orderCode: string): Promise<Order | null> {
    if (!orderCode) return null;

    return this.orderRepository.findOne({
      where: { orderCode },
      relations: { payment: true },
    });
  }

  /**
   * FR-46 - Gọi VNPay Refund API (sandbox) để hoàn tiền cho đơn thanh toán
   * qua VNPay. Không throw ra ngoài khi gateway trả lỗi hoặc mất kết nối -
   * luôn trả về object result để caller (PaymentService) tự quyết định cách
   * cập nhật trạng thái Order/Payment.
   * Docs: https://sandbox.vnpayment.vn/apis/docs/refund-api/refund.html
   */
  async refund(
    order: Order,
    payment: Payment,
    reason: string,
    ipAddr = '127.0.0.1',
  ): Promise<GatewayRefundResult> {
    const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE');
    const hashSecret = this.configService.get<string>('VNPAY_HASH_SECRET');
    const apiUrl = this.configService.get<string>('VNPAY_API_URL');
    const createBy =
      this.configService.get<string>('VNPAY_CREATE_BY') ?? 'system';
    const timeoutMs =
      this.configService.get<number>('VNPAY_REFUND_TIMEOUT_MS') ?? 15000;

    if (!tmnCode || !hashSecret || !apiUrl) {
      throw new BadRequestException('VNPay configuration is missing');
    }

    if (!payment.gatewayTxnId) {
      throw new BadRequestException(
        'Cannot refund: original VNPay transaction number is missing',
      );
    }

    const requestId = randomUUID();
    const version = '2.1.0';
    const command = 'refund';
    const transactionType = '02'; // 02: hoàn tiền toàn phần
    const amount = Math.round(Number(payment.amount) * 100);
    const transactionDate = payment.paidAt
      ? formatVnpDate(payment.paidAt)
      : formatVnpDate(order.createdAt);
    const createDate = formatVnpDate(new Date());
    const orderInfo = `Hoan tien don hang ${order.orderCode}: ${reason}`;

    const secureHash = buildRefundSignature(
      {
        requestId,
        version,
        command,
        tmnCode,
        transactionType,
        txnRef: order.orderCode,
        amount,
        transactionNo: payment.gatewayTxnId,
        transactionDate,
        createBy,
        createDate,
        ipAddr,
        orderInfo,
      },
      hashSecret,
    );

    const requestBody = {
      vnp_RequestId: requestId,
      vnp_Version: version,
      vnp_Command: command,
      vnp_TmnCode: tmnCode,
      vnp_TransactionType: transactionType,
      vnp_TxnRef: order.orderCode,
      vnp_Amount: amount,
      vnp_OrderInfo: orderInfo,
      vnp_TransactionNo: payment.gatewayTxnId,
      vnp_TransactionDate: transactionDate,
      vnp_CreateBy: createBy,
      vnp_CreateDate: createDate,
      vnp_IpAddr: ipAddr,
      vnp_SecureHash: secureHash,
    };

    let data: Record<string, unknown>;

    try {
      const response = await axios.post(apiUrl, requestBody, {
        timeout: timeoutMs,
        headers: { 'Content-Type': 'application/json' },
      });
      data = response.data as Record<string, unknown>;
    } catch (error) {
      const err = error as AxiosError;
      this.logger.error(
        `VNPay refund request failed for order ${order.orderCode}: ${err.message}`,
        err.response?.data ? JSON.stringify(err.response.data) : undefined,
      );
      return {
        success: false,
        message: `Không thể kết nối tới cổng VNPay: ${err.message}`,
      };
    }

    const responseCode = toSafeString(data.vnp_ResponseCode);
    const transactionStatus = toSafeString(data.vnp_TransactionStatus);
    const receivedHash = toSafeString(data.vnp_SecureHash);

    if (receivedHash) {
      const validSignature = verifyRefundResponseSignature(
        {
          responseId: toSafeString(data.vnp_ResponseId),
          command: toSafeString(data.vnp_Command),
          responseCode,
          message: toSafeString(data.vnp_Message),
          tmnCode: toSafeString(data.vnp_TmnCode),
          txnRef: toSafeString(data.vnp_TxnRef),
          amount: toSafeString(data.vnp_Amount),
          bankCode: toSafeString(data.vnp_BankCode),
          payDate: toSafeString(data.vnp_PayDate),
          transactionNo: toSafeString(data.vnp_TransactionNo),
          transactionType: toSafeString(data.vnp_TransactionType),
          transactionStatus,
          orderInfo: toSafeString(data.vnp_OrderInfo),
        },
        receivedHash,
        hashSecret,
      );

      if (!validSignature) {
        this.logger.error(
          `VNPay refund response signature mismatch for order ${order.orderCode}`,
        );
        return {
          success: false,
          responseCode,
          message: 'Invalid signature from VNPay refund response',
          raw: data,
        };
      }
    }

    const success = responseCode === '00' && transactionStatus === '00';

    const gatewayTxnId = toSafeString(data.vnp_TransactionNo);
    const message = toSafeString(data.vnp_Message);

    return {
      success,
      responseCode,
      gatewayTxnId: gatewayTxnId || undefined,
      message: message || undefined,
      raw: data,
    };
  }
}
