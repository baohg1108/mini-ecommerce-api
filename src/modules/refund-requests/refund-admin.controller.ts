import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RefundRequestsService } from './refund-requests.service';
import { RefundRequestListQueryDto } from './dtos/refund-request-list-query.dto';
import { RefundRequestListResponseDto } from './dtos/refund-request-list.response.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/role.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@Controller('admin/refund-requests')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class RefundAdminController {
  constructor(private readonly refundRequestsService: RefundRequestsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  findForAdmin(
    @Query() query: RefundRequestListQueryDto,
  ): Promise<RefundRequestListResponseDto> {
    return this.refundRequestsService.findForAdmin(query);
  }
}
