import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { VnpayService } from './vnpay/vnpay.service';
import { CreatePaymentUrlDto } from './dtos/create-payment-url.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';

@UseGuards(AccessTokenGuard)
@Controller('payment')
export class PaymentController {
  constructor(private readonly vnpayService: VnpayService) {}

  @Post('vnpay/create-url')
  createVnpayUrl(
    @CurrentUserId() userId: string,
    @Body() dto: CreatePaymentUrlDto,
    @Req() req: Request,
  ) {
    const ipAddr =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    return this.vnpayService.createPaymentUrl(userId, dto.orderId, ipAddr);
  }
}
