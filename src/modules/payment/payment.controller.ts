import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { PaymentService } from './payment.service';
import { VnpayService } from './vnpay/vnpay.service';
import { VnpayIpnDto } from './vnpay/dtos/vnpay-ipn.dto';
import { VnpayIpnResponseDto } from './vnpay/dtos/vnpay-ipn.response.dto';
import { MomoService } from './momo/momo.service';
import { MomoPaymentResponseDto } from './momo/dtos/momo-payment-response.dto';
import { MomoIpnDto } from './momo/dtos/momo-ipn.dto';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/role.decorator';
import { IsPublic } from '../../common/decorators/public.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { PaymentHistoryQueryDto } from './dtos/payment-history-query.dto';
import { PaymentHistoryResponseDto } from './dtos/payment-history.response';

@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly vnpayService: VnpayService,
    private readonly momoService: MomoService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  // BE-083: customer see payment history
  @Get('history')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  async getPaymentHistory(
    @CurrentUserId() userId: string,
    @Query() query: PaymentHistoryQueryDto,
  ): Promise<PaymentHistoryResponseDto> {
    return this.paymentService.getPaymentHistory(userId, query);
  }

  // FR-25: sinh URL thanh toán VNPay
  @Post(':orderId/vnpay')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  async createVnpayUrl(
    @CurrentUserId() userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Req() req: Request,
  ) {
    const ipAddr =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    return this.vnpayService.createPaymentUrl(userId, orderId, ipAddr);
  }

  // FR-26: tạo thanh toán Momo
  @Post(':orderId/momo')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  async createMomoPayment(
    @CurrentUserId() userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<MomoPaymentResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You are not allowed to pay this order');
    }

    if (order.paymentMethod !== PaymentMethod.MOMO) {
      throw new BadRequestException(
        'This order was not placed with the Momo payment method',
      );
    }

    if (!order.payment) {
      throw new NotFoundException('Payment record not found for this order');
    }

    if (order.payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Payment for this order is already ${order.payment.status}`,
      );
    }

    this.logger.log(`Calling Momo gateway for order ${orderId}`);
    const result = await this.momoService.createPayment(order, order.payment);

    this.logger.log(`Momo gateway accepted order ${orderId}`);
    await this.paymentService.attachGatewayOrderId(
      order.payment.id,
      result.gatewayOrderId,
    );
    this.logger.log(`Saved Momo gateway order for order ${orderId}`);

    return new MomoPaymentResponseDto({
      orderId: order.id,
      amount: order.payment.amount,
      payUrl: result.payUrl,
      qrCodeUrl: result.qrCodeUrl,
      deeplink: result.deeplink,
    });
  }

  @IsPublic()
  @Post('momo/ipn')
  @HttpCode(HttpStatus.NO_CONTENT)
  async handleMomoIpn(@Body() body: MomoIpnDto): Promise<void> {
    const isValid = this.momoService.verifyIpnSignature(body);

    if (!isValid) {
      this.logger.warn(
        `Rejected Momo IPN with invalid signature for orderId=${body.orderId}`,
      );
      throw new BadRequestException('Invalid signature');
    }

    const payment = await this.paymentService.findByGatewayOrderId(
      body.orderId,
    );

    if (!payment) {
      this.logger.warn(`Momo IPN for unknown orderId=${body.orderId}`);
      return;
    }

    if (payment.status !== PaymentStatus.PENDING) {
      return;
    }

    if (body.resultCode === 0) {
      await this.paymentService.markSuccessByGatewayOrderId(body.orderId, {
        gatewayTxnId: body.transId,
        gatewayResponseCode: String(body.resultCode),
        gatewaySignature: body.signature,
        rawCallbackPayload: { ...body },
      });
    } else {
      await this.paymentService.markFailedByGatewayOrderId(body.orderId, {
        gatewayResponseCode: String(body.resultCode),
        gatewaySignature: body.signature,
        rawCallbackPayload: { ...body },
      });
    }
  }

  @IsPublic()
  @Get('vnpay/ipn')
  @HttpCode(HttpStatus.OK)
  async handleVnpayIpn(
    @Query() query: VnpayIpnDto,
    @Req() req: Request,
  ): Promise<VnpayIpnResponseDto> {
    const rawQuery = req.query as Record<string, string | undefined>;

    const requiredFields = [
      'vnp_TxnRef',
      'vnp_Amount',
      'vnp_ResponseCode',
      'vnp_TransactionStatus',
      'vnp_SecureHash',
    ];
    const missingField = requiredFields.find((field) => !rawQuery[field]);
    if (missingField) {
      this.logger.warn(`VNPay IPN missing required field: ${missingField}`);
      return new VnpayIpnResponseDto('99', 'Missing required parameters');
    }

    let isValidSignature: boolean;
    try {
      isValidSignature = this.vnpayService.verifyIpnSignature(rawQuery);
    } catch (err) {
      this.logger.error(
        `VNPay IPN signature verification threw for txnRef=${query.vnp_TxnRef}`,
        err instanceof Error ? err.stack : undefined,
      );
      return new VnpayIpnResponseDto('99', 'Unknown error');
    }

    if (!isValidSignature) {
      this.logger.warn(
        `Rejected VNPay IPN with invalid signature for txnRef=${query.vnp_TxnRef}`,
      );
      return new VnpayIpnResponseDto('97', 'Invalid signature');
    }

    const order = await this.vnpayService.findOrderForIpn(query.vnp_TxnRef);

    if (!order || !order.payment) {
      this.logger.warn(
        `VNPay IPN for unknown order, txnRef=${query.vnp_TxnRef}`,
      );
      return new VnpayIpnResponseDto('01', 'Order not found');
    }

    const payment = order.payment;

    const expectedAmount = Math.round(Number(order.totalAmount) * 100);
    const receivedAmount = Number(query.vnp_Amount);
    if (!Number.isFinite(receivedAmount) || expectedAmount !== receivedAmount) {
      this.logger.warn(
        `VNPay IPN amount mismatch for txnRef=${query.vnp_TxnRef}: ` +
          `expected=${expectedAmount} received=${query.vnp_Amount}`,
      );
      return new VnpayIpnResponseDto('04', 'Invalid amount');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      this.logger.log(
        `VNPay IPN duplicate for txnRef=${query.vnp_TxnRef}, ` +
          `payment already ${payment.status}`,
      );
      return new VnpayIpnResponseDto('02', 'Order already confirmed');
    }

    const isSuccess =
      query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00';

    if (isSuccess) {
      await this.paymentService.markSuccessByOrderId(payment.orderId, {
        gatewayTxnId: query.vnp_TransactionNo,
        gatewayResponseCode: query.vnp_ResponseCode,
        gatewaySignature: query.vnp_SecureHash,
        rawCallbackPayload: { ...rawQuery },
      });
      this.logger.log(
        `VNPay IPN: payment success for order ${payment.orderId}, ` +
          `txnRef=${query.vnp_TxnRef}`,
      );
    } else {
      await this.paymentService.markFailedByOrderId(payment.orderId, {
        gatewayResponseCode: query.vnp_ResponseCode,
        gatewaySignature: query.vnp_SecureHash,
        rawCallbackPayload: { ...rawQuery },
      });
      this.logger.log(
        `VNPay IPN: payment failed for order ${payment.orderId}, ` +
          `txnRef=${query.vnp_TxnRef}, responseCode=${query.vnp_ResponseCode}`,
      );
    }

    return new VnpayIpnResponseDto('00', 'Confirm Success');
  }
}
