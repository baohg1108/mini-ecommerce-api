import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dtos/create.category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { MoveCategoryDto } from './dtos/move-category';
import { CategoryQueryDto } from '../../common/dtos/category-query.dto';
import { CategoryResponseDto } from './dtos/category.response.dto';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  async create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const category = await this.categoryService.create(dto);
    return new CategoryResponseDto(category);
  }

  @Get()
  async findChildren(
    @Query() query: CategoryQueryDto,
  ): Promise<CategoryResponseDto[]> {
    const children = await this.categoryService.getChildren(
      query.parentId ?? null,
    );
    return children.map((c) => new CategoryResponseDto(c));
  }

  @Get(':id/subtree')
  async getSubtree(@Param('id') id: string): Promise<CategoryResponseDto[]> {
    const subtree = await this.categoryService.getSubtree(id);
    return subtree.map((c) => new CategoryResponseDto(c));
  }

  @Get(':id/ancestors')
  async getAncestors(@Param('id') id: string): Promise<CategoryResponseDto[]> {
    const ancestors = await this.categoryService.getAncestors(id);
    return ancestors.map((c) => new CategoryResponseDto(c));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryService.update(id, dto);
    return new CategoryResponseDto(category);
  }

  @Patch(':id/move')
  async move(
    @Param('id') id: string,
    @Body() dto: MoveCategoryDto,
  ): Promise<void> {
    await this.categoryService.move({
      categoryId: id,
      newParentId: dto.newParentId ?? null,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.categoryService.remove(id);
  }
}
