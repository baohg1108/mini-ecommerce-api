import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Body,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ShopService } from './shop.service';
import { CreateShopDto } from './dtos/create-shop.dto';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/role.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.SELLER)
@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  // register a shop
  @Post('register-shop')
  @HttpCode(HttpStatus.OK)
  registerShop(
    @CurrentUserId() userId: string,
    @Body() createShopDto: CreateShopDto,
  ) {
    return this.shopService.registerShop(userId, createShopDto);
  }

  // get shop by me
  @Get('me')
  @HttpCode(HttpStatus.OK)
  getMyShop(@CurrentUserId() userId: string) {
    return this.shopService.getMyShop(userId);
  }
}
