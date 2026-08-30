import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { RejectProductDto } from './dtos/reject-product.dto';
import { ProductResponseDto } from './dtos/product.response.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';
import { SellerApprovedGuard } from '../../common/guards/seller-approved.guard';
import { Roles } from '../../common/decorators/role.decorator';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { ProductDetailsResponseDto } from './dtos/product-details.response.dto';
import { SearchProductDto } from './dtos/search-product.dto';
import { IsPublic } from '../../common/decorators/public.decorator';

@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // BR-01 + BR-08
  @Roles(UserRole.SELLER)
  @UseGuards(SellerApprovedGuard)
  @Post()
  async create(
    @CurrentUserId() userId: string,
    @Body() dto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.create(userId, dto);
    return new ProductResponseDto(product);
  }

  @Roles(UserRole.SELLER)
  @UseGuards(SellerApprovedGuard)
  @Get('my')
  async findMyProducts(
    @CurrentUserId() userId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<{ data: ProductResponseDto[]; total: number }> {
    const { data, total } = await this.productService.findMyProducts(
      userId,
      query,
    );
    return { data: data.map((p) => new ProductResponseDto(p)), total };
  }

  @Roles(UserRole.SELLER)
  @UseGuards(SellerApprovedGuard)
  @Patch(':id')
  async update(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.update(userId, id, dto);
    return new ProductResponseDto(product);
  }

  @Roles(UserRole.SELLER)
  @UseGuards(SellerApprovedGuard)
  @Delete(':id')
  async remove(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.productService.remove(userId, id);
  }

  @Roles(UserRole.SELLER)
  @UseGuards(SellerApprovedGuard)
  @Patch(':id/hide')
  async hide(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.hide(userId, id);
    return new ProductResponseDto(product);
  }

  @Roles(UserRole.SELLER)
  @UseGuards(SellerApprovedGuard)
  @Patch(':id/unhide')
  async unhide(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.unhide(userId, id);
    return new ProductResponseDto(product);
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/review')
  async findForAdmin(
    @Query() query: PaginationQueryDto,
  ): Promise<{ data: ProductResponseDto[]; total: number }> {
    const { data, total } = await this.productService.findForAdmin(query);
    return { data: data.map((p) => new ProductResponseDto(p)), total };
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/:id')
  async findOneForAdmin(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductDetailsResponseDto> {
    return this.productService.findOneForAdmin(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch('admin/:id/approve')
  async approve(
    @CurrentUserId() adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.approve(adminId, id);
    return new ProductResponseDto(product);
  }

  @Roles(UserRole.ADMIN)
  @Patch('admin/:id/reject')
  async reject(
    @CurrentUserId() adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.reject(
      adminId,
      id,
      dto.rejectionReason,
    );
    return new ProductResponseDto(product);
  }

  @Roles(UserRole.ADMIN)
  @Patch('admin/:id/remove')
  async removeByAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.removeByAdmin(id, reason);
    return new ProductResponseDto(product);
  }

  @Get('search')
  @IsPublic()
  async search(@Query() dto: SearchProductDto) {
    return this.productService.search(dto);
  }

  @Get(':id')
  @IsPublic()
  async findOneProductDetail(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductDetailsResponseDto> {
    const product = await this.productService.findOneProductDetail(id);
    return product;
  }
}
