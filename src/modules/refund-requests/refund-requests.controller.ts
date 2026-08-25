import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RefundRequestsService } from './refund-requests.service';
import { CreateRefundRequestDto } from './dtos/create-refund-request.dto';
import { RefundRequestResponseDto } from './dtos/refund-request.response.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/role.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';

@Controller('orders/:orderId/refund-requests')
@UseGuards(AccessTokenGuard, RolesGuard)
export class RefundRequestsController {
  constructor(private readonly refundRequestsService: RefundRequestsService) {}

  // FR-44 / UC-16: only the customer who owns the order can request a refund
  @Post()
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUserId() userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: CreateRefundRequestDto,
  ): Promise<RefundRequestResponseDto> {
    return this.refundRequestsService.create(orderId, userId, dto);
  }
}
