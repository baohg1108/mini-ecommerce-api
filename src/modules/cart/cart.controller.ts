import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { UpdateCartItemDto } from './dtos/update-cart-item.dto';
import { CartResponseDto } from './dtos/cart.response.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/role.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { GroupedCartDto } from './dtos/grouped-cart.dto';
import { AvailableVoucherResponseDto } from '../../modules/vouchers/dtos/available-voucher.response.dto';

// only customer logged in can access Cart API
@Controller('cart')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getMyCart(@CurrentUserId() userId: string): Promise<CartResponseDto> {
    return this.cartService.getMyCart(userId);
  }

  @Get('grouped-by-shop')
  @HttpCode(HttpStatus.OK)
  getGroupedCart(@CurrentUserId() userId: string): Promise<GroupedCartDto[]> {
    return this.cartService.getGroupedCartForCheckout(userId);
  }

  @Get('available-vouchers')
  @HttpCode(HttpStatus.OK)
  getAvailableVouchers(
    @CurrentUserId() userId: string,
  ): Promise<AvailableVoucherResponseDto[]> {
    return this.cartService.getAvailableVouchers(userId);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  addToCart(
    @CurrentUserId() userId: string,
    @Body() dto: AddToCartDto,
  ): Promise<CartResponseDto> {
    return this.cartService.addToCart(userId, dto);
  }

  @Patch('items/:id')
  @HttpCode(HttpStatus.OK)
  updateCartItem(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    return this.cartService.updateCartItem(userId, itemId, dto);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.OK)
  removeCartItem(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) itemId: string,
  ): Promise<CartResponseDto> {
    return this.cartService.removeCartItem(userId, itemId);
  }

  @Delete('items')
  @HttpCode(HttpStatus.OK)
  clearCart(@CurrentUserId() userId: string): Promise<CartResponseDto> {
    return this.cartService.clearCart(userId);
  }
}
