import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dtos/create-order.dto';
import { CancelOrderDto } from './dtos/cancel-order.dto';
import { AdminOrderQueryDto } from './dtos/admin-order-query.dto';
import { OrderResponseDto } from './dtos/order.response.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';

const mockGuard = { canActivate: jest.fn(() => true) };

describe('OrdersController', () => {
  let controller: OrdersController;

  const mockOrdersService = {
    checkout: jest.fn(),
    findMyOrders: jest.fn(),
    findById: jest.fn(),
    confirmOrder: jest.fn(),
    markPreparing: jest.fn(),
    markShipping: jest.fn(),
    markDelivered: jest.fn(),
    completeOrder: jest.fn(),
    cancelOrder: jest.fn(),
    cancelOrderByCustomer: jest.fn(),
    adminFindAll: jest.fn(),
  };

  const userId = 'customer-1';
  const sellerUserId = 'seller-1';
  const orderId = 'order-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkout', () => {
    it('should call ordersService.checkout with user id and dto', async () => {
      const dto = { paymentMethod: 'cod' } as CreateOrderDto;
      const expected = [{ id: orderId }] as unknown as OrderResponseDto[];
      mockOrdersService.checkout.mockResolvedValue(expected);

      const result = await controller.checkout(userId, dto);

      expect(mockOrdersService.checkout).toHaveBeenCalledWith(userId, dto);
      expect(result).toBe(expected);
    });
  });

  describe('findMyOrders', () => {
    it('should call ordersService.findMyOrders with the current user id', async () => {
      const expected = [{ id: orderId }] as unknown as OrderResponseDto[];
      mockOrdersService.findMyOrders.mockResolvedValue(expected);

      const result = await controller.findMyOrders(userId);

      expect(mockOrdersService.findMyOrders).toHaveBeenCalledWith(userId);
      expect(result).toBe(expected);
    });
  });

  describe('findById', () => {
    it('should call ordersService.findById with id and user id', async () => {
      const expected = { id: orderId } as unknown as OrderResponseDto;
      mockOrdersService.findById.mockResolvedValue(expected);

      const result = await controller.findById(userId, orderId);

      expect(mockOrdersService.findById).toHaveBeenCalledWith(orderId, userId);
      expect(result).toBe(expected);
    });
  });

  describe('confirmCodOrder', () => {
    it('should call ordersService.confirmOrder with id and seller id', async () => {
      const expected = { id: orderId } as unknown as OrderResponseDto;
      mockOrdersService.confirmOrder.mockResolvedValue(expected);

      const result = await controller.confirmCodOrder(sellerUserId, orderId);

      expect(mockOrdersService.confirmOrder).toHaveBeenCalledWith(
        orderId,
        sellerUserId,
      );
      expect(result).toBe(expected);
    });
  });

  describe('confirmOrder', () => {
    it('should call ordersService.confirmOrder with id and seller id', async () => {
      const expected = { id: orderId } as unknown as OrderResponseDto;
      mockOrdersService.confirmOrder.mockResolvedValue(expected);

      const result = await controller.confirmOrder(sellerUserId, orderId);

      expect(mockOrdersService.confirmOrder).toHaveBeenCalledWith(
        orderId,
        sellerUserId,
      );
      expect(result).toBe(expected);
    });
  });

  describe('markPreparing', () => {
    it('should call ordersService.markPreparing with id and seller id', async () => {
      const expected = { id: orderId } as unknown as OrderResponseDto;
      mockOrdersService.markPreparing.mockResolvedValue(expected);

      const result = await controller.markPreparing(sellerUserId, orderId);

      expect(mockOrdersService.markPreparing).toHaveBeenCalledWith(
        orderId,
        sellerUserId,
      );
      expect(result).toBe(expected);
    });
  });

  describe('markShipping', () => {
    it('should call ordersService.markShipping with id and seller id', async () => {
      const expected = { id: orderId } as unknown as OrderResponseDto;
      mockOrdersService.markShipping.mockResolvedValue(expected);

      const result = await controller.markShipping(sellerUserId, orderId);

      expect(mockOrdersService.markShipping).toHaveBeenCalledWith(
        orderId,
        sellerUserId,
      );
      expect(result).toBe(expected);
    });
  });

  describe('markDelivered', () => {
    it('should call ordersService.markDelivered with id and seller id', async () => {
      const expected = { id: orderId } as unknown as OrderResponseDto;
      mockOrdersService.markDelivered.mockResolvedValue(expected);

      const result = await controller.markDelivered(sellerUserId, orderId);

      expect(mockOrdersService.markDelivered).toHaveBeenCalledWith(
        orderId,
        sellerUserId,
      );
      expect(result).toBe(expected);
    });
  });

  describe('completeOrder', () => {
    it('should call ordersService.completeOrder with id and seller id', async () => {
      const expected = { id: orderId } as unknown as OrderResponseDto;
      mockOrdersService.completeOrder.mockResolvedValue(expected);

      const result = await controller.completeOrder(sellerUserId, orderId);

      expect(mockOrdersService.completeOrder).toHaveBeenCalledWith(
        orderId,
        sellerUserId,
      );
      expect(result).toBe(expected);
    });
  });

  describe('cancelOrderBySeller', () => {
    it('should call ordersService.cancelOrder with id, seller id and reason', async () => {
      const dto = { reason: 'Out of stock' } as CancelOrderDto;
      const expected = { id: orderId } as unknown as OrderResponseDto;
      mockOrdersService.cancelOrder.mockResolvedValue(expected);

      const result = await controller.cancelOrderBySeller(
        sellerUserId,
        orderId,
        dto,
      );

      expect(mockOrdersService.cancelOrder).toHaveBeenCalledWith(
        orderId,
        sellerUserId,
        dto.reason,
      );
      expect(result).toBe(expected);
    });
  });

  describe('cancelOrderByCustomer', () => {
    it('should call ordersService.cancelOrderByCustomer with id, user id and reason', async () => {
      const dto = { reason: 'Changed my mind' } as CancelOrderDto;
      const expected = { id: orderId } as unknown as OrderResponseDto;
      mockOrdersService.cancelOrderByCustomer.mockResolvedValue(expected);

      const result = await controller.cancelOrderByCustomer(
        userId,
        orderId,
        dto,
      );

      expect(mockOrdersService.cancelOrderByCustomer).toHaveBeenCalledWith(
        orderId,
        userId,
        dto.reason,
      );
      expect(result).toBe(expected);
    });
  });

  describe('adminFindAll', () => {
    it('should call ordersService.adminFindAll with the query', () => {
      const query = { page: 1, limit: 20 } as AdminOrderQueryDto;
      const expected = { data: [], total: 0 };
      mockOrdersService.adminFindAll.mockReturnValue(expected);

      const result = controller.adminFindAll(query);

      expect(mockOrdersService.adminFindAll).toHaveBeenCalledWith(query);
      expect(result).toBe(expected);
    });
  });
});
