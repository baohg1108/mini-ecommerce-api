import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RefundRequestsService } from './refund-requests.service';
import { RejectRefundRequestDto } from './dtos/reject-refund-request.dto';
import { RefundRequestResponseDto } from './dtos/refund-request.response.dto';
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
}
