import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { RefundRequestsService } from './refund-requests.service';
import { RefundRequest } from './entities/refund-request.entity';
import { Order } from '../orders/entities/order.entity';
import { Shop } from '../shops/entities/shop.entity';
import { UsersService } from '../users/users.service';
import { PaymentService } from '../payment/payment.service';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { RefundRequestStatus } from '../../common/enums/refund-request-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { AppException } from '../../common/exceptions/app.exception';
import { CreateRefundRequestDto } from './dtos/create-refund-request.dto';
import { RejectRefundRequestDto } from './dtos/reject-refund-request.dto';
import { RefundRequestListQueryDto } from './dtos/refund-request-list-query.dto';

type MockQueryBuilder = {
  leftJoinAndSelect: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  getManyAndCount: jest.Mock;
};

describe('RefundRequestsService (Full Coverage Unit Tests)', () => {
  let service: RefundRequestsService;

  const mockQueryBuilder: MockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockRefundRequestRepository = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data: unknown) => data),
    save: jest.fn().mockImplementation((data: unknown) =>
      Promise.resolve({
        id: 'refund-1',
        ...(data as Record<string, unknown>),
      }),
    ),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockOrderRepository = {
    findOne: jest.fn(),
  };

  const mockShopRepository = {
    findOne: jest.fn(),
  };

  const mockUsersService = {
    findUserById: jest.fn(),
  };

  const mockPaymentService = {
    refundByOrderId: jest.fn().mockResolvedValue(true),
  };

  const mockEntityManager = {
    findOne: jest.fn(),
    save: jest
      .fn()
      .mockImplementation((_entityOrClass: unknown, data: unknown) => {
        return Promise.resolve({
          id: 'saved-id',
          ...(data as Record<string, unknown>),
        });
      }),
  };

  const mockDataSource = {
    transaction: jest
      .fn()
      .mockImplementation(
        (cb: (manager: typeof mockEntityManager) => unknown) => {
          return cb(mockEntityManager);
        },
      ),
    manager: mockEntityManager,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundRequestsService,
        {
          provide: getRepositoryToken(RefundRequest),
          useValue: mockRefundRequestRepository,
        },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
        { provide: getRepositoryToken(Shop), useValue: mockShopRepository },
        { provide: UsersService, useValue: mockUsersService },
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<RefundRequestsService>(RefundRequestsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto: CreateRefundRequestDto = { reason: 'Broken product' };

    it('should throw NOT_FOUND if order does not exist', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);
      await expect(service.create('order-1', 'user-1', dto)).rejects.toThrow(
        AppException,
      );
    });

    it('should throw FORBIDDEN if user is not order owner', async () => {
      mockOrderRepository.findOne.mockResolvedValue({
        id: 'order-1',
        userId: 'other-user',
      });
      await expect(service.create('order-1', 'user-1', dto)).rejects.toThrow(
        AppException,
      );
    });

    it('should throw CONFLICT if order status is not eligible', async () => {
      mockOrderRepository.findOne.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.PENDING_CONFIRMATION,
      });
      await expect(service.create('order-1', 'user-1', dto)).rejects.toThrow(
        AppException,
      );
    });

    it('should throw CONFLICT if deliveredAt is missing', async () => {
      mockOrderRepository.findOne.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.DELIVERED,
        deliveredAt: null,
      });
      await expect(service.create('order-1', 'user-1', dto)).rejects.toThrow(
        AppException,
      );
    });

    it('should throw CONFLICT if refund window has expired', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      mockOrderRepository.findOne.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.DELIVERED,
        deliveredAt: oldDate,
      });
      await expect(service.create('order-1', 'user-1', dto)).rejects.toThrow(
        AppException,
      );
    });

    it('should throw CONFLICT if there is already a pending request', async () => {
      const recentDate = new Date();
      mockOrderRepository.findOne.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.DELIVERED,
        deliveredAt: recentDate,
      });
      mockRefundRequestRepository.findOne.mockResolvedValue({
        id: 'req-1',
        status: RefundRequestStatus.PENDING,
      });

      await expect(service.create('order-1', 'user-1', dto)).rejects.toThrow(
        AppException,
      );
    });

    it('should successfully create a refund request', async () => {
      const recentDate = new Date();
      mockOrderRepository.findOne.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.DELIVERED,
        deliveredAt: recentDate,
      });
      mockRefundRequestRepository.findOne.mockResolvedValue(null);

      const result = await service.create('order-1', 'user-1', dto);
      expect(result).toBeDefined();
      expect(mockRefundRequestRepository.save).toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    it('should approve refund for COD payment method', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce({
          id: 'req-1',
          orderId: 'order-1',
          status: RefundRequestStatus.PENDING,
          reason: 'Defect',
        })
        .mockResolvedValueOnce({
          id: 'order-1',
          shopId: 'shop-1',
          status: OrderStatus.DELIVERED,
        })
        .mockResolvedValueOnce({
          id: 'pay-1',
          orderId: 'order-1',
          method: PaymentMethod.COD,
        });

      mockUsersService.findUserById.mockResolvedValue({
        id: 'admin-1',
        role: UserRole.ADMIN,
      });

      const result = await service.approve('req-1', 'admin-1');
      expect(result).toBeDefined();
      expect(mockPaymentService.refundByOrderId).not.toHaveBeenCalled();
    });

    it('should approve refund for Online payment method and trigger gateway', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce({
          id: 'req-1',
          orderId: 'order-1',
          status: RefundRequestStatus.PENDING,
          reason: 'Defect',
        })
        .mockResolvedValueOnce({
          id: 'order-1',
          shopId: 'shop-1',
          status: OrderStatus.DELIVERED,
        })
        .mockResolvedValueOnce({
          id: 'pay-1',
          orderId: 'order-1',
          method: PaymentMethod.VNPAY,
        });

      mockUsersService.findUserById.mockResolvedValue({
        id: 'admin-1',
        role: UserRole.ADMIN,
      });

      const result = await service.approve('req-1', 'admin-1');
      expect(result).toBeDefined();
      expect(mockPaymentService.refundByOrderId).toHaveBeenCalledWith(
        'order-1',
        'Defect',
      );
    });

    it('should throw NOT_FOUND if payment record is missing on approve', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce({
          id: 'req-1',
          orderId: 'order-1',
          status: RefundRequestStatus.PENDING,
        })
        .mockResolvedValueOnce({
          id: 'order-1',
          shopId: 'shop-1',
        })
        .mockResolvedValueOnce(null);

      mockUsersService.findUserById.mockResolvedValue({
        id: 'admin-1',
        role: UserRole.ADMIN,
      });

      await expect(service.approve('req-1', 'admin-1')).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('retryRefund', () => {
    it('should throw NOT_FOUND if request not found', async () => {
      mockRefundRequestRepository.findOne.mockResolvedValue(null);
      await expect(service.retryRefund('req-999', 'admin-1')).rejects.toThrow(
        AppException,
      );
    });

    it('should throw CONFLICT if request is not approved', async () => {
      mockRefundRequestRepository.findOne.mockResolvedValue({
        id: 'req-1',
        status: RefundRequestStatus.PENDING,
      });
      await expect(service.retryRefund('req-1', 'admin-1')).rejects.toThrow(
        AppException,
      );
    });

    it('should throw NOT_FOUND if order not found', async () => {
      mockRefundRequestRepository.findOne.mockResolvedValue({
        id: 'req-1',
        status: RefundRequestStatus.APPROVED,
        orderId: 'order-1',
      });
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(service.retryRefund('req-1', 'admin-1')).rejects.toThrow(
        AppException,
      );
    });

    it('should throw CONFLICT if order already refunded', async () => {
      mockRefundRequestRepository.findOne.mockResolvedValue({
        id: 'req-1',
        status: RefundRequestStatus.APPROVED,
        orderId: 'order-1',
      });
      mockOrderRepository.findOne.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.REFUNDED,
      });
      mockUsersService.findUserById.mockResolvedValue({
        id: 'admin-1',
        role: UserRole.ADMIN,
      });

      await expect(service.retryRefund('req-1', 'admin-1')).rejects.toThrow(
        AppException,
      );
    });

    it('should successfully retry gateway refund', async () => {
      mockRefundRequestRepository.findOne.mockResolvedValue({
        id: 'req-1',
        status: RefundRequestStatus.APPROVED,
        orderId: 'order-1',
        reason: 'Error',
      });
      mockOrderRepository.findOne.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.REFUND_REQUESTED,
      });
      mockUsersService.findUserById.mockResolvedValue({
        id: 'admin-1',
        role: UserRole.ADMIN,
      });

      const result = await service.retryRefund('req-1', 'admin-1');
      expect(result).toBeDefined();
      expect(mockPaymentService.refundByOrderId).toHaveBeenCalledWith(
        'order-1',
        'Error',
      );
    });
  });

  describe('reject', () => {
    const rejectDto: RejectRefundRequestDto = {
      rejectionReason: 'Invalid reason',
    };

    it('should successfully reject refund request', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce({
          id: 'req-1',
          orderId: 'order-1',
          status: RefundRequestStatus.PENDING,
        })
        .mockResolvedValueOnce({
          id: 'order-1',
          shopId: 'shop-1',
        });

      mockUsersService.findUserById.mockResolvedValue({
        id: 'admin-1',
        role: UserRole.ADMIN,
      });

      const result = await service.reject('req-1', 'admin-1', rejectDto);
      expect(result).toBeDefined();
      expect(mockEntityManager.save).toHaveBeenCalled();
    });
  });

  describe('findForSeller & findForAdmin (Queries)', () => {
    const query: RefundRequestListQueryDto = {
      page: 1,
      limit: 10,
      status: RefundRequestStatus.PENDING,
      fromDate: '2026-01-01',
      toDate: '2026-12-31',
    };

    it('should throw NOT_FOUND if shop not found for seller', async () => {
      mockShopRepository.findOne.mockResolvedValue(null);
      await expect(service.findForSeller('seller-1', query)).rejects.toThrow(
        AppException,
      );
    });

    it('should return paginated list for seller', async () => {
      mockShopRepository.findOne.mockResolvedValue({ id: 'shop-1' });
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [
          {
            id: 'req-1',
            orderId: 'order-1',
            status: RefundRequestStatus.PENDING,
            order: { orderCode: 'ORD-01', shopId: 'shop-1', user: {} },
          },
        ],
        1,
      ]);

      const result = await service.findForSeller('seller-1', query);
      expect(result.meta.totalItems).toBe(1);
      expect(result.items.length).toBe(1);
    });

    it('should return paginated list for admin', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findForAdmin({
        ...query,
        shopId: 'shop-1',
      });
      expect(result.meta.totalItems).toBe(0);
    });
  });

  describe('assertCanReview (Authorization checks)', () => {
    it('should throw UNAUTHORIZED if user not found', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: 'req-1',
        status: RefundRequestStatus.PENDING,
        orderId: 'order-1',
      });
      mockUsersService.findUserById.mockResolvedValue(null);

      await expect(service.approve('req-1', 'unknown-user')).rejects.toThrow(
        AppException,
      );
    });

    it('should throw FORBIDDEN if seller reviews other shop order', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce({
          id: 'req-1',
          status: RefundRequestStatus.PENDING,
          orderId: 'order-1',
        })
        .mockResolvedValueOnce({
          id: 'order-1',
          shopId: 'shop-1',
        })
        .mockResolvedValueOnce({
          id: 'shop-1',
          userId: 'owner-shop-1',
        });

      mockUsersService.findUserById.mockResolvedValue({
        id: 'seller-2',
        role: UserRole.SELLER,
      });

      await expect(service.approve('req-1', 'seller-2')).rejects.toThrow(
        AppException,
      );
    });
  });
});
