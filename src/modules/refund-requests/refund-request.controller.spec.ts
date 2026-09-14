import { Test, TestingModule } from '@nestjs/testing';
import { RefundRequestsController } from './refund-requests.controller';
import { RefundRequestsService } from './refund-requests.service';
import { CreateRefundRequestDto } from './dtos/create-refund-request.dto';
import { RefundRequestResponseDto } from './dtos/refund-request.response.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';

const mockGuard = { canActivate: jest.fn(() => true) };

describe('RefundRequestsController', () => {
  let controller: RefundRequestsController;

  const mockRefundRequestsService = {
    create: jest.fn(),
  };

  const userId = 'customer-1';
  const orderId = 'order-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefundRequestsController],
      providers: [
        { provide: RefundRequestsService, useValue: mockRefundRequestsService },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<RefundRequestsController>(RefundRequestsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call refundRequestsService.create with order id, user id and dto', async () => {
      const dto = { reason: 'Item damaged' };
      const expected = {
        id: 'refund-1',
        orderId,
      } as unknown as RefundRequestResponseDto;
      mockRefundRequestsService.create.mockResolvedValue(expected);

      const result = await controller.create(userId, orderId, dto);

      expect(mockRefundRequestsService.create).toHaveBeenCalledWith(
        orderId,
        userId,
        dto,
      );
      expect(result).toBe(expected);
    });
  });
});
