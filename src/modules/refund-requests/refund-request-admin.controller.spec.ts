import { Test, TestingModule } from '@nestjs/testing';
import { RefundAdminController } from './refund-admin.controller';
import { RefundRequestsService } from './refund-requests.service';
import { RefundRequestListQueryDto } from './dtos/refund-request-list-query.dto';
import { RefundRequestListResponseDto } from './dtos/refund-request-list.response.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';

const mockGuard = { canActivate: jest.fn(() => true) };

describe('RefundAdminController', () => {
  let controller: RefundAdminController;

  const mockRefundRequestsService = {
    findForAdmin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefundAdminController],
      providers: [
        { provide: RefundRequestsService, useValue: mockRefundRequestsService },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<RefundAdminController>(RefundAdminController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findForAdmin', () => {
    it('should call refundRequestsService.findForAdmin with the query', async () => {
      const query = { page: 1, limit: 20 } as RefundRequestListQueryDto;
      const expected = {
        data: [],
        total: 0,
      } as unknown as RefundRequestListResponseDto;
      mockRefundRequestsService.findForAdmin.mockResolvedValue(expected);

      const result = await controller.findForAdmin(query);

      expect(mockRefundRequestsService.findForAdmin).toHaveBeenCalledWith(
        query,
      );
      expect(result).toBe(expected);
    });
  });
});
