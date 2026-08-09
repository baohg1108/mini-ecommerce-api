import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Body,
  Get,
  UseGuards,
  ParseUUIDPipe,
  Param,
  Patch,
} from '@nestjs/common';
import { ShopService } from './shop.service';
import { CreateShopDto } from './dtos/create-shop.dto';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/role.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { RejectShopDto } from './dtos/reject-shop.dto';
import { SuspendedShopDto } from './dtos/suspended-shop.dto';
import { UpdateShopDto } from './dtos/update-shop.dto';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { IsPublic } from '../../common/decorators/public.decorator';
import { Query } from '@nestjs/common';
import { PublicProductResponseDto } from '../products/dtos/public-product-response.dto';
import { ProductService } from '../products/product.service';

@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('shop')
export class ShopController {
  constructor(
    private readonly shopService: ShopService,
    private readonly productService: ProductService,
  ) {}

  // FR-18: public shops
  @IsPublic()
  @Get('public')
  @HttpCode(HttpStatus.OK)
  async getAllActiveShops(@Query() query: PaginationQueryDto) {
    const { data, total } = await this.shopService.getAllActiveShops(query);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    return {
      data,
      total,
      page,
      limit,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    };
  }

  // public shop profile
  @IsPublic()
  @Get('public/:id')
  @HttpCode(HttpStatus.OK)
  async getShopProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.shopService.getPublicShopById(id);
  }

  // public products of a shop
  @IsPublic()
  @Get('public/:id/products')
  @HttpCode(HttpStatus.OK)
  async getShopProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    await this.shopService.getPublicShopById(id);

    const { data, total } = await this.productService.findPublicByShop(
      id,
      query,
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    return {
      data: data.map((product) => new PublicProductResponseDto(product)),
      total,
      page,
      limit,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    };
  }

  // register a shop
  @Roles(UserRole.SELLER)
  @Post('register-shop')
  @HttpCode(HttpStatus.OK)
  registerShop(
    @CurrentUserId() userId: string,
    @Body() createShopDto: CreateShopDto,
  ) {
    return this.shopService.registerShop(userId, createShopDto);
  }

  // get shop by me
  @Roles(UserRole.SELLER)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  getMyShop(@CurrentUserId() userId: string) {
    return this.shopService.getMyShop(userId);
  }

  // approve shop
  @Roles(UserRole.ADMIN)
  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  approveShop(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.shopService.approveShop(id, userId);
  }

  // reject shop
  @Roles(UserRole.ADMIN)
  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  rejectShop(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
    @Body() rejectShopDto: RejectShopDto,
  ) {
    return this.shopService.rejectShop(id, userId, rejectShopDto);
  }

  // suspend shop
  @Roles(UserRole.ADMIN)
  @Patch(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendShop(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
    @Body() suspendedShopDto: SuspendedShopDto,
  ) {
    return this.shopService.suspendShop(id, userId, suspendedShopDto);
  }

  // un-suspend shop
  @Roles(UserRole.ADMIN)
  @Patch(':id/unsuspend')
  @HttpCode(HttpStatus.OK)
  unlockShop(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.shopService.unlockShop(id, userId);
  }

  // update shop
  @Roles(UserRole.SELLER)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  updateMyShop(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
    @Body() updateShopDto: UpdateShopDto,
  ) {
    return this.shopService.updateShop(userId, updateShopDto);
  }

  // get all shops
  @Roles(UserRole.ADMIN)
  @Get('all')
  @HttpCode(HttpStatus.OK)
  getAllShops() {
    return this.shopService.getAllShops();
  }

  // get shop by id
  @Roles(UserRole.ADMIN)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getShopById(@Param('id', ParseUUIDPipe) id: string) {
    return this.shopService.getShopById(id);
  }
}
