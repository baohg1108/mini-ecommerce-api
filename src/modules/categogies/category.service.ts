import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository, IsNull } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Category } from './entities/category.entity';
import { CategoryStatus } from '../../common/enums/category-status.enum';

interface CreateCategoryDto {
  name: string;
  slug: string;
  parentId?: string | null;
  iconUrl?: string;
  displayOrder?: number;
  status?: CategoryStatus;
}

interface MoveCategoryDto {
  categoryId: string;
  newParentId: string | null;
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

const PUBLIC_TREE_CACHE_KEY = 'categories:public:tree';
const PUBLIC_TREE_CACHE_TTL = 60 * 5 * 1000;

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async getPublicTree(): Promise<CategoryTreeNode[]> {
    const cached = await this.cacheManager.get<CategoryTreeNode[]>(
      PUBLIC_TREE_CACHE_KEY,
    );
    if (cached) return cached;

    const rows = await this.categoryRepo.find({
      where: { status: CategoryStatus.ACTIVE },
      order: { displayOrder: 'ASC' },
    });

    const tree = this.buildTree(rows, null);
    await this.cacheManager.set(
      PUBLIC_TREE_CACHE_KEY,
      tree,
      PUBLIC_TREE_CACHE_TTL,
    );

    return tree;
  }

  private buildTree(
    rows: Category[],
    parentId: string | null,
  ): CategoryTreeNode[] {
    return rows
      .filter((r) => r.parentId === parentId)
      .map((r) => ({
        ...r,
        children: this.buildTree(rows, r.id),
      }));
  }

  private async invalidatePublicCache(): Promise<void> {
    await this.cacheManager.del(PUBLIC_TREE_CACHE_KEY);
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const result = await this.dataSource.transaction(async (manager) => {
      if (dto.parentId) {
        const parent = await manager.findOne(Category, {
          where: { id: dto.parentId },
        });
        if (!parent) {
          throw new NotFoundException('Parent category not found');
        }
      }

      const existing = await manager.findOne(Category, {
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException('Slug already exists');
      }

      const category = manager.create(Category, {
        name: dto.name,
        slug: dto.slug,
        parentId: dto.parentId ?? null,
        iconUrl: dto.iconUrl ?? null,
        displayOrder: dto.displayOrder ?? 0,
        status: dto.status ?? CategoryStatus.ACTIVE,
      });

      return manager.save(Category, category);
    });

    await this.invalidatePublicCache();
    return result;
  }

  async getSubtree(categoryId: string): Promise<Category[]> {
    const node = await this.categoryRepo.findOne({
      where: { id: categoryId },
    });
    if (!node) throw new NotFoundException('Category not found');

    return this.categoryRepo.manager.query(
      `
      WITH RECURSIVE subtree AS (
        SELECT * FROM categories WHERE id = $1
        UNION ALL
        SELECT c.* FROM categories c
        INNER JOIN subtree s ON c.parent_id = s.id
      )
      SELECT * FROM subtree
      ORDER BY display_order ASC
      `,
      [categoryId],
    );
  }

  async getChildren(parentId: string | null): Promise<Category[]> {
    return this.categoryRepo.find({
      where: { parentId: parentId === null ? IsNull() : parentId },
      order: { displayOrder: 'ASC' },
    });
  }

  async getAncestors(categoryId: string): Promise<Category[]> {
    const node = await this.categoryRepo.findOne({
      where: { id: categoryId },
    });
    if (!node) throw new NotFoundException('Category not found');

    const rows: Category[] = await this.categoryRepo.manager.query(
      `
      WITH RECURSIVE ancestors AS (
        SELECT * FROM categories WHERE id = $1
        UNION ALL
        SELECT c.* FROM categories c
        INNER JOIN ancestors a ON c.id = a.parent_id
      )
      SELECT * FROM ancestors WHERE id != $1
      `,
      [categoryId],
    );

    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered: Category[] = [];
    let currentParentId = node.parentId;
    while (currentParentId && byId.has(currentParentId)) {
      const ancestor = byId.get(currentParentId)!;
      ordered.unshift(ancestor);
      currentParentId = ancestor.parentId;
    }
    return ordered;
  }

  async update(
    categoryId: string,
    dto: Partial<Omit<CreateCategoryDto, 'parentId'>>,
  ): Promise<Category> {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');

    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.categoryRepo.findOne({
        where: { slug: dto.slug },
      });
      if (existing) throw new ConflictException('Slug already exists');
    }

    Object.assign(category, dto);
    const result = await this.categoryRepo.save(category);

    await this.invalidatePublicCache();
    return result;
  }

  async move(dto: MoveCategoryDto): Promise<void> {
    const { categoryId, newParentId } = dto;

    if (categoryId === newParentId) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    await this.dataSource.transaction(async (manager) => {
      const node = await manager.findOne(Category, {
        where: { id: categoryId },
      });
      if (!node) throw new NotFoundException('Category not found');

      if (newParentId) {
        const newParent = await manager.findOne(Category, {
          where: { id: newParentId },
        });
        if (!newParent) {
          throw new NotFoundException('Parent category not found');
        }

        const ancestorRows: { id: string; parent_id: string | null }[] =
          await manager.query(
            `
            WITH RECURSIVE ancestors AS (
              SELECT id, parent_id FROM categories WHERE id = $1
              UNION ALL
              SELECT c.id, c.parent_id FROM categories c
              INNER JOIN ancestors a ON c.id = a.parent_id
            )
            SELECT * FROM ancestors
            `,
            [newParentId],
          );

        const isCycle = ancestorRows.some((row) => row.id === categoryId);
        if (isCycle) {
          throw new BadRequestException(
            'Category cannot be moved into its own subtree',
          );
        }
      }

      node.parentId = newParentId;
      await manager.save(Category, node);
    });

    await this.invalidatePublicCache();
  }

  async remove(categoryId: string): Promise<void> {
    const childCount = await this.categoryRepo.count({
      where: { parentId: categoryId },
    });
    if (childCount > 0) {
      throw new ConflictException(
        'Cannot delete category with child categories, please delete/move children first',
      );
    }
    await this.categoryRepo.delete(categoryId);

    await this.invalidatePublicCache();
  }
}
