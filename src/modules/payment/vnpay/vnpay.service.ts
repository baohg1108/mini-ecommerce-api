import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';
import {
  buildSignedQuery,
  formatVnpDate,
} from '../../../common/utils/vnpay-sign.util';

@Injectable()
export class VnpayService {
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
}
