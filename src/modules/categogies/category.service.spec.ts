import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { Category } from './entities/category.entity';
import { CategoryStatus } from '../../common/enums/category-status.enum';

const PUBLIC_TREE_CACHE_KEY = 'categories:public:tree';
const PUBLIC_TREE_CACHE_TTL = 60 * 5 * 1000;

// import tạm 1 giá trị status không phải ACTIVE để test các trường hợp tạo category với status khác mặc định
const NON_DEFAULT_STATUS = Object.values(CategoryStatus).find(
  (s) => s !== CategoryStatus.ACTIVE,
) as CategoryStatus;

type MockManager = {
  findOne?: jest.Mock;
  create?: jest.Mock;
  save?: jest.Mock;
  query?: jest.Mock;
};

describe('CategoryService', () => {
  let service: CategoryService;

  const mockCategoryRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    save: jest.fn(),
    manager: {
      query: jest.fn(),
    },
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  // Test cho lần gọi transaction kế tiếp chạy callback với manager giả
  const withManager = (manager: MockManager) => {
    mockDataSource.transaction.mockImplementationOnce(
      (cb: (m: EntityManager) => Promise<unknown>) =>
        cb(manager as unknown as EntityManager),
    );
  };

  beforeEach(async () => {
    // resetAllMocks: xoá cả implementation/Once-queue còn sót giữa các test
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: getRepositoryToken(Category), useValue: mockCategoryRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  // CAT-UNIT-001
  it('CAT-UNIT-001: should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPublicTree', () => {
    // CAT-UNIT-028
    it('CAT-UNIT-028: should return cached tree if available (cache hit)', async () => {
      const cachedTree = [
        { id: '1', name: 'Electronics', children: [] },
      ] as unknown as Category[];
      mockCacheManager.get.mockResolvedValue(cachedTree);

      const result = await service.getPublicTree();

      expect(result).toEqual(cachedTree);
      expect(mockCacheManager.get).toHaveBeenCalledTimes(1);
      expect(mockCacheManager.get).toHaveBeenCalledWith(PUBLIC_TREE_CACHE_KEY);
      expect(mockCategoryRepo.find).not.toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    // CAT-UNIT-029
    it('CAT-UNIT-029: should fetch from db, build tree and cache if not cached', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      const rows = [
        {
          id: '1',
          name: 'Root',
          parentId: null,
          status: CategoryStatus.ACTIVE,
          displayOrder: 0,
        },
        {
          id: '2',
          name: 'Child',
          parentId: '1',
          status: CategoryStatus.ACTIVE,
          displayOrder: 0,
        },
      ];
      mockCategoryRepo.find.mockResolvedValue(rows);

      const result = await service.getPublicTree();

      expect(mockCategoryRepo.find).toHaveBeenCalledWith({
        where: { status: CategoryStatus.ACTIVE },
        order: { displayOrder: 'ASC' },
      });
      expect(result.length).toEqual(1);
      expect(result[0].children.length).toEqual(1);
      expect(result[0].children[0].id).toEqual('2');
      expect(mockCacheManager.set).toHaveBeenCalledTimes(1);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        PUBLIC_TREE_CACHE_KEY,
        result,
        PUBLIC_TREE_CACHE_TTL,
      );
    });

    // CAT-UNIT-030
    it('CAT-UNIT-030: should return empty array and still cache when db has no active category', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockCategoryRepo.find.mockResolvedValue([]);

      const result = await service.getPublicTree();

      expect(result).toEqual([]);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        PUBLIC_TREE_CACHE_KEY,
        [],
        PUBLIC_TREE_CACHE_TTL,
      );
    });
  });

  describe('create', () => {
    // CAT-UNIT-033
    it('CAT-UNIT-033: should throw ConflictException if slug already exists', async () => {
      const dto = { name: 'Phone', slug: 'phone' };
      withManager({
        findOne: jest.fn().mockResolvedValue({ id: 'existing', slug: 'phone' }),
      });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });

    // CAT-UNIT-032
    it('CAT-UNIT-032: should throw NotFoundException if parentId does not exist', async () => {
      const dto = { name: 'Phone', slug: 'phone', parentId: 'invalid-parent' };
      withManager({ findOne: jest.fn().mockResolvedValue(null) });

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });

    // CAT-UNIT-031
    it('CAT-UNIT-031: should create category with all fields provided and invalidate cache', async () => {
      const dto = {
        name: 'Phone',
        slug: 'phone',
        parentId: 'parent-1',
        iconUrl: 'http://icon.png',
        displayOrder: 5,
        status: NON_DEFAULT_STATUS,
      };
      const manager = {
        // lần 1: tìm parent -> có; lần 2: kiểm tra slug -> chưa tồn tại
        findOne: jest
          .fn()
          .mockResolvedValueOnce({ id: 'parent-1' })
          .mockResolvedValueOnce(null),
        create: jest.fn((_e: unknown, d: unknown) => d),
        save: jest.fn((_e: unknown, obj: unknown) =>
          Promise.resolve({ id: 'cat-uuid-1', ...(obj as object) }),
        ),
      };
      withManager(manager);

      const result = await service.create(dto);

      expect(manager.findOne).toHaveBeenNthCalledWith(1, Category, {
        where: { id: 'parent-1' },
      });
      expect(manager.findOne).toHaveBeenNthCalledWith(2, Category, {
        where: { slug: 'phone' },
      });
      expect(manager.create).toHaveBeenCalledWith(Category, {
        name: 'Phone',
        slug: 'phone',
        parentId: 'parent-1',
        iconUrl: 'http://icon.png',
        displayOrder: 5,
        status: NON_DEFAULT_STATUS,
      });
      expect(result).toEqual(
        expect.objectContaining({ id: 'cat-uuid-1', slug: 'phone' }),
      );
      expect(mockCacheManager.del).toHaveBeenCalledWith(PUBLIC_TREE_CACHE_KEY);
    });

    // CAT-UNIT-034
    it('CAT-UNIT-034: should create category with default values when optional fields are omitted', async () => {
      const manager = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((_e: unknown, d: unknown) => d),
        save: jest.fn((_e: unknown, obj: unknown) =>
          Promise.resolve({ id: 'cat-uuid-2', ...(obj as object) }),
        ),
      };
      withManager(manager);

      await service.create({ name: 'Laptop', slug: 'laptop' });

      // không có parentId -> chỉ kiểm tra slug
      expect(manager.findOne).toHaveBeenCalledTimes(1);
      expect(manager.create).toHaveBeenCalledWith(Category, {
        name: 'Laptop',
        slug: 'laptop',
        parentId: null,
        iconUrl: null,
        displayOrder: 0,
        status: CategoryStatus.ACTIVE,
      });
      expect(mockCacheManager.del).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSubtree', () => {
    // CAT-UNIT-036
    it('CAT-UNIT-036: should throw NotFoundException if category does not exist', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(null);

      await expect(service.getSubtree('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCategoryRepo.manager.query).not.toHaveBeenCalled();
    });

    // CAT-UNIT-037
    it('CAT-UNIT-037: should return subtree rows from recursive query', async () => {
      const rows = [{ id: 'cat-1' }, { id: 'cat-2' }];
      mockCategoryRepo.findOne.mockResolvedValue({ id: 'cat-1' });
      mockCategoryRepo.manager.query.mockResolvedValue(rows);

      const result = await service.getSubtree('cat-1');

      expect(result).toEqual(rows);
      expect(mockCategoryRepo.manager.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE subtree'),
        ['cat-1'],
      );
    });
  });

  describe('getChildren', () => {
    // CAT-UNIT-038
    it('CAT-UNIT-038: should query root categories using IsNull() when parentId is null', async () => {
      const rows = [{ id: 'root-1' }];
      mockCategoryRepo.find.mockResolvedValue(rows);

      const result = await service.getChildren(null);

      expect(result).toEqual(rows);
      expect(mockCategoryRepo.find).toHaveBeenCalledWith({
        where: { parentId: IsNull() },
        order: { displayOrder: 'ASC' },
      });
    });

    // CAT-UNIT-039
    it('CAT-UNIT-039: should query children by parentId when parentId is provided', async () => {
      const rows = [{ id: 'child-1' }];
      mockCategoryRepo.find.mockResolvedValue(rows);

      const result = await service.getChildren('parent-1');

      expect(result).toEqual(rows);
      expect(mockCategoryRepo.find).toHaveBeenCalledWith({
        where: { parentId: 'parent-1' },
        order: { displayOrder: 'ASC' },
      });
    });
  });

  describe('getAncestors', () => {
    // CAT-UNIT-040
    it('CAT-UNIT-040: should throw NotFoundException if category does not exist', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(null);

      await expect(service.getAncestors('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCategoryRepo.manager.query).not.toHaveBeenCalled();
    });

    // CAT-UNIT-041
    it('CAT-UNIT-041: should return empty array when category is a root (no parent)', async () => {
      mockCategoryRepo.findOne.mockResolvedValue({
        id: 'root',
        parentId: null,
      });
      mockCategoryRepo.manager.query.mockResolvedValue([]);

      const result = await service.getAncestors('root');

      expect(result).toEqual([]);
    });

    // CAT-UNIT-042
    it('CAT-UNIT-042: should return ancestors ordered from root to direct parent', async () => {
      const grandParent = { id: 'a', parentId: null };
      const parent = { id: 'b', parentId: 'a' };
      mockCategoryRepo.findOne.mockResolvedValue({ id: 'c', parentId: 'b' });
      // query trả về không theo thứ tự
      mockCategoryRepo.manager.query.mockResolvedValue([grandParent, parent]);

      const result = await service.getAncestors('c');

      expect(result).toEqual([grandParent, parent]);
      expect(mockCategoryRepo.manager.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE ancestors'),
        ['c'],
      );
    });

    // CAT-UNIT-055
    it('CAT-UNIT-055: should stop walking when an ancestor is missing from query result', async () => {
      const parent = { id: 'b', parentId: 'missing-grand' };
      mockCategoryRepo.findOne.mockResolvedValue({ id: 'c', parentId: 'b' });
      mockCategoryRepo.manager.query.mockResolvedValue([parent]);

      const result = await service.getAncestors('c');

      expect(result).toEqual([parent]);
    });
  });

  describe('update', () => {
    // CAT-UNIT-043
    it('CAT-UNIT-043: should throw NotFoundException if category to update not found', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockCategoryRepo.save).not.toHaveBeenCalled();
      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });

    // CAT-UNIT-044
    it('CAT-UNIT-044: should throw ConflictException if updated slug already exists', async () => {
      mockCategoryRepo.findOne
        .mockResolvedValueOnce({ id: 'cat-1', slug: 'old-slug' })
        .mockResolvedValueOnce({ id: 'cat-2', slug: 'new-slug' });

      await expect(
        service.update('cat-1', { slug: 'new-slug' }),
      ).rejects.toThrow(ConflictException);
      expect(mockCategoryRepo.save).not.toHaveBeenCalled();
      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });

    // CAT-UNIT-045
    it('CAT-UNIT-045: should update fields without slug check when dto has no slug', async () => {
      mockCategoryRepo.findOne.mockResolvedValue({
        id: 'cat-1',
        slug: 'old-slug',
        name: 'Old',
      });
      mockCategoryRepo.save.mockImplementation((c: unknown) =>
        Promise.resolve(c),
      );

      const result = await service.update('cat-1', { name: 'New' });

      expect(mockCategoryRepo.findOne).toHaveBeenCalledTimes(1);
      expect(mockCategoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cat-1', name: 'New', slug: 'old-slug' }),
      );
      expect(result).toEqual(expect.objectContaining({ name: 'New' }));
      expect(mockCacheManager.del).toHaveBeenCalledWith(PUBLIC_TREE_CACHE_KEY);
    });

    // CAT-UNIT-046
    it('CAT-UNIT-046: should update successfully when new slug is unique', async () => {
      mockCategoryRepo.findOne
        .mockResolvedValueOnce({ id: 'cat-1', slug: 'old-slug' })
        .mockResolvedValueOnce(null);
      mockCategoryRepo.save.mockImplementation((c: unknown) =>
        Promise.resolve(c),
      );

      const result = await service.update('cat-1', { slug: 'new-slug' });

      expect(mockCategoryRepo.findOne).toHaveBeenCalledTimes(2);
      expect(mockCategoryRepo.findOne).toHaveBeenNthCalledWith(2, {
        where: { slug: 'new-slug' },
      });
      expect(result).toEqual(expect.objectContaining({ slug: 'new-slug' }));
      expect(mockCacheManager.del).toHaveBeenCalledTimes(1);
    });

    // CAT-UNIT-056
    it('CAT-UNIT-056: should skip slug uniqueness check when slug is unchanged', async () => {
      mockCategoryRepo.findOne.mockResolvedValue({
        id: 'cat-1',
        slug: 'same-slug',
      });
      mockCategoryRepo.save.mockImplementation((c: unknown) =>
        Promise.resolve(c),
      );

      await service.update('cat-1', { slug: 'same-slug' });

      expect(mockCategoryRepo.findOne).toHaveBeenCalledTimes(1);
      expect(mockCategoryRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('move', () => {
    // CAT-UNIT-047
    it('CAT-UNIT-047: should throw BadRequestException if category tries to be its own parent', async () => {
      await expect(
        service.move({ categoryId: 'cat-1', newParentId: 'cat-1' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    // CAT-UNIT-048
    it('CAT-UNIT-048: should throw NotFoundException if category to move does not exist', async () => {
      withManager({ findOne: jest.fn().mockResolvedValue(null) });

      await expect(
        service.move({ categoryId: 'missing', newParentId: null }),
      ).rejects.toThrow(NotFoundException);
      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });

    // CAT-UNIT-049
    it('CAT-UNIT-049: should throw NotFoundException if new parent does not exist', async () => {
      withManager({
        findOne: jest
          .fn()
          .mockResolvedValueOnce({ id: 'cat-1', parentId: null })
          .mockResolvedValueOnce(null),
      });

      await expect(
        service.move({ categoryId: 'cat-1', newParentId: 'missing-parent' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });

    // CAT-UNIT-050
    it('CAT-UNIT-050: should throw BadRequestException if moving into its own subtree (cycle detection)', async () => {
      const manager = {
        findOne: jest.fn().mockResolvedValue({ id: 'parent-node' }),
        query: jest.fn().mockResolvedValue([{ id: 'cat-1', parent_id: null }]),
        save: jest.fn(),
      };
      withManager(manager);

      await expect(
        service.move({ categoryId: 'cat-1', newParentId: 'parent-node' }),
      ).rejects.toThrow(BadRequestException);
      expect(manager.save).not.toHaveBeenCalled();
      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });

    // CAT-UNIT-051
    it('CAT-UNIT-051: should move category under a valid new parent and invalidate cache', async () => {
      const node = { id: 'cat-1', parentId: null as string | null };
      const manager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(node)
          .mockResolvedValueOnce({ id: 'parent-node' }),
        query: jest
          .fn()
          .mockResolvedValue([{ id: 'parent-node', parent_id: null }]),
        save: jest.fn().mockResolvedValue(undefined),
      };
      withManager(manager);

      await service.move({ categoryId: 'cat-1', newParentId: 'parent-node' });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE ancestors'),
        ['parent-node'],
      );
      expect(node.parentId).toBe('parent-node');
      expect(manager.save).toHaveBeenCalledWith(Category, node);
      expect(mockCacheManager.del).toHaveBeenCalledWith(PUBLIC_TREE_CACHE_KEY);
    });

    // CAT-UNIT-052
    it('CAT-UNIT-052: should move category to root when newParentId is null (skip cycle check)', async () => {
      const node = { id: 'cat-1', parentId: 'old-parent' as string | null };
      const manager = {
        findOne: jest.fn().mockResolvedValue(node),
        query: jest.fn(),
        save: jest.fn().mockResolvedValue(undefined),
      };
      withManager(manager);

      await service.move({ categoryId: 'cat-1', newParentId: null });

      expect(manager.findOne).toHaveBeenCalledTimes(1);
      expect(manager.query).not.toHaveBeenCalled();
      expect(node.parentId).toBeNull();
      expect(manager.save).toHaveBeenCalledWith(Category, node);
      expect(mockCacheManager.del).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    // CAT-UNIT-053
    it('CAT-UNIT-053: should throw ConflictException if category has child categories', async () => {
      mockCategoryRepo.count.mockResolvedValue(2);

      await expect(service.remove('cat-1')).rejects.toThrow(ConflictException);
      expect(mockCategoryRepo.delete).not.toHaveBeenCalled();
      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });

    // CAT-UNIT-054
    it('CAT-UNIT-054: should successfully delete category if no children exist', async () => {
      mockCategoryRepo.count.mockResolvedValue(0);
      mockCategoryRepo.delete.mockResolvedValue({ affected: 1 });

      await service.remove('cat-1');

      expect(mockCategoryRepo.count).toHaveBeenCalledWith({
        where: { parentId: 'cat-1' },
      });
      expect(mockCategoryRepo.delete).toHaveBeenCalledWith('cat-1');
      expect(mockCacheManager.del).toHaveBeenCalledWith(PUBLIC_TREE_CACHE_KEY);
    });
  });
});
