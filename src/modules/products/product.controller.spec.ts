import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { RejectProductDto } from './dtos/reject-product.dto';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { SearchProductDto } from './dtos/search-product.dto';
import { ProductResponseDto } from './dtos/product.response.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';
import { SellerApprovedGuard } from '../../common/guards/seller-approved.guard';

const mockGuard = { canActivate: jest.fn(() => true) };

// Isolate the controller from ProductResponseDto's real transformation logic.
jest.mock('./dtos/product.response.dto', () => ({
  ProductResponseDto: jest.fn().mockImplementation((data) => data),
}));

describe('ProductController', () => {
  let controller: ProductController;

  const mockProductService = {
    create: jest.fn(),
    findMyProducts: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    hide: jest.fn(),
    unhide: jest.fn(),
    findForAdmin: jest.fn(),
    findOneForAdmin: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    removeByAdmin: jest.fn(),
    search: jest.fn(),
    findOneProductDetail: jest.fn(),
  };

  const userId = 'seller-1';
  const productId = 'product-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [{ provide: ProductService, useValue: mockProductService }],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .overrideGuard(SellerApprovedGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ProductController>(ProductController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call productService.create with user id and dto, returning a wrapped response', async () => {
      const dto = { name: 'Product A' } as CreateProductDto;
      const product = { id: productId, name: 'Product A' };
      mockProductService.create.mockResolvedValue(product);

      const result = await controller.create(userId, dto);

      expect(mockProductService.create).toHaveBeenCalledWith(userId, dto);
      expect(ProductResponseDto).toHaveBeenCalledWith(product);
      expect(result).toEqual(product);
    });
  });

  describe('findMyProducts', () => {
    it('should call productService.findMyProducts with user id and query', async () => {
      const query = { page: 1, limit: 20 };
      const products = [{ id: productId }];
      mockProductService.findMyProducts.mockResolvedValue({
        data: products,
        total: 1,
      });

      const result = await controller.findMyProducts(userId, query);

      expect(mockProductService.findMyProducts).toHaveBeenCalledWith(
        userId,
        query,
      );
      expect(result).toEqual({ data: products, total: 1 });
    });
  });

  describe('update', () => {
    it('should call productService.update with user id, product id and dto', async () => {
      const dto = { name: 'Updated' } as UpdateProductDto;
      const product = { id: productId, name: 'Updated' };
      mockProductService.update.mockResolvedValue(product);

      const result = await controller.update(userId, productId, dto);

      expect(mockProductService.update).toHaveBeenCalledWith(
        userId,
        productId,
        dto,
      );
      expect(result).toEqual(product);
    });
  });

  describe('remove', () => {
    it('should call productService.remove with user id and product id', async () => {
      mockProductService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(userId, productId);

      expect(mockProductService.remove).toHaveBeenCalledWith(userId, productId);
      expect(result).toBeUndefined();
    });
  });

  describe('hide', () => {
    it('should call productService.hide with user id and product id', async () => {
      const product = { id: productId, isHidden: true };
      mockProductService.hide.mockResolvedValue(product);

      const result = await controller.hide(userId, productId);

      expect(mockProductService.hide).toHaveBeenCalledWith(userId, productId);
      expect(result).toEqual(product);
    });
  });

  describe('unhide', () => {
    it('should call productService.unhide with user id and product id', async () => {
      const product = { id: productId, isHidden: false };
      mockProductService.unhide.mockResolvedValue(product);

      const result = await controller.unhide(userId, productId);

      expect(mockProductService.unhide).toHaveBeenCalledWith(userId, productId);
      expect(result).toEqual(product);
    });
  });

  describe('findForAdmin', () => {
    it('should call productService.findForAdmin with the query', async () => {
      const query = { page: 1, limit: 20 };
      const products = [{ id: productId }];
      mockProductService.findForAdmin.mockResolvedValue({
        data: products,
        total: 1,
      });

      const result = await controller.findForAdmin(query);

      expect(mockProductService.findForAdmin).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: products, total: 1 });
    });
  });

  describe('findOneForAdmin', () => {
    it('should call productService.findOneForAdmin with the id', async () => {
      const expected = { id: productId };
      mockProductService.findOneForAdmin.mockResolvedValue(expected);

      const result = await controller.findOneForAdmin(productId);

      expect(mockProductService.findOneForAdmin).toHaveBeenCalledWith(
        productId,
      );
      expect(result).toBe(expected);
    });
  });

  describe('approve', () => {
    it('should call productService.approve with admin id and product id', async () => {
      const adminId = 'admin-1';
      const product = { id: productId, status: 'approved' };
      mockProductService.approve.mockResolvedValue(product);

      const result = await controller.approve(adminId, productId);

      expect(mockProductService.approve).toHaveBeenCalledWith(
        adminId,
        productId,
      );
      expect(result).toEqual(product);
    });
  });

  describe('reject', () => {
    it('should call productService.reject with admin id, product id and rejection reason', async () => {
      const adminId = 'admin-1';
      const dto = { rejectionReason: 'Missing images' };
      const product = { id: productId, status: 'rejected' };
      mockProductService.reject.mockResolvedValue(product);

      const result = await controller.reject(adminId, productId, dto);

      expect(mockProductService.reject).toHaveBeenCalledWith(
        adminId,
        productId,
        dto.rejectionReason,
      );
      expect(result).toEqual(product);
    });
  });

  describe('removeByAdmin', () => {
    it('should call productService.removeByAdmin with product id and reason', async () => {
      const reason = 'Violates policy';
      const product = { id: productId, status: 'removed' };
      mockProductService.removeByAdmin.mockResolvedValue(product);

      const result = await controller.removeByAdmin(productId, reason);

      expect(mockProductService.removeByAdmin).toHaveBeenCalledWith(
        productId,
        reason,
      );
      expect(result).toEqual(product);
    });
  });

  describe('search', () => {
    it('should call productService.search with the search dto', async () => {
      const dto = { keyword: 'shoes' } as SearchProductDto;
      const expected = { data: [], total: 0 };
      mockProductService.search.mockResolvedValue(expected);

      const result = await controller.search(dto);

      expect(mockProductService.search).toHaveBeenCalledWith(dto);
      expect(result).toBe(expected);
    });
  });

  describe('findOneProductDetail', () => {
    it('should call productService.findOneProductDetail with the id', async () => {
      const expected = { id: productId };
      mockProductService.findOneProductDetail.mockResolvedValue(expected);

      const result = await controller.findOneProductDetail(productId);

      expect(mockProductService.findOneProductDetail).toHaveBeenCalledWith(
        productId,
      );
      expect(result).toBe(expected);
    });
  });
});
