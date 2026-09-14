import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import type { RequestWithUser } from '../../common/types/request-with-user.type';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';
import { ReviewEligibilityGuard } from '../../common/guards/review-eligibility.guard';

const mockGuard = { canActivate: jest.fn(() => true) };

describe('ReviewsController', () => {
  let controller: ReviewsController;

  const mockReviewsService = {
    createReview: jest.fn(),
    findByProduct: jest.fn(),
    replyReview: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [{ provide: ReviewsService, useValue: mockReviewsService }],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .overrideGuard(ReviewEligibilityGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ReviewsController>(ReviewsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call reviewsService.createReview with user id, order item and dto', () => {
      const dto = { rating: 5, comment: 'Great!' } as CreateReviewDto;
      const orderItem = { id: 'order-item-1' };
      const req = {
        user: { sub: 'user-1' },
        orderItem,
      } as unknown as RequestWithUser;
      const expected = { id: 'review-1' };
      mockReviewsService.createReview.mockReturnValue(expected);

      const result = controller.create(dto, req);

      expect(mockReviewsService.createReview).toHaveBeenCalledWith(
        'user-1',
        orderItem,
        dto,
      );
      expect(result).toBe(expected);
    });
  });

  describe('getByProduct', () => {
    it('should call reviewsService.findByProduct with the product id', () => {
      const productId = 'product-1';
      const expected = [{ id: 'review-1' }];
      mockReviewsService.findByProduct.mockReturnValue(expected);

      const result = controller.getByProduct(productId);

      expect(mockReviewsService.findByProduct).toHaveBeenCalledWith(productId);
      expect(result).toBe(expected);
    });
  });

  describe('reply', () => {
    it('should call reviewsService.replyReview with review id, user id and dto', () => {
      const reviewId = 'review-1';
      const dto = { reply: 'Thanks for the feedback!' };
      const req = { user: { sub: 'seller-1' } } as unknown as RequestWithUser;
      const expected = { id: reviewId, reply: dto.reply };
      mockReviewsService.replyReview.mockReturnValue(expected);

      const result = controller.reply(reviewId, dto, req);

      expect(mockReviewsService.replyReview).toHaveBeenCalledWith(
        reviewId,
        'seller-1',
        dto,
      );
      expect(result).toBe(expected);
    });
  });
});
