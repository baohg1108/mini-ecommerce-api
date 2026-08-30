import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RefundRequestsService } from './refund-requests.service';
import { RejectRefundRequestDto } from './dtos/reject-refund-request.dto';
import { RefundRequestResponseDto } from './dtos/refund-request.response.dto';
import { RefundRequestListQueryDto } from './dtos/refund-request-list-query.dto';
import { RefundRequestListResponseDto } from './dtos/refund-request-list.response.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/role.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';

@Controller('refund-requests')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.SELLER, UserRole.ADMIN)
export class RefundReviewController {
  constructor(private readonly refundRequestsService: RefundRequestsService) {}

  @Get()
  @Roles(UserRole.SELLER)
  @HttpCode(HttpStatus.OK)
  findForSeller(
    @CurrentUserId() sellerId: string,
    @Query() query: RefundRequestListQueryDto,
  ): Promise<RefundRequestListResponseDto> {
    return this.refundRequestsService.findForSeller(sellerId, query);
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RefundRequestResponseDto> {
    return this.refundRequestsService.approve(id, userId);
  }

  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectRefundRequestDto,
  ): Promise<RefundRequestResponseDto> {
    return this.refundRequestsService.reject(id, userId, dto);
  }

  @Patch(':id/retry-refund')
  @HttpCode(HttpStatus.OK)
  retryRefund(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RefundRequestResponseDto> {
    return this.refundRequestsService.retryRefund(id, userId);
  }
}
