import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import { SellerOrderListQueryDto } from './dtos/seller-order-list-query.dto';
import { SellerOrderListResponseDto } from './dtos/seller-order-list.response.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/role.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
// import { OrderStatus } from '../../common/enums/order-status.enum';

// only seller logged in can access this controller
@Controller('seller/orders')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.SELLER)
export class SellerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getShopOrders(
    @CurrentUserId() sellerId: string,
    @Query() query: SellerOrderListQueryDto,
  ): Promise<SellerOrderListResponseDto> {
    return this.ordersService.getShopOrders(sellerId, query);
  }
}
