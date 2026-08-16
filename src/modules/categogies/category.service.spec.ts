import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { CategoryService } from './category.service';
import { Category } from './entities/category.entity';
import { CategoryStatus } from '../../common/enums/category-status.enum';

/**
 * Test matrix reference: category_test_matrix.xlsx — sheet "Category Test Matrix"
 * IDs CAT-UNIT-028 .. CAT-UNIT-054 (all flagged "Production").
 * FR-10 (SRS §5.3): Admin quản lý danh mục sản phẩm cấp hệ thống.
 */

const PUBLIC_TREE_CACHE_KEY = 'categories:public:tree';
const PUBLIC_TREE_CACHE_TTL = 60 * 5 * 1000;

interface MockRepo {
  find: jest.Mock;
  findOne: jest.Mock;
  count: jest.Mock;
  delete: jest.Mock;
  save: jest.Mock;
  manager: { query: jest.Mock };
}

interface MockManager {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  query: jest.Mock;
}

interface MockDataSource {
  transaction: jest.Mock;
}

interface MockCacheManager {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
}

interface FindOneByIdOptions {
  where: { id: string };
}

describe('CategoryService', () => {
  let service: CategoryService;
  let categoryRepo: MockRepo;
  let manager: MockManager;
  let dataSource: MockDataSource;
  let cacheManager: MockCacheManager;

  const makeCategory = (overrides: Partial<Category> = {}): Category => ({
    id: 'cat-id',
    parentId: null,
    name: 'Category',
    slug: 'category',
    iconUrl: null,
    displayOrder: 0,
    status: CategoryStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    parent: null,
    children: [],
    ...overrides,
  });

  beforeEach(async () => {
    manager = {
      findOne: jest.fn(),
      create: jest.fn(
        (_entityClass: typeof Category, plain: Partial<Category>): Category =>
          plain as Category,
      ),
      save: jest.fn(
        (_entityClass: typeof Category, entity: Category): Promise<Category> =>
          Promise.resolve(entity),
      ),
      query: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn((cb: (m: MockManager) => unknown) => cb(manager)),
    };

    categoryRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
      save: jest.fn((entity: Category): Promise<Category> =>
        Promise.resolve(entity),
      ),
      manager: { query: jest.fn() },
    };

    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================
  // getPublicTree()
  // ==========================================================
  describe('getPublicTree', () => {
    // CAT-UNIT-028
    it('trả về dữ liệu từ cache khi cache hit và không truy vấn DB', async () => {
      const cached = [{ id: '1', children: [] }];
      cacheManager.get.mockResolvedValue(cached);

      const result = await service.getPublicTree();

      expect(cacheManager.get).toHaveBeenCalledWith(PUBLIC_TREE_CACHE_KEY);
      expect(result).toEqual(cached);
      expect(categoryRepo.find).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    // CAT-UNIT-029
    it('truy vấn DB, build cây và set cache khi cache miss', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      const rows = [
        makeCategory({ id: '1', parentId: null }),
        makeCategory({ id: '2', parentId: '1' }),
      ];
      categoryRepo.find.mockResolvedValue(rows);

      const result = await service.getPublicTree();

      expect(categoryRepo.find).toHaveBeenCalledWith({
        where: { status: CategoryStatus.ACTIVE },
        order: { displayOrder: 'ASC' },
      });
      expect(cacheManager.set).toHaveBeenCalledWith(
        PUBLIC_TREE_CACHE_KEY,
        expect.any(Array),
        PUBLIC_TREE_CACHE_TTL,
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('2');
    });

    // CAT-UNIT-030 (multi-level nesting, exercised through getPublicTree)
    it('build cây lồng đúng nhiều cấp cha-con', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      const rows = [
        makeCategory({ id: 'root', parentId: null }),
        makeCategory({ id: 'child', parentId: 'root' }),
        makeCategory({ id: 'grandchild', parentId: 'child' }),
      ];
      categoryRepo.find.mockResolvedValue(rows);

      const [root] = await service.getPublicTree();

      expect(root.id).toBe('root');
      expect(root.children[0].id).toBe('child');
      expect(root.children[0].children[0].id).toBe('grandchild');
      expect(root.children[0].children[0].children).toEqual([]);
    });

    // CAT-UNIT-031
    it('trả về mảng rỗng khi không có danh mục nào', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      categoryRepo.find.mockResolvedValue([]);

      const result = await service.getPublicTree();

      expect(result).toEqual([]);
    });
  });

  // ==========================================================
  // create()
  // ==========================================================
  describe('create', () => {
    // CAT-UNIT-032
    it('ném NotFoundException khi parentId không tồn tại', async () => {
      manager.findOne.mockResolvedValue(null); // parent lookup

      await expect(
        service.create({ name: 'A', slug: 'a', parentId: 'not-exist' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.create({ name: 'A', slug: 'a', parentId: 'not-exist' }),
      ).rejects.toThrow('Parent category not found');
    });

    // CAT-UNIT-033
    it('ném ConflictException khi slug đã tồn tại', async () => {
      manager.findOne.mockResolvedValueOnce(
        makeCategory({ id: 'existing', slug: 'dien-thoai' }),
      ); // slug lookup (no parentId branch)

      await expect(
        service.create({ name: 'A', slug: 'dien-thoai' }),
      ).rejects.toThrow(ConflictException);
    });

    // CAT-UNIT-034
    it('tạo danh mục gốc thành công và invalidate cache', async () => {
      manager.findOne.mockResolvedValueOnce(null); // slug check -> not found

      const dto = { name: 'Điện thoại', slug: 'dien-thoai' };
      const result = await service.create(dto);

      expect(manager.save).toHaveBeenCalledWith(
        Category,
        expect.objectContaining({
          name: 'Điện thoại',
          slug: 'dien-thoai',
          parentId: null,
          iconUrl: null,
          displayOrder: 0,
          status: CategoryStatus.ACTIVE,
        }),
      );
      expect(cacheManager.del).toHaveBeenCalledWith(PUBLIC_TREE_CACHE_KEY);
      expect(result).toBeDefined();
    });

    // CAT-UNIT-035
    it('tạo danh mục con thành công khi parentId hợp lệ', async () => {
      manager.findOne
        .mockResolvedValueOnce(makeCategory({ id: 'parent-id' })) // parent lookup
        .mockResolvedValueOnce(null); // slug lookup

      const dto = { name: 'iPhone', slug: 'iphone', parentId: 'parent-id' };
      await service.create(dto);

      expect(manager.save).toHaveBeenCalledWith(
        Category,
        expect.objectContaining({ parentId: 'parent-id' }),
      );
      expect(cacheManager.del).toHaveBeenCalledWith(PUBLIC_TREE_CACHE_KEY);
    });
  });

  // ==========================================================
  // getSubtree()
  // ==========================================================
  describe('getSubtree', () => {
    // CAT-UNIT-036
    it('ném NotFoundException khi categoryId không tồn tại', async () => {
      categoryRepo.findOne.mockResolvedValue(null);

      await expect(service.getSubtree('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    // CAT-UNIT-037
    it('trả về node + toàn bộ hậu duệ qua CTE, đúng tham số truyền vào', async () => {
      const node = makeCategory({ id: 'root-id' });
      categoryRepo.findOne.mockResolvedValue(node);
      const subtreeRows = [
        node,
        makeCategory({ id: 'child-id', parentId: 'root-id' }),
      ];
      categoryRepo.manager.query.mockResolvedValue(subtreeRows);

      const result = await service.getSubtree('root-id');

      expect(categoryRepo.manager.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE subtree'),
        ['root-id'],
      );
      expect(result).toEqual(subtreeRows);
    });
  });

  // ==========================================================
  // getChildren()
  // ==========================================================
  describe('getChildren', () => {
    // CAT-UNIT-038
    it('truy vấn với IsNull() cho parentId khi lấy danh mục gốc', async () => {
      categoryRepo.find.mockResolvedValue([]);

      await service.getChildren(null);

      expect(categoryRepo.find).toHaveBeenCalledWith({
        where: { parentId: IsNull() },
        order: { displayOrder: 'ASC' },
      });
    });

    // CAT-UNIT-039
    it('truy vấn đúng theo parentId cụ thể', async () => {
      categoryRepo.find.mockResolvedValue([]);

      await service.getChildren('abc-uuid');

      expect(categoryRepo.find).toHaveBeenCalledWith({
        where: { parentId: 'abc-uuid' },
        order: { displayOrder: 'ASC' },
      });
    });
  });

  // ==========================================================
  // getAncestors()
  // ==========================================================
  describe('getAncestors', () => {
    // CAT-UNIT-040
    it('ném NotFoundException khi categoryId không tồn tại', async () => {
      categoryRepo.findOne.mockResolvedValue(null);

      await expect(service.getAncestors('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    // CAT-UNIT-041
    it('trả về danh sách tổ tiên sắp xếp từ gốc đến cha trực tiếp', async () => {
      const node = makeCategory({ id: 'B', parentId: 'A' });
      const ancestorA = makeCategory({ id: 'A', parentId: 'root' });
      const ancestorRoot = makeCategory({ id: 'root', parentId: null });

      categoryRepo.findOne.mockResolvedValue(node);
      categoryRepo.manager.query.mockResolvedValue([
        node,
        ancestorA,
        ancestorRoot,
      ]);

      const result = await service.getAncestors('B');

      expect(result.map((c) => c.id)).toEqual(['root', 'A']);
    });

    // CAT-UNIT-042
    it('trả về mảng rỗng khi danh mục là gốc (không có cha)', async () => {
      const rootNode = makeCategory({ id: 'root', parentId: null });
      categoryRepo.findOne.mockResolvedValue(rootNode);
      categoryRepo.manager.query.mockResolvedValue([rootNode]);

      const result = await service.getAncestors('root');

      expect(result).toEqual([]);
    });
  });

  // ==========================================================
  // update()
  // ==========================================================
  describe('update', () => {
    // CAT-UNIT-043
    it('ném NotFoundException khi category không tồn tại', async () => {
      categoryRepo.findOne.mockResolvedValue(null);

      await expect(service.update('missing-id', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    // CAT-UNIT-044
    it('ném ConflictException khi slug mới trùng danh mục khác', async () => {
      const category = makeCategory({ id: 'id-1', slug: 'dien-thoai-cu' });
      categoryRepo.findOne
        .mockResolvedValueOnce(category) // findOne by id
        .mockResolvedValueOnce(
          makeCategory({ id: 'id-2', slug: 'dien-thoai' }),
        ); // findOne by new slug

      await expect(
        service.update('id-1', { slug: 'dien-thoai' }),
      ).rejects.toThrow(ConflictException);
    });

    // CAT-UNIT-045
    it('không kiểm tra trùng slug khi slug không đổi', async () => {
      const category = makeCategory({ id: 'id-1', slug: 'dien-thoai' });
      categoryRepo.findOne.mockResolvedValueOnce(category); // only the "by id" lookup

      await service.update('id-1', {
        slug: 'dien-thoai',
        name: 'Điện thoại mới',
      });

      // Only one findOne call (by id) — no extra slug-conflict lookup
      expect(categoryRepo.findOne).toHaveBeenCalledTimes(1);
    });

    // CAT-UNIT-046
    it('cập nhật thành công và invalidate cache', async () => {
      const category = makeCategory({ id: 'id-1' });
      categoryRepo.findOne.mockResolvedValue(category);

      const dto = { name: 'Tên mới', displayOrder: 5 };
      const result = await service.update('id-1', dto);

      expect(categoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'id-1',
          name: 'Tên mới',
          displayOrder: 5,
        }),
      );
      expect(cacheManager.del).toHaveBeenCalledWith(PUBLIC_TREE_CACHE_KEY);
      expect(result.name).toBe('Tên mới');
    });
  });

  // ==========================================================
  // move()
  // ==========================================================
  describe('move', () => {
    // CAT-UNIT-047
    it('ném BadRequestException khi categoryId === newParentId', async () => {
      await expect(
        service.move({ categoryId: 'X', newParentId: 'X' }),
      ).rejects.toThrow(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    // CAT-UNIT-048
    it('ném NotFoundException khi node (categoryId) không tồn tại', async () => {
      manager.findOne.mockResolvedValueOnce(null); // node lookup

      await expect(
        service.move({ categoryId: 'missing', newParentId: 'Y' }),
      ).rejects.toThrow(NotFoundException);
    });

    // CAT-UNIT-049
    it('ném NotFoundException khi newParentId không tồn tại', async () => {
      manager.findOne
        .mockResolvedValueOnce(makeCategory({ id: 'X' })) // node
        .mockResolvedValueOnce(null); // newParent lookup

      await expect(
        service.move({ categoryId: 'X', newParentId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
    });

    // CAT-UNIT-050
    it('ném BadRequestException khi di chuyển vào chính subtree của nó (cycle)', async () => {
      manager.findOne.mockImplementation(
        (
          _entityClass: typeof Category,
          opts: FindOneByIdOptions,
        ): Promise<Category | null> => {
          if (opts.where.id === 'A') {
            return Promise.resolve(makeCategory({ id: 'A' }));
          }
          if (opts.where.id === 'A-child') {
            return Promise.resolve(makeCategory({ id: 'A-child' }));
          }
          return Promise.resolve(null);
        },
      );
      // ancestors of newParentId ('A-child') include categoryId 'A' => cycle
      manager.query.mockResolvedValue([
        { id: 'A-child', parent_id: 'A' },
        { id: 'A', parent_id: null },
      ]);

      await expect(
        service.move({ categoryId: 'A', newParentId: 'A-child' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.move({ categoryId: 'A', newParentId: 'A-child' }),
      ).rejects.toThrow('Category cannot be moved into its own subtree');
    });

    // CAT-UNIT-051
    it('di chuyển thành công đến cha mới hợp lệ và invalidate cache', async () => {
      const node = makeCategory({ id: 'X', parentId: 'old-parent' });
      manager.findOne
        .mockResolvedValueOnce(node) // node
        .mockResolvedValueOnce(makeCategory({ id: 'Y' })); // newParent
      manager.query.mockResolvedValue([{ id: 'Y', parent_id: null }]); // no cycle

      await service.move({ categoryId: 'X', newParentId: 'Y' });

      expect(node.parentId).toBe('Y');
      expect(manager.save).toHaveBeenCalledWith(Category, node);
      expect(cacheManager.del).toHaveBeenCalledWith(PUBLIC_TREE_CACHE_KEY);
    });

    // CAT-UNIT-052
    it('di chuyển về danh mục gốc thành công khi newParentId=null, bỏ qua kiểm tra cycle', async () => {
      const node = makeCategory({ id: 'X', parentId: 'old-parent' });
      manager.findOne.mockResolvedValueOnce(node); // only node lookup

      await service.move({ categoryId: 'X', newParentId: null });

      expect(manager.query).not.toHaveBeenCalled();
      expect(node.parentId).toBeNull();
      expect(manager.save).toHaveBeenCalledWith(Category, node);
      expect(cacheManager.del).toHaveBeenCalledWith(PUBLIC_TREE_CACHE_KEY);
    });
  });

  // ==========================================================
  // remove()
  // ==========================================================
  describe('remove', () => {
    // CAT-UNIT-053
    it('ném ConflictException khi danh mục còn danh mục con', async () => {
      categoryRepo.count.mockResolvedValue(2);

      await expect(service.remove('cat-with-children')).rejects.toThrow(
        ConflictException,
      );
      expect(categoryRepo.delete).not.toHaveBeenCalled();
    });

    // CAT-UNIT-054
    it('xoá thành công danh mục không có con và invalidate cache', async () => {
      categoryRepo.count.mockResolvedValue(0);
      categoryRepo.delete.mockResolvedValue({ affected: 1 });

      await service.remove('leaf-id');

      expect(categoryRepo.delete).toHaveBeenCalledWith('leaf-id');
      expect(cacheManager.del).toHaveBeenCalledWith(PUBLIC_TREE_CACHE_KEY);
    });
  });
});
