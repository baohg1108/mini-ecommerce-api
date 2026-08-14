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
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dtos/create.category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { MoveCategoryDto } from './dtos/move-category';
import { CategoryQueryDto } from '../../common/dtos/category-query.dto';
import { CategoryResponseDto } from './dtos/category.response.dto';
import { CategoryTreeNode } from './category.service';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/role.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { IsPublic } from '../../common/decorators/public.decorator';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @IsPublic()
  @Get('tree')
  async getPublicTree(): Promise<CategoryTreeNode[]> {
    return this.categoryService.getPublicTree();
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const category = await this.categoryService.create(dto);
    return new CategoryResponseDto(category);
  }

  @IsPublic()
  @Get()
  async findChildren(
    @Query() query: CategoryQueryDto,
  ): Promise<CategoryResponseDto[]> {
    const children = await this.categoryService.getChildren(
      query.parentId ?? null,
    );
    return children.map((c) => new CategoryResponseDto(c));
  }

  @IsPublic()
  @Get(':id/subtree')
  async getSubtree(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponseDto[]> {
    const subtree = await this.categoryService.getSubtree(id);
    return subtree.map((c) => new CategoryResponseDto(c));
  }

  @IsPublic()
  @Get(':id/ancestors')
  async getAncestors(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponseDto[]> {
    const ancestors = await this.categoryService.getAncestors(id);
    return ancestors.map((c) => new CategoryResponseDto(c));
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryService.update(id, dto);
    return new CategoryResponseDto(category);
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/move')
  async move(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveCategoryDto,
  ): Promise<void> {
    await this.categoryService.move({
      categoryId: id,
      newParentId: dto.newParentId ?? null,
    });
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.categoryService.remove(id);
  }
}
