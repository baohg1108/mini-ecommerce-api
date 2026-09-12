import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { Category } from './entities/category.entity';
import { CategoryStatus } from '../../common/enums/category-status.enum';

describe('CategoryService', () => {
  let service: CategoryService;
  let cacheManager: Cache;

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

  // transaction đã là một jest.Mock, ta có thể dùng trực tiếp nó trong các test case
  const mockDataSource = {
    transaction: jest
      .fn()
      .mockImplementation(
        (cb: (manager: EntityManager) => Promise<unknown>) => {
          const manager = {
            findOne: jest.fn(),
            create: jest.fn((_entity: unknown, dto: unknown) => dto),
            save: jest.fn((_entity: unknown, obj: unknown) =>
              Promise.resolve({ id: 'cat-uuid-1', ...(obj as object) }),
            ),
            query: jest.fn(),
          } as unknown as EntityManager;
          return cb(manager);
        },
      ),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPublicTree', () => {
    it('should return cached tree if available', async () => {
      const cachedTree = [
        { id: '1', name: 'Electronics', children: [] },
      ] as unknown as Category[];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedTree);

      const result = await service.getPublicTree();
      expect(result).toEqual(cachedTree);
      expect(cacheManager.get).toHaveBeenCalledTimes(1);
    });

    it('should fetch from db, build tree and cache if not cached', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
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
      expect(result.length).toEqual(1);
      expect(result[0].children.length).toEqual(1);
      expect(cacheManager.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('should throw ConflictException if slug already exists', async () => {
      const dto = { name: 'Phone', slug: 'phone' } as Parameters<
        typeof service.create
      >[0];

      // Sử dụng trực tiếp mockDataSource.transaction thay vì dùng jest.spyOn
      mockDataSource.transaction.mockImplementationOnce(
        (cb: (manager: EntityManager) => Promise<unknown>) => {
          const manager = {
            findOne: jest
              .fn()
              .mockResolvedValue({ id: 'existing', slug: 'phone' }),
          } as unknown as EntityManager;
          return cb(manager);
        },
      );

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if parentId does not exist', async () => {
      const dto = {
        name: 'Phone',
        slug: 'phone',
        parentId: 'invalid-parent',
      } as Parameters<typeof service.create>[0];

      mockDataSource.transaction.mockImplementationOnce(
        (cb: (manager: EntityManager) => Promise<unknown>) => {
          const manager = {
            findOne: jest.fn().mockResolvedValue(null),
          } as unknown as EntityManager;
          return cb(manager);
        },
      );

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if category to update not found', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(null);
      const updateDto = { name: 'New' } as Parameters<typeof service.update>[1];

      await expect(service.update('non-existent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if updated slug already exists', async () => {
      mockCategoryRepo.findOne
        .mockResolvedValueOnce({ id: 'cat-1', slug: 'old-slug' })
        .mockResolvedValueOnce({ id: 'cat-2', slug: 'new-slug' });

      const updateDto = { slug: 'new-slug' } as Parameters<
        typeof service.update
      >[1];
      await expect(service.update('cat-1', updateDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('move', () => {
    it('should throw BadRequestException if category tries to be its own parent', async () => {
      const dto = { categoryId: 'cat-1', newParentId: 'cat-1' } as Parameters<
        typeof service.move
      >[0];
      await expect(service.move(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if moving into its own subtree (cycle detection)', async () => {
      mockDataSource.transaction.mockImplementationOnce(
        (cb: (manager: EntityManager) => Promise<unknown>) => {
          const manager = {
            findOne: jest.fn().mockResolvedValue({ id: 'parent-node' }),
            query: jest
              .fn()
              .mockResolvedValue([{ id: 'cat-1', parent_id: null }]),
          } as unknown as EntityManager;
          return cb(manager);
        },
      );

      const dto = {
        categoryId: 'cat-1',
        newParentId: 'parent-node',
      } as Parameters<typeof service.move>[0];
      await expect(service.move(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should throw ConflictException if category has child categories', async () => {
      mockCategoryRepo.count.mockResolvedValue(2);
      await expect(service.remove('cat-1')).rejects.toThrow(ConflictException);
    });

    it('should successfully delete category if no children exist', async () => {
      mockCategoryRepo.count.mockResolvedValue(0);
      mockCategoryRepo.delete.mockResolvedValue({ affected: 1 });

      await service.remove('cat-1');
      expect(mockCategoryRepo.delete).toHaveBeenCalledWith('cat-1');
      expect(cacheManager.del).toHaveBeenCalled();
    });
  });
});
