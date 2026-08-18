import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dtos/create-order.dto';
import { OrderResponseDto } from './dtos/order.response.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/role.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';

// only customer logged in can access Order API
@Controller('orders')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  checkout(
    @CurrentUserId() userId: string,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponseDto[]> {
    return this.ordersService.checkout(userId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findMyOrders(@CurrentUserId() userId: string): Promise<OrderResponseDto[]> {
    return this.ordersService.findMyOrders(userId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findById(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.findById(id, userId);
  }
}
