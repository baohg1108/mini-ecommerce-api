import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { PaymentService } from './payment.service';
import { VnpayService } from './vnpay/vnpay.service';
import { MomoService } from './momo/momo.service';
import { MomoPaymentResponseDto } from './momo/dtos/momo-payment-response.dto';
import { MomoIpnDto } from './momo/dtos/momo-ipn.dto';
import { CreatePaymentUrlDto } from './dtos/create-payment-url.dto';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/role.decorator';
import { IsPublic } from '../../common/decorators/public.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';

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

  // Momo IPN callback (server-to-server, không cần auth)
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
}