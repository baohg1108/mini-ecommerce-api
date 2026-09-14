import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

import { ReviewsService } from './reviews.service';
import { Review } from './entities/review.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { Shop } from '../shops/entities/shop.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';

// Định nghĩa Type an toàn cho Query Builder để không dính lỗi Unsafe Call
type MockQueryBuilder = {
  innerJoin: jest.Mock;
  leftJoin: jest.Mock;
  select: jest.Mock;
  addSelect: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  getMany: jest.Mock;
  getRawOne: jest.Mock;
};

describe('ReviewsService (Full Coverage Unit Tests)', () => {
  let service: ReviewsService;

  const mockQueryBuilder: MockQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getRawOne: jest.fn(),
  };

  const mockReviewRepo = {
    findOne: jest.fn(),
    save: jest.fn().mockImplementation((data: unknown) =>
      Promise.resolve({
        id: 'review-1',
        ...(data as Record<string, unknown>),
      }),
    ),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockEntityManager = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => {
      return data;
    }),
    save: jest.fn().mockImplementation((data: unknown) => {
      return Promise.resolve({
        id: 'saved-review-1',
        ...(data as Record<string, unknown>),
      });
    }),
    update: jest.fn().mockResolvedValue(true),
  };

  const mockDataSource = {
    transaction: jest
      .fn()
      .mockImplementation(
        (cb: (manager: typeof mockEntityManager) => unknown) => {
          return cb(mockEntityManager);
        },
      ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getRepositoryToken(Review), useValue: mockReviewRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    jest.clearAllMocks();
  });

  describe('createReview', () => {
    // Ép kiểu mock OrderItem an toàn
    const dummyOrderItem = {
      id: 'oi-1',
      order: { shopId: 'shop-1' },
    } as unknown as OrderItem;

    const dto: CreateReviewDto = {
      orderItemId: 'oi-1',
      rating: 5,
      comment: 'Great product!',
    };

    it('should throw NotFoundException if variant/product not found in order item', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      await expect(
        service.createReview('user-1', dummyOrderItem, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully create review and update ratings (with valid avg data)', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: 'oi-1',
        variant: { productId: 'prod-1' },
      });

      // Mock kết quả tính trung bình sao của DB trả về
      mockQueryBuilder.getRawOne.mockResolvedValue({
        avg: '4.5',
        count: '10',
      });

      const result = await service.createReview('user-1', dummyOrderItem, dto);

      expect(result).toBeDefined();
      expect(mockEntityManager.save).toHaveBeenCalled();

      // Update cho Product & Shop được gọi (2 lần)
      expect(mockEntityManager.update).toHaveBeenCalledTimes(2);
      expect(mockEntityManager.update).toHaveBeenNthCalledWith(
        1,
        Product,
        'prod-1',
        { avgRating: 4.5, reviewCount: 10 },
      );
      expect(mockEntityManager.update).toHaveBeenNthCalledWith(
        2,
        Shop,
        'shop-1',
        { avgRating: 4.5, reviewCount: 10 },
      );
    });

    it('should handle null/fallback logic when avg/count data is missing', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: 'oi-1',
        variant: { productId: 'prod-1' },
      });

      // Mock raw trả về null (sản phẩm chưa có ai review trước đó)
      mockQueryBuilder.getRawOne.mockResolvedValue(null);

      await service.createReview('user-1', dummyOrderItem, dto);

      // Phải fallback về 0 an toàn mà không dính lỗi NaN
      expect(mockEntityManager.update).toHaveBeenNthCalledWith(
        1,
        Product,
        'prod-1',
        { avgRating: 0, reviewCount: 0 },
      );
    });
  });

  describe('replyReview', () => {
    const dto: ReplyReviewDto = { reply: 'Cảm ơn bạn đã mua hàng!' };

    it('should throw NotFoundException if review does not exist', async () => {
      mockReviewRepo.findOne.mockResolvedValue(null);

      await expect(
        service.replyReview('rev-1', 'seller-1', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if replier is not the shop owner', async () => {
      mockReviewRepo.findOne.mockResolvedValue({
        id: 'rev-1',
        shop: { userId: 'different-seller' },
      });

      await expect(
        service.replyReview('rev-1', 'seller-1', dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully update review with seller reply', async () => {
      mockReviewRepo.findOne.mockResolvedValue({
        id: 'rev-1',
        shop: { userId: 'seller-1' },
        sellerReply: null,
      });

      const result = await service.replyReview('rev-1', 'seller-1', dto);

      expect(result.sellerReply).toBe(dto.reply);
      expect(mockReviewRepo.save).toHaveBeenCalled();
    });
  });

  describe('findByProduct', () => {
    it('should return list of reviews for a product', async () => {
      const mockReviews = [{ id: 'rev-1' }, { id: 'rev-2' }];
      mockQueryBuilder.getMany.mockResolvedValue(mockReviews);

      const result = await service.findByProduct('prod-1');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'variant.productId = :productId',
        { productId: 'prod-1' },
      );
      expect(result.length).toBe(2);
    });
  });
});
