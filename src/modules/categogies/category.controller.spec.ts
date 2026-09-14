import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { MoveCategoryDto } from './dtos/move-category.dto';
import { CategoryQueryDto } from '../../common/dtos/category-query.dto';
import { CategoryResponseDto } from './dtos/category.response.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';

const mockGuard = { canActivate: jest.fn(() => true) };

// Isolate the controller from CategoryResponseDto's real implementation:
// the mock simply echoes back whatever it was constructed with, so
// assertions can focus purely on "did the controller call the service
// correctly and pass the result through".
jest.mock('./dtos/category.response.dto', () => ({
  CategoryResponseDto: jest.fn().mockImplementation((data) => data),
}));

describe('CategoryController', () => {
  let controller: CategoryController;

  const mockCategoryService = {
    getPublicTree: jest.fn(),
    create: jest.fn(),
    getChildren: jest.fn(),
    getSubtree: jest.fn(),
    getAncestors: jest.fn(),
    update: jest.fn(),
    move: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [{ provide: CategoryService, useValue: mockCategoryService }],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<CategoryController>(CategoryController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPublicTree', () => {
    it('should call categoryService.getPublicTree and return its result', async () => {
      const expected = [{ id: 'cat-1', children: [] }];
      mockCategoryService.getPublicTree.mockResolvedValue(expected);

      const result = await controller.getPublicTree();

      expect(mockCategoryService.getPublicTree).toHaveBeenCalledWith();
      expect(result).toBe(expected);
    });
  });

  describe('create', () => {
    it('should call categoryService.create with the dto and return a wrapped response', async () => {
      const dto = { name: 'Electronics' } as CreateCategoryDto;
      const category = { id: 'cat-1', name: 'Electronics' };
      mockCategoryService.create.mockResolvedValue(category);

      const result = await controller.create(dto);

      expect(mockCategoryService.create).toHaveBeenCalledWith(dto);
      expect(CategoryResponseDto).toHaveBeenCalledWith(category);
      expect(result).toEqual(category);
    });
  });

  describe('findChildren', () => {
    it('should call categoryService.getChildren with the provided parentId', async () => {
      const query = { parentId: 'cat-1' } as CategoryQueryDto;
      const children = [{ id: 'cat-2' }, { id: 'cat-3' }];
      mockCategoryService.getChildren.mockResolvedValue(children);

      const result = await controller.findChildren(query);

      expect(mockCategoryService.getChildren).toHaveBeenCalledWith('cat-1');
      expect(result).toEqual(children);
    });

    it('should default parentId to null when not provided', async () => {
      const query = {} as CategoryQueryDto;
      mockCategoryService.getChildren.mockResolvedValue([]);

      await controller.findChildren(query);

      expect(mockCategoryService.getChildren).toHaveBeenCalledWith(null);
    });
  });

  describe('getSubtree', () => {
    it('should call categoryService.getSubtree with the id and map the results', async () => {
      const subtree = [{ id: 'cat-1' }, { id: 'cat-2' }];
      mockCategoryService.getSubtree.mockResolvedValue(subtree);

      const result = await controller.getSubtree('cat-1');

      expect(mockCategoryService.getSubtree).toHaveBeenCalledWith('cat-1');
      expect(result).toEqual(subtree);
    });
  });

  describe('getAncestors', () => {
    it('should call categoryService.getAncestors with the id and map the results', async () => {
      const ancestors = [{ id: 'cat-0' }];
      mockCategoryService.getAncestors.mockResolvedValue(ancestors);

      const result = await controller.getAncestors('cat-1');

      expect(mockCategoryService.getAncestors).toHaveBeenCalledWith('cat-1');
      expect(result).toEqual(ancestors);
    });
  });

  describe('update', () => {
    it('should call categoryService.update with id and dto and return a wrapped response', async () => {
      const dto = { name: 'Updated name' } as UpdateCategoryDto;
      const category = { id: 'cat-1', name: 'Updated name' };
      mockCategoryService.update.mockResolvedValue(category);

      const result = await controller.update('cat-1', dto);

      expect(mockCategoryService.update).toHaveBeenCalledWith('cat-1', dto);
      expect(result).toEqual(category);
    });
  });

  describe('move', () => {
    it('should call categoryService.move with the resolved payload', async () => {
      const dto = { newParentId: 'cat-2' } as MoveCategoryDto;
      mockCategoryService.move.mockResolvedValue(undefined);

      const result = await controller.move('cat-1', dto);

      expect(mockCategoryService.move).toHaveBeenCalledWith({
        categoryId: 'cat-1',
        newParentId: 'cat-2',
      });
      expect(result).toBeUndefined();
    });

    it('should default newParentId to null when not provided', async () => {
      const dto = {} as MoveCategoryDto;
      mockCategoryService.move.mockResolvedValue(undefined);

      await controller.move('cat-1', dto);

      expect(mockCategoryService.move).toHaveBeenCalledWith({
        categoryId: 'cat-1',
        newParentId: null,
      });
    });
  });

  describe('remove', () => {
    it('should call categoryService.remove with the id', async () => {
      mockCategoryService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('cat-1');

      expect(mockCategoryService.remove).toHaveBeenCalledWith('cat-1');
      expect(result).toBeUndefined();
    });
  });
});
