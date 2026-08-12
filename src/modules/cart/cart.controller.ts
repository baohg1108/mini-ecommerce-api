import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { CartResponseDto } from './dtos/cart.response.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';

// only customer logged in can access Cart API
@Controller('cart')
@UseGuards(AccessTokenGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getMyCart(@CurrentUserId() userId: string): Promise<CartResponseDto> {
    return this.cartService.getMyCart(userId);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  addToCart(
    @CurrentUserId() userId: string,
    @Body() dto: AddToCartDto,
  ): Promise<CartResponseDto> {
    return this.cartService.addToCart(userId, dto);
  }
}
