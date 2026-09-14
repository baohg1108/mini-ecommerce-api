import { Test, TestingModule } from '@nestjs/testing';
import { RefundReviewController } from './refund-review.controller';
import { RefundRequestsService } from './refund-requests.service';
import { RejectRefundRequestDto } from './dtos/reject-refund-request.dto';
import { RefundRequestListQueryDto } from './dtos/refund-request-list-query.dto';
import { RefundRequestListResponseDto } from './dtos/refund-request-list.response.dto';
import { RefundRequestResponseDto } from './dtos/refund-request.response.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';

const mockGuard = { canActivate: jest.fn(() => true) };

describe('RefundReviewController', () => {
  let controller: RefundReviewController;

  const mockRefundRequestsService = {
    findForSeller: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    retryRefund: jest.fn(),
  };

  const userId = 'seller-1';
  const refundId = 'refund-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefundReviewController],
      providers: [
        { provide: RefundRequestsService, useValue: mockRefundRequestsService },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<RefundReviewController>(RefundReviewController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findForSeller', () => {
    it('should call refundRequestsService.findForSeller with seller id and query', async () => {
      const query = { page: 1, limit: 20 } as RefundRequestListQueryDto;
      const expected = {
        data: [],
        total: 0,
      } as unknown as RefundRequestListResponseDto;
      mockRefundRequestsService.findForSeller.mockResolvedValue(expected);

      const result = await controller.findForSeller(userId, query);

      expect(mockRefundRequestsService.findForSeller).toHaveBeenCalledWith(
        userId,
        query,
      );
      expect(result).toBe(expected);
    });
  });

  describe('approve', () => {
    it('should call refundRequestsService.approve with id and user id', async () => {
      const expected = {
        id: refundId,
        status: 'approved',
      } as unknown as RefundRequestResponseDto;
      mockRefundRequestsService.approve.mockResolvedValue(expected);

      const result = await controller.approve(userId, refundId);

      expect(mockRefundRequestsService.approve).toHaveBeenCalledWith(
        refundId,
        userId,
      );
      expect(result).toBe(expected);
    });
  });

  describe('reject', () => {
    it('should call refundRequestsService.reject with id, user id and dto', async () => {
      const dto = { reason: 'Not eligible' } as RejectRefundRequestDto;
      const expected = {
        id: refundId,
        status: 'rejected',
      } as unknown as RefundRequestResponseDto;
      mockRefundRequestsService.reject.mockResolvedValue(expected);

      const result = await controller.reject(userId, refundId, dto);

      expect(mockRefundRequestsService.reject).toHaveBeenCalledWith(
        refundId,
        userId,
        dto,
      );
      expect(result).toBe(expected);
    });
  });

  describe('retryRefund', () => {
    it('should call refundRequestsService.retryRefund with id and user id', async () => {
      const expected = {
        id: refundId,
        status: 'processing',
      } as unknown as RefundRequestResponseDto;
      mockRefundRequestsService.retryRefund.mockResolvedValue(expected);

      const result = await controller.retryRefund(userId, refundId);

      expect(mockRefundRequestsService.retryRefund).toHaveBeenCalledWith(
        refundId,
        userId,
      );
      expect(result).toBe(expected);
    });
  });
});
