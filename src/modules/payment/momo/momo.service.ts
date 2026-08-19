import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import axios, { AxiosError } from 'axios';
import { Order } from '../../orders/entities/order.entity';
import { Payment } from '../entities/payment.entity';
import { MomoIpnDto } from './dtos/momo-ipn.dto';
import {
  MomoCreateApiResponse,
  MomoCreatePaymentResult,
} from './interfaces/momo-create-response.interface';

@Injectable()
export class MomoService {
  private readonly logger = new Logger(MomoService.name);

  private readonly partnerCode: string;
  private readonly partnerName: string;
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly apiEndpoint: string;
  private readonly redirectUrl: string;
  private readonly ipnUrl: string;
  private readonly requestType: string;
  private readonly requestTimeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.partnerCode =
      this.configService.getOrThrow<string>('MOMO_PARTNER_CODE');
    this.partnerName =
      this.configService.getOrThrow<string>('MOMO_PARTNER_NAME');
    this.accessKey = this.configService.getOrThrow<string>('MOMO_ACCESS_KEY');
    this.secretKey = this.configService.getOrThrow<string>('MOMO_SECRET_KEY');
    this.apiEndpoint =
      this.configService.getOrThrow<string>('MOMO_API_ENDPOINT');
    this.redirectUrl =
      this.configService.getOrThrow<string>('MOMO_REDIRECT_URL');
    this.ipnUrl = this.configService.getOrThrow<string>('MOMO_IPN_URL');
    this.requestType =
      this.configService.getOrThrow<string>('MOMO_REQUEST_TYPE');
    this.requestTimeoutMs = this.configService.getOrThrow<number>(
      'MOMO_REQUEST_TIMEOUT_MS',
    );
  }

  async createPayment(
    order: Order,
    payment: Payment,
  ): Promise<MomoCreatePaymentResult> {
    const gatewayOrderId = `${payment.id}-${Date.now()}`;
    const requestId = randomUUID();
    const orderInfo = `Thanh toan don hang ${order.orderCode}`;
    const extraData = '';

    const amount = Math.round(Number(payment.amount));

    const rawSignature =
      `accessKey=${this.accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${this.ipnUrl}` +
      `&orderId=${gatewayOrderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${this.partnerCode}` +
      `&redirectUrl=${this.redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${this.requestType}`;

    const signature = this.sign(rawSignature);

    const requestBody = {
      partnerCode: this.partnerCode,
      partnerName: this.partnerName,
      storeId: this.partnerCode,
      requestId,
      amount,
      orderId: gatewayOrderId,
      orderInfo,
      redirectUrl: this.redirectUrl,
      ipnUrl: this.ipnUrl,
      lang: 'vi',
      requestType: this.requestType,
      autoCapture: true,
      extraData,
      signature,
    };

    let response: MomoCreateApiResponse;

    try {
      const { data } = await axios.post<MomoCreateApiResponse>(
        this.apiEndpoint,
        requestBody,
        {
          timeout: this.requestTimeoutMs,
          headers: { 'Content-Type': 'application/json' },
        },
      );
      response = data;
    } catch (error) {
      const err = error as AxiosError;
      this.logger.error(
        `Momo create-payment request failed: ${err.message}`,
        err.response?.data ? JSON.stringify(err.response.data) : undefined,
      );
      throw new ServiceUnavailableException(
        'Unable to reach Momo payment gateway. Please try again later',
      );
    }

    if (response.resultCode !== 0 || !response.payUrl) {
      this.logger.warn(
        `Momo returned an error for order ${gatewayOrderId}: ` +
          `resultCode=${response.resultCode} message=${response.message}`,
      );
      throw new ServiceUnavailableException(
        `Momo payment initiation failed: ${response.message}`,
      );
    }

    return {
      payUrl: response.payUrl,
      deeplink: response.deeplink,
      qrCodeUrl: response.qrCodeUrl,
      gatewayOrderId,
      requestId,
      resultCode: response.resultCode,
      message: response.message,
    };
  }

  verifyIpnSignature(payload: MomoIpnDto): boolean {
    const rawSignature =
      `accessKey=${this.accessKey}` +
      `&amount=${payload.amount}` +
      `&extraData=${payload.extraData ?? ''}` +
      `&message=${payload.message}` +
      `&orderId=${payload.orderId}` +
      `&orderInfo=${payload.orderInfo}` +
      `&orderType=${payload.orderType ?? ''}` +
      `&partnerCode=${payload.partnerCode}` +
      `&payType=${payload.payType ?? ''}` +
      `&requestId=${payload.requestId}` +
      `&responseTime=${payload.responseTime}` +
      `&resultCode=${payload.resultCode}` +
      `&transId=${payload.transId}`;

    const expectedSignature = this.sign(rawSignature);

    const expected = Buffer.from(expectedSignature, 'utf8');
    const received = Buffer.from(payload.signature ?? '', 'utf8');

    if (expected.length !== received.length) {
      return false;
    }

    return timingSafeEqual(expected, received);
  }

  private sign(rawSignature: string): string {
    return createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');
  }
}
