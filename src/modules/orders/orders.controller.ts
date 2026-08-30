import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { CancelOrderDto } from './dtos/cancel-order.dto';

@Controller('orders')
@UseGuards(AccessTokenGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // only customer logged in can checkout
  @Post('checkout')
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  checkout(
    @CurrentUserId() userId: string,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponseDto[]> {
    return this.ordersService.checkout(userId, dto);
  }

  // only customer logged in can view their own orders
  @Get()
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  findMyOrders(@CurrentUserId() userId: string): Promise<OrderResponseDto[]> {
    return this.ordersService.findMyOrders(userId);
  }

  // only customer logged in can view their own order detail
  @Get(':id')
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  findById(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.findById(id, userId);
  }

  // only seller logged in can confirm a COD order belonging to their shop
  @Patch(':id/confirm')
  @Roles(UserRole.SELLER)
  @HttpCode(HttpStatus.OK)
  confirmCodOrder(
    @CurrentUserId() sellerUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.confirmOrder(id, sellerUserId);
  }

  // FR-30: Seller xác nhận đơn
  @Patch(':id/confirm')
  @Roles(UserRole.SELLER)
  @HttpCode(HttpStatus.OK)
  confirmOrder(
    @CurrentUserId() sellerUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.confirmOrder(id, sellerUserId);
  }

  // FR-30: Seller chuyển "đang chuẩn bị hàng"
  @Patch(':id/preparing')
  @Roles(UserRole.SELLER)
  @HttpCode(HttpStatus.OK)
  markPreparing(
    @CurrentUserId() sellerUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.markPreparing(id, sellerUserId);
  }

  // FR-30: Seller chuyển "đang giao"
  @Patch(':id/shipping')
  @Roles(UserRole.SELLER)
  @HttpCode(HttpStatus.OK)
  markShipping(
    @CurrentUserId() sellerUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.markShipping(id, sellerUserId);
  }

  // FR-30: Seller xác nhận "đã giao"
  @Patch(':id/delivered')
  @Roles(UserRole.SELLER)
  @HttpCode(HttpStatus.OK)
  markDelivered(
    @CurrentUserId() sellerUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.markDelivered(id, sellerUserId);
  }

  // FR-30: đánh dấu "hoàn thành"
  @Patch(':id/complete')
  @Roles(UserRole.SELLER)
  @HttpCode(HttpStatus.OK)
  completeOrder(
    @CurrentUserId() sellerUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.completeOrder(id, sellerUserId);
  }

  // FR-30 / BR-08: Seller huỷ đơn
  @Patch(':id/seller-cancel')
  @Roles(UserRole.SELLER)
  @HttpCode(HttpStatus.OK)
  cancelOrderBySeller(
    @CurrentUserId() sellerUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancelOrder(id, sellerUserId, dto.reason);
  }

  // FR-31 / BR-04: Customer tự huỷ đơn
  @Patch(':id/cancel')
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  cancelOrderByCustomer(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancelOrderByCustomer(id, userId, dto.reason);
  }
}
