import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Shop } from '../shops/entities/shop.entity';
import { PaymentService } from '../payment/payment.service';
import { CartService } from '../cart/cart.service';
import { ProductVariantService } from '../product-variant/product-variant.service';
import { VoucherValidationService } from '../vouchers/voucher-validation.service';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { CreateOrderDto } from './dtos/create-order.dto';
import { SellerOrderListQueryDto } from './dtos/seller-order-list-query.dto';
import { AdminOrderQueryDto } from './dtos/admin-order-query.dto';

type MockQueryBuilder = {
  where: jest.Mock;
  andWhere: jest.Mock;
  setLock: jest.Mock;
  getOne: jest.Mock;
  leftJoinAndSelect: jest.Mock;
  orderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  getManyAndCount: jest.Mock;
};

describe('OrdersService (Full Coverage Unit Tests)', () => {
  let service: OrdersService;

  const mockQueryBuilder: MockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockOrderRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockOrderItemRepository = {};
  const mockShopRepository = {
    findOne: jest.fn(),
  };

  const mockCartService = {
    getGroupedCartForCheckout: jest.fn(),
  };

  const mockPaymentService = {
    createForOrder: jest.fn(),
  };

  const mockProductVariantService = {
    commitStock: jest.fn(),
    restock: jest.fn(),
    releaseReservedStock: jest.fn(),
  };

  const mockVoucherValidationService = {
    applyVouchersToCart: jest.fn(),
    recordUsage: jest.fn(),
  };

  const mockEntityManager = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    save: jest.fn().mockImplementation((_entity: unknown, data: unknown) => {
      if (Array.isArray(data)) {
        const items = data as Record<string, unknown>[];
        return Promise.resolve(
          items.map((item, index) => ({
            id: `item-${index}`,
            ...item,
          })),
        );
      }
      return Promise.resolve({
        id: 'order-1',
        ...(data as Record<string, unknown>),
      });
    }),
    create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => {
      return data;
    }),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
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
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemRepository,
        },
        { provide: getRepositoryToken(Shop), useValue: mockShopRepository },
        { provide: CartService, useValue: mockCartService },
        { provide: PaymentService, useValue: mockPaymentService },
        {
          provide: ProductVariantService,
          useValue: mockProductVariantService,
        },
        {
          provide: VoucherValidationService,
          useValue: mockVoucherValidationService,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  describe('checkout (Happy & Sad Paths)', () => {
    const checkoutDto: CreateOrderDto = {
      address: {
        recipientName: 'Nguyen Van A',
        phone: '0901234567',
        fullAddress: '123 Le Loi, HCM',
      },
      paymentMethod: PaymentMethod.COD,
      voucherCodes: ['SYS10'],
    };

    it('should throw BadRequestException when cart is empty', async () => {
      mockCartService.getGroupedCartForCheckout.mockResolvedValue([]);
      await expect(service.checkout('user-1', checkoutDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully create orders with vouchers and clear cart', async () => {
      const groupedCart = [
        {
          shop: { id: 'shop-1', name: 'Shop 1' },
          items: [
            {
              variantId: 'v-1',
              productName: 'Prod 1',
              quantity: 2,
              stockQty: 5,
              price: 100000,
            },
          ],
        },
      ];
      mockCartService.getGroupedCartForCheckout.mockResolvedValue(groupedCart);

      mockVoucherValidationService.applyVouchersToCart.mockResolvedValue({
        systemVoucher: { voucher: { id: 'sys-v-1', code: 'SYS10' } },
        shopAllocations: [
          {
            shopId: 'shop-1',
            systemDiscountAllocated: 10000,
            shopVoucher: {
              voucher: { id: 'shop-v-1', code: 'SHOP10' },
              discountAmount: 5000,
            },
            finalAmount: 185000,
          },
        ],
        totalDiscount: 15000,
      });

      mockQueryBuilder.getOne.mockResolvedValue({
        id: 'v-1',
        availableQty: 10,
        reservedQty: 0,
        attributes: {},
      });

      mockEntityManager.findOne.mockResolvedValue({ id: 'cart-1' });

      const result = await service.checkout('user-1', checkoutDto);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(mockVoucherValidationService.recordUsage).toHaveBeenCalled();
      expect(mockEntityManager.delete).toHaveBeenCalled();
    });

    // ORD-UNIT-019
    it('should throw BadRequestException when an item exceeds available stock in cart summary', async () => {
      const groupedCart = [
        {
          shop: { id: 'shop-1', name: 'Shop 1' },
          items: [
            {
              variantId: 'v-1',
              productName: 'Prod 1',
              quantity: 10,
              stockQty: 5,
              price: 100000,
            },
          ],
        },
      ];
      mockCartService.getGroupedCartForCheckout.mockResolvedValue(groupedCart);

      await expect(service.checkout('user-1', checkoutDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    // ORD-UNIT-020
    it('should throw NotFoundException when cart record itself is missing after order creation', async () => {
      const groupedCart = [
        {
          shop: { id: 'shop-1', name: 'Shop 1' },
          items: [
            {
              variantId: 'v-1',
              productName: 'Prod 1',
              quantity: 2,
              stockQty: 5,
              price: 100000,
            },
          ],
        },
      ];
      mockCartService.getGroupedCartForCheckout.mockResolvedValue(groupedCart);
      mockQueryBuilder.getOne.mockResolvedValue({
        id: 'v-1',
        availableQty: 10,
        reservedQty: 0,
        attributes: {},
      });
      mockEntityManager.findOne.mockResolvedValue(null); // cart not found

      const dtoNoVoucher: CreateOrderDto = {
        address: checkoutDto.address,
        paymentMethod: PaymentMethod.COD,
      };

      await expect(service.checkout('user-1', dtoNoVoucher)).rejects.toThrow(
        NotFoundException,
      );
    });

    // ORD-UNIT-021
    it('should process multiple cart items sorted by variantId to avoid deadlock', async () => {
      const groupedCart = [
        {
          shop: { id: 'shop-1', name: 'Shop 1' },
          items: [
            {
              variantId: 'v-2',
              productName: 'Prod 2',
              quantity: 1,
              stockQty: 5,
              price: 50000,
            },
            {
              variantId: 'v-1',
              productName: 'Prod 1',
              quantity: 1,
              stockQty: 5,
              price: 100000,
            },
          ],
        },
      ];
      mockCartService.getGroupedCartForCheckout.mockResolvedValue(groupedCart);
      mockQueryBuilder.getOne.mockResolvedValue({
        id: 'v-1',
        availableQty: 10,
        reservedQty: 0,
        attributes: {},
      });
      mockEntityManager.findOne.mockResolvedValue({ id: 'cart-1' });

      const dtoNoVoucher: CreateOrderDto = {
        address: checkoutDto.address,
        paymentMethod: PaymentMethod.COD,
      };

      const result = await service.checkout('user-1', dtoNoVoucher);
      expect(result.length).toBe(1);
    });

    // ORD-UNIT-022
    it('should throw NotFoundException when variant not found during order creation', async () => {
      const groupedCart = [
        {
          shop: { id: 'shop-1', name: 'Shop 1' },
          items: [
            {
              variantId: 'v-1',
              productName: 'Prod 1',
              quantity: 1,
              stockQty: 5,
              price: 100000,
            },
          ],
        },
      ];
      mockCartService.getGroupedCartForCheckout.mockResolvedValue(groupedCart);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const dtoNoVoucher: CreateOrderDto = {
        address: checkoutDto.address,
        paymentMethod: PaymentMethod.COD,
      };

      await expect(service.checkout('user-1', dtoNoVoucher)).rejects.toThrow(
        NotFoundException,
      );
    });

    // ORD-UNIT-023
    it('should throw BadRequestException when variant availableQty is insufficient at lock time', async () => {
      const groupedCart = [
        {
          shop: { id: 'shop-1', name: 'Shop 1' },
          items: [
            {
              variantId: 'v-1',
              productName: 'Prod 1',
              quantity: 5,
              stockQty: 10,
              price: 100000,
            },
          ],
        },
      ];
      mockCartService.getGroupedCartForCheckout.mockResolvedValue(groupedCart);
      mockQueryBuilder.getOne.mockResolvedValue({
        id: 'v-1',
        availableQty: 2,
        reservedQty: 0,
        attributes: {},
      });

      const dtoNoVoucher: CreateOrderDto = {
        address: checkoutDto.address,
        paymentMethod: PaymentMethod.COD,
      };

      await expect(service.checkout('user-1', dtoNoVoucher)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('confirmOrder', () => {
    it('should confirm COD order successfully', async () => {
      const order = {
        id: 'order-1',
        paymentMethod: PaymentMethod.COD,
        status: OrderStatus.PENDING_CONFIRMATION,
        shopId: 'shop-1',
        items: [{ variantId: 'v-1', quantity: 2 }],
      };
      const shop = { id: 'shop-1', userId: 'seller-1' };

      mockQueryBuilder.getOne.mockResolvedValue(order);
      mockEntityManager.find.mockResolvedValue(order.items);
      mockEntityManager.findOne.mockResolvedValue(shop);

      const result = await service.confirmOrder('order-1', 'seller-1');
      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(mockProductVariantService.commitStock).toHaveBeenCalledWith(
        mockEntityManager,
        'v-1',
        2,
      );
    });

    it('should confirm Online order successfully', async () => {
      const order = {
        id: 'order-1',
        paymentMethod: PaymentMethod.VNPAY,
        status: OrderStatus.PAID_PENDING_CONFIRMATION,
        shopId: 'shop-1',
        items: [],
      };
      const shop = { id: 'shop-1', userId: 'seller-1' };

      mockQueryBuilder.getOne.mockResolvedValue(order);
      mockEntityManager.find.mockResolvedValue([]);
      mockEntityManager.findOne.mockResolvedValue(shop);

      const result = await service.confirmOrder('order-1', 'seller-1');
      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    // ORD-UNIT-024
    it('should throw BadRequestException when confirming a COD order not in PENDING_CONFIRMATION', async () => {
      const order = {
        id: 'order-1',
        paymentMethod: PaymentMethod.COD,
        status: OrderStatus.CONFIRMED,
        shopId: 'shop-1',
        items: [],
      };
      const shop = { id: 'shop-1', userId: 'seller-1' };

      mockQueryBuilder.getOne.mockResolvedValue(order);
      mockEntityManager.find.mockResolvedValue([]);
      mockEntityManager.findOne.mockResolvedValue(shop);

      await expect(service.confirmOrder('order-1', 'seller-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    // ORD-UNIT-025
    it('should throw BadRequestException when confirming an online order not in PAID_PENDING_CONFIRMATION', async () => {
      const order = {
        id: 'order-1',
        paymentMethod: PaymentMethod.VNPAY,
        status: OrderStatus.PENDING_PAYMENT,
        shopId: 'shop-1',
        items: [],
      };
      const shop = { id: 'shop-1', userId: 'seller-1' };

      mockQueryBuilder.getOne.mockResolvedValue(order);
      mockEntityManager.find.mockResolvedValue([]);
      mockEntityManager.findOne.mockResolvedValue(shop);

      await expect(service.confirmOrder('order-1', 'seller-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    // ORD-UNIT-030
    it('should throw NotFoundException when order not found during seller lock', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.confirmOrder('order-x', 'seller-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    // ORD-UNIT-031
    it('should throw ForbiddenException when seller does not own the shop of the order', async () => {
      const order = {
        id: 'order-1',
        paymentMethod: PaymentMethod.COD,
        status: OrderStatus.PENDING_CONFIRMATION,
        shopId: 'shop-1',
        items: [],
      };
      const shop = { id: 'shop-1', userId: 'other-seller' };

      mockQueryBuilder.getOne.mockResolvedValue(order);
      mockEntityManager.find.mockResolvedValue([]);
      mockEntityManager.findOne.mockResolvedValue(shop);

      await expect(service.confirmOrder('order-1', 'seller-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Order State Transitions', () => {
    const setupOrderMock = (status: OrderStatus) => {
      const order = { id: 'order-1', status, shopId: 'shop-1', items: [] };
      const shop = { id: 'shop-1', userId: 'seller-1' };
      mockQueryBuilder.getOne.mockResolvedValue(order);
      mockEntityManager.find.mockResolvedValue([]);
      mockEntityManager.findOne.mockResolvedValue(shop);
      return order;
    };

    it('should mark order as PREPARING', async () => {
      setupOrderMock(OrderStatus.CONFIRMED);
      const res = await service.markPreparing('order-1', 'seller-1');
      expect(res.status).toBe(OrderStatus.PREPARING);
    });

    it('should mark order as SHIPPING', async () => {
      setupOrderMock(OrderStatus.PREPARING);
      const res = await service.markShipping('order-1', 'seller-1');
      expect(res.status).toBe(OrderStatus.SHIPPING);
    });

    it('should mark order as DELIVERED', async () => {
      setupOrderMock(OrderStatus.SHIPPING);
      const res = await service.markDelivered('order-1', 'seller-1');
      expect(res.status).toBe(OrderStatus.DELIVERED);
    });

    it('should mark order as COMPLETED', async () => {
      setupOrderMock(OrderStatus.DELIVERED);
      const res = await service.completeOrder('order-1', 'seller-1');
      expect(res.status).toBe(OrderStatus.COMPLETED);
    });

    // ORD-UNIT-032
    it('should throw BadRequestException for an invalid state transition', async () => {
      setupOrderMock(OrderStatus.PENDING_CONFIRMATION);
      await expect(
        service.markPreparing('order-1', 'seller-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelOrder (By Seller)', () => {
    it('should successfully cancel order and release stock', async () => {
      const order = {
        id: 'order-1',
        paymentMethod: PaymentMethod.COD,
        status: OrderStatus.PENDING_CONFIRMATION,
        shopId: 'shop-1',
        items: [{ variantId: 'v-1', quantity: 2 }],
      };
      const shop = { id: 'shop-1', userId: 'seller-1' };

      mockQueryBuilder.getOne.mockImplementation(() => Promise.resolve(order));
      mockEntityManager.find.mockResolvedValue(order.items);
      mockEntityManager.findOne.mockResolvedValue(shop);

      const result = await service.cancelOrder(
        'order-1',
        'seller-1',
        'Out of stock',
      );
      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(
        mockProductVariantService.releaseReservedStock,
      ).toHaveBeenCalledWith(mockEntityManager, 'v-1', 2);
    });

    it('should restock if order was already confirmed (COD)', async () => {
      const order = {
        id: 'order-1',
        paymentMethod: PaymentMethod.COD,
        status: OrderStatus.CONFIRMED,
        shopId: 'shop-1',
        items: [{ variantId: 'v-1', quantity: 2 }],
      };
      const shop = { id: 'shop-1', userId: 'seller-1' };
      let callCount = 0;
      mockQueryBuilder.getOne.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(order);
        return Promise.resolve(null);
      });
      mockEntityManager.find.mockResolvedValue(order.items);
      mockEntityManager.findOne.mockResolvedValue(shop);

      await service.cancelOrder('order-1', 'seller-1');
      expect(mockProductVariantService.restock).toHaveBeenCalledWith(
        mockEntityManager,
        'v-1',
        2,
      );
    });
  });

  describe('cancelOrderByCustomer', () => {
    it('should successfully cancel order and sync payment', async () => {
      const order = {
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.PENDING_CONFIRMATION,
      };
      const payment = { id: 'pay-1', status: PaymentStatus.PENDING };

      let callCount = 0;
      mockQueryBuilder.getOne.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(order);
        return Promise.resolve(payment);
      });
      mockEntityManager.find.mockResolvedValue([
        { variantId: 'v-1', quantity: 1 },
      ]);

      const result = await service.cancelOrderByCustomer('order-1', 'user-1');
      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(mockEntityManager.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      await expect(
        service.cancelOrderByCustomer('order-999', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when order belongs to another user', async () => {
      const order = {
        id: 'order-1',
        userId: 'user-2',
        status: OrderStatus.PENDING_CONFIRMATION,
      };
      mockQueryBuilder.getOne.mockResolvedValue(order);
      await expect(
        service.cancelOrderByCustomer('order-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    // ORD-UNIT-026
    it('should throw BadRequestException when customer cancels an order not pending confirmation', async () => {
      const order = {
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.CONFIRMED,
      };
      mockQueryBuilder.getOne.mockResolvedValue(order);

      await expect(
        service.cancelOrderByCustomer('order-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when order is not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);
      await expect(service.findById('order-999', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not the owner of the order', async () => {
      const order = {
        id: 'order-1',
        userId: 'user-2',
        items: [],
        payment: null,
      };
      mockOrderRepository.findOne.mockResolvedValue(order);
      await expect(service.findById('order-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    // ORD-UNIT-027
    it('should return order detail when found and owned by the user', async () => {
      const order = {
        id: 'order-1',
        userId: 'user-1',
        items: [],
        payment: null,
      };
      mockOrderRepository.findOne.mockResolvedValue(order);

      const result = await service.findById('order-1', 'user-1');
      expect(result.id).toBe('order-1');
    });
  });

  describe('findMyOrders', () => {
    it('should return list of orders for customer', async () => {
      mockOrderRepository.find.mockResolvedValue([
        { id: 'order-1', items: [], payment: null, createdAt: new Date() },
      ]);
      const res = await service.findMyOrders('user-1');
      expect(res.length).toBe(1);
      expect(res[0].id).toBe('order-1');
    });
  });

  describe('getShopOrders', () => {
    it('should return paginated shop orders', async () => {
      mockShopRepository.findOne.mockResolvedValue({ id: 'shop-1' });
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [{ id: 'order-1', items: [] }],
        1,
      ]);

      const query: SellerOrderListQueryDto = { page: 1, limit: 10 };
      const res = await service.getShopOrders('seller-1', query);

      expect(res.meta.totalItems).toBe(1);
      expect(res.items.length).toBe(1);
    });

    // ORD-UNIT-028
    it('should throw NotFoundException when seller has no shop', async () => {
      mockShopRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getShopOrders('seller-x', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    // ORD-UNIT-029
    it('should apply status filter and map order items when present', async () => {
      mockShopRepository.findOne.mockResolvedValue({ id: 'shop-1' });
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [
          {
            id: 'order-1',
            items: [
              {
                id: 'item-1',
                variantId: 'v-1',
                productNameSnapshot: 'Prod 1',
                quantity: 1,
                priceAtOrder: '100000',
                lineTotal: '100000',
              },
            ],
            user: { id: 'user-1', fullName: 'A', phone: '090' },
          },
        ],
        1,
      ]);

      const query: SellerOrderListQueryDto = {
        page: 1,
        limit: 10,
        status: OrderStatus.CONFIRMED,
      };
      const res = await service.getShopOrders('seller-1', query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'order.status = :status',
        { status: OrderStatus.CONFIRMED },
      );
      expect(res.items[0].items.length).toBe(1);
    });
  });

  describe('adminFindAll', () => {
    it('should return paginated orders with filters applied', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [{ id: 'order-1' }],
        1,
      ]);

      const query: AdminOrderQueryDto = {
        page: 1,
        limit: 10,
        status: OrderStatus.CONFIRMED,
        orderCode: 'ORD123',
        shopId: 'shop-1',
        userId: 'user-1',
        fromDate: '2026-01-01',
        toDate: '2026-12-31',
      };

      const res = await service.adminFindAll(query);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(6);
      expect(res.meta.total).toBe(1);
      expect(res.data.length).toBe(1);
    });
  });
});
