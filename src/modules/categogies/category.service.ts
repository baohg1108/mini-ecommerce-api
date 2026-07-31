import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository, IsNull } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
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

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    return this.dataSource.transaction(async (manager) => {
      if (dto.parentId) {
        const parent = await manager.findOne(Category, {
          where: { id: dto.parentId },
        });
        if (!parent) {
          throw new NotFoundException('Không tìm thấy danh mục cha');
        }
      }

      const existing = await manager.findOne(Category, {
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException('Slug đã tồn tại');
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
  }

  async getSubtree(categoryId: string): Promise<Category[]> {
    const node = await this.categoryRepo.findOne({
      where: { id: categoryId },
    });
    if (!node) throw new NotFoundException('Không tìm thấy danh mục');

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
    if (!node) throw new NotFoundException('Không tìm thấy danh mục');

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
    if (!category) throw new NotFoundException('Không tìm thấy danh mục');

    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.categoryRepo.findOne({
        where: { slug: dto.slug },
      });
      if (existing) throw new ConflictException('Slug đã tồn tại');
    }

    Object.assign(category, dto);
    return this.categoryRepo.save(category);
  }

  async move(dto: MoveCategoryDto): Promise<void> {
    const { categoryId, newParentId } = dto;

    if (categoryId === newParentId) {
      throw new BadRequestException('Danh mục không thể là cha của chính nó');
    }

    await this.dataSource.transaction(async (manager) => {
      const node = await manager.findOne(Category, {
        where: { id: categoryId },
      });
      if (!node) throw new NotFoundException('Không tìm thấy danh mục');

      if (newParentId) {
        const newParent = await manager.findOne(Category, {
          where: { id: newParentId },
        });
        if (!newParent) {
          throw new NotFoundException('Không tìm thấy danh mục cha mới');
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
            'Không thể di chuyển danh mục vào chính nhánh con của nó',
          );
        }
      }

      node.parentId = newParentId;
      await manager.save(Category, node);
    });
  }

  async remove(categoryId: string): Promise<void> {
    const childCount = await this.categoryRepo.count({
      where: { parentId: categoryId },
    });
    if (childCount > 0) {
      throw new ConflictException(
        'Không thể xoá danh mục còn danh mục con, hãy xoá/di chuyển con trước',
      );
    }
    await this.categoryRepo.delete(categoryId);
  }
}
