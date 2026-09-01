import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dtos/create-voucher.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/role.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';

@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createVoucher(
    @CurrentUserId() userId: string,
    @Body() createVoucherDto: CreateVoucherDto,
  ) {
    return this.vouchersService.createVoucher(userId, createVoucherDto);
  }
}
