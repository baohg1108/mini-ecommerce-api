import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  HttpStatus,
  HttpCode,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { IsPublic } from '../../common/decorators/public.decorator';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { ProductVariantService } from './product-variant.service';
import { CreateProductVariantDto } from './dtos/create-product-variant.dto';
import { UpdateProductVariantDto } from './dtos/update-product-variant.dto';
import { UpsertVariantsDto } from './dtos/upsert-variant.dto';

@Controller('products/:productId/variants')
export class ProductVariantController {
  constructor(private readonly variantService: ProductVariantService) {}

  @Get()
  @IsPublic()
  findByProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.variantService.findByProduct(productId);
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('productId') productId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateProductVariantDto,
  ) {
    return this.variantService.create(productId, userId, dto);
  }

  // FR-12: bulk create/update variants
  @Post('upsert')
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.OK)
  async Upsert(
    @Param('productId') productId: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpsertVariantsDto,
  ) {
    return this.variantService.Upsert(productId, userId, dto);
  }
}

@Controller('variants')
export class VariantController {
  constructor(private readonly variantService: ProductVariantService) {}

  @Get(':id')
  @IsPublic()
  async findById(@Param('id') id: string) {
    return this.variantService.findById(id);
  }

  @Get('sku/:sku')
  @IsPublic()
  async findBySku(@Param('sku') sku: string) {
    return this.variantService.findBySku(sku);
  }

  @Patch(':id')
  @UseGuards(AccessTokenGuard)
  async update(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.variantService.update(id, userId, dto);
  }
}
