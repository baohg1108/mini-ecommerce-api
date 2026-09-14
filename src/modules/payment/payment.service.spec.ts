import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PaymentService } from './payment.service';
import { VnpayService } from './vnpay/vnpay.service';
import { MomoService } from './momo/momo.service';
import { ProductVariantService } from '../product-variant/product-variant.service';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Payment Module Unified Unit Test Cases', () => {
  let paymentService: PaymentService;
  let vnpayService: VnpayService;
  let momoService: MomoService;

  const mockPaymentRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOrderRepository = {
    findOne: jest.fn(),
  };

  const mockEntityManager = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(
      async (cb: (manager: EntityManager) => Promise<unknown>) =>
        cb(mockEntityManager as unknown as EntityManager),
    ),
  };

  const mockProductVariantService = {
    commitStock: jest.fn(),
    releaseReservedStock: jest.fn(),
  };

  const mockConfigValues: Record<string, string | number> = {
    VNPAY_TMN_CODE: 'TMNCODE123',
    VNPAY_HASH_SECRET: 'HASHSECRET123',
    VNPAY_PAYMENT_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    VNPAY_RETURN_URL: 'http://localhost/return',
    VNPAY_API_URL:
      'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
    VNPAY_CREATE_BY: 'system',
    VNPAY_REFUND_TIMEOUT_MS: 15000,
    MOMO_PARTNER_CODE: 'MOMO_PARTNER',
    MOMO_PARTNER_NAME: 'Merchant',
    MOMO_ACCESS_KEY: 'access_key_123',
    MOMO_SECRET_KEY: 'secret_key_123',
    MOMO_API_ENDPOINT: 'https://test-payment.momo.vn/v2/gateway/api/create',
    MOMO_REDIRECT_URL: 'http://localhost/redirect',
    MOMO_IPN_URL: 'http://localhost/ipn',
    MOMO_REQUEST_TYPE: 'captureWallet',
    MOMO_REQUEST_TIMEOUT_MS: 15000,
    MOMO_REFUND_ENDPOINT: 'https://test-payment.momo.vn/v2/gateway/api/refund',
  };

  const mockConfigService = {
    get: jest.fn(
      (key: string): string | number | undefined => mockConfigValues[key],
    ),
    getOrThrow: jest.fn((key: string): string | number => {
      const val = mockConfigValues[key];
      if (val === undefined) throw new Error(`Missing config ${key}`);
      return val;
    }),
  };

  const mockVnpayService = {
    refund: jest.fn(),
    createPaymentUrl: jest.fn(),
    verifyIpnSignature: jest.fn(),
    findOrderForIpn: jest.fn(),
  };

  const mockMomoService = {
    refund: jest.fn(),
    createPayment: jest.fn(),
    verifyIpnSignature: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        VnpayService,
        MomoService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ProductVariantService,
          useValue: mockProductVariantService,
        },
        {
          provide: VnpayService,
          useValue: mockVnpayService,
        },
        {
          provide: MomoService,
          useValue: mockMomoService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    paymentService = module.get<PaymentService>(PaymentService);
    vnpayService = module.get<VnpayService>(VnpayService);
    momoService = module.get<MomoService>(MomoService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(paymentService).toBeDefined();
    expect(vnpayService).toBeDefined();
    expect(momoService).toBeDefined();
  });

  describe('PaymentService Unit Tests', () => {
    describe('createForOrder', () => {
      const mockOrder = {
        id: 'order-1',
        totalAmount: 500000,
      } as unknown as Order;

      it('should successfully create a payment for an order', async () => {
        mockEntityManager.findOne.mockResolvedValue(mockOrder);
        mockEntityManager.create.mockReturnValue({
          orderId: 'order-1',
          method: PaymentMethod.VNPAY,
          amount: 500000,
          status: PaymentStatus.PENDING,
        });
        mockEntityManager.save.mockResolvedValue({
          id: 'payment-1',
          orderId: 'order-1',
          method: PaymentMethod.VNPAY,
          amount: 500000,
          status: PaymentStatus.PENDING,
        });

        const result = await paymentService.createForOrder(
          mockEntityManager as unknown as EntityManager,
          mockOrder,
          PaymentMethod.VNPAY,
        );

        expect(result).toHaveProperty('id', 'payment-1');
        expect(mockEntityManager.save).toHaveBeenCalled();
      });

      it('should throw NotFoundException if order does not exist or has no ID', async () => {
        await expect(
          paymentService.createForOrder(
            mockEntityManager as unknown as EntityManager,
            { id: '' } as unknown as Order,
            PaymentMethod.VNPAY,
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw NotFoundException if order is not found in database via manager', async () => {
        mockEntityManager.findOne.mockResolvedValue(null);

        await expect(
          paymentService.createForOrder(
            mockEntityManager as unknown as EntityManager,
            mockOrder,
            PaymentMethod.VNPAY,
          ),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('findByOrderId', () => {
      it('should return payment when found by orderId', async () => {
        const payment = { id: 'p-1', orderId: 'order-1' };
        mockPaymentRepository.findOne.mockResolvedValue(payment);

        const result = await paymentService.findByOrderId('order-1');
        expect(result).toEqual(payment);
      });

      it('should throw NotFoundException when payment not found by orderId', async () => {
        mockPaymentRepository.findOne.mockResolvedValue(null);

        await expect(paymentService.findByOrderId('order-1')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('attachGatewayOrderId', () => {
      it('should successfully attach gateway order ID', async () => {
        const payment = { id: 'p-1', gatewayOrderId: null };
        mockPaymentRepository.findOne.mockResolvedValue(payment);
        mockPaymentRepository.save.mockResolvedValue({
          ...payment,
          gatewayOrderId: 'gw-123',
        });

        const result = await paymentService.attachGatewayOrderId(
          'p-1',
          'gw-123',
        );
        expect(result.gatewayOrderId).toBe('gw-123');
      });

      it('should throw NotFoundException if payment not found on attach', async () => {
        mockPaymentRepository.findOne.mockResolvedValue(null);

        await expect(
          paymentService.attachGatewayOrderId('p-1', 'gw-123'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('markSuccess', () => {
      const orderId = 'order-1';
      it('should mark payment as success, update order status, and commit stock', async () => {
        const payment = {
          id: 'p-1',
          orderId,
          status: PaymentStatus.PENDING,
        };

        const queryBuilder = {
          where: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(payment),
        };
        mockEntityManager.createQueryBuilder.mockReturnValue(queryBuilder);
        mockEntityManager.save.mockResolvedValue({
          ...payment,
          status: PaymentStatus.SUCCESS,
        });
        mockEntityManager.find.mockResolvedValue([
          { variantId: 'v-1', quantity: 2 },
        ]);

        const result = await paymentService.markSuccess(
          mockEntityManager as unknown as EntityManager,
          orderId,
          { gatewayTxnId: 'txn-1' },
        );

        expect(result.status).toBe(PaymentStatus.SUCCESS);
        expect(mockEntityManager.update).toHaveBeenCalledWith(
          Order,
          { id: orderId },
          { status: OrderStatus.PAID_PENDING_CONFIRMATION },
        );
        expect(mockProductVariantService.commitStock).toHaveBeenCalledWith(
          mockEntityManager,
          'v-1',
          2,
        );
      });

      it('should throw NotFoundException if payment not found on markSuccess', async () => {
        const queryBuilder = {
          where: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        };
        mockEntityManager.createQueryBuilder.mockReturnValue(queryBuilder);

        await expect(
          paymentService.markSuccess(
            mockEntityManager as unknown as EntityManager,
            orderId,
            {},
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('should return payment immediately if status is already not PENDING', async () => {
        const payment = {
          id: 'p-1',
          orderId,
          status: PaymentStatus.SUCCESS,
        };

        const queryBuilder = {
          where: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(payment),
        };
        mockEntityManager.createQueryBuilder.mockReturnValue(queryBuilder);

        const result = await paymentService.markSuccess(
          mockEntityManager as unknown as EntityManager,
          orderId,
          {},
        );

        expect(result).toEqual(payment);
        expect(mockEntityManager.save).not.toHaveBeenCalled();
      });
    });

    describe('markFailed', () => {
      const orderId = 'order-1';
      it('should mark payment as failed, update order status, and release stock', async () => {
        const payment = {
          id: 'p-1',
          orderId,
          status: PaymentStatus.PENDING,
        };

        const queryBuilder = {
          where: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(payment),
        };
        mockEntityManager.createQueryBuilder.mockReturnValue(queryBuilder);
        mockEntityManager.save.mockResolvedValue({
          ...payment,
          status: PaymentStatus.FAILED,
        });
        mockEntityManager.find.mockResolvedValue([
          { variantId: 'v-1', quantity: 2 },
        ]);

        const result = await paymentService.markFailed(
          mockEntityManager as unknown as EntityManager,
          orderId,
          { gatewayResponseCode: '01' },
        );

        expect(result.status).toBe(PaymentStatus.FAILED);
        expect(mockEntityManager.update).toHaveBeenCalledWith(
          Order,
          { id: orderId },
          { status: OrderStatus.PAYMENT_FAILED },
        );
        expect(
          mockProductVariantService.releaseReservedStock,
        ).toHaveBeenCalledWith(mockEntityManager, 'v-1', 2);
      });

      it('should throw NotFoundException if payment not found on markFailed', async () => {
        const queryBuilder = {
          where: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        };
        mockEntityManager.createQueryBuilder.mockReturnValue(queryBuilder);

        await expect(
          paymentService.markFailed(
            mockEntityManager as unknown as EntityManager,
            orderId,
          ),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('refundByOrderId', () => {
      const orderId = 'order-1';

      it('should successfully process VNPAY refund', async () => {
        const payment = {
          id: 'p-1',
          orderId,
          status: PaymentStatus.SUCCESS,
          method: PaymentMethod.VNPAY,
          order: { id: orderId },
        };
        mockPaymentRepository.findOne.mockResolvedValue(payment);
        mockVnpayService.refund.mockResolvedValue({
          success: true,
          responseCode: '00',
          gatewayTxnId: 'ref-123',
        });
        mockEntityManager.findOne.mockResolvedValue(payment);
        mockEntityManager.save.mockResolvedValue({
          ...payment,
          status: PaymentStatus.REFUNDED,
        });

        const result = await paymentService.refundByOrderId(
          orderId,
          'Customer request',
        );
        expect(result.status).toBe(PaymentStatus.REFUNDED);
        expect(mockVnpayService.refund).toHaveBeenCalled();
      });

      it('should successfully process MOMO refund', async () => {
        const payment = {
          id: 'p-1',
          orderId,
          status: PaymentStatus.SUCCESS,
          method: PaymentMethod.MOMO,
          order: { id: orderId },
        };
        mockPaymentRepository.findOne.mockResolvedValue(payment);
        mockMomoService.refund.mockResolvedValue({
          success: true,
          responseCode: '00',
          gatewayTxnId: 'ref-momo',
        });
        mockEntityManager.findOne.mockResolvedValue(payment);
        mockEntityManager.save.mockResolvedValue({
          ...payment,
          status: PaymentStatus.REFUNDED,
        });

        const result = await paymentService.refundByOrderId(
          orderId,
          'Wrong item',
        );
        expect(result.status).toBe(PaymentStatus.REFUNDED);
        expect(mockMomoService.refund).toHaveBeenCalled();
      });

      it('should throw NotFoundException if payment not found on refund', async () => {
        mockPaymentRepository.findOne.mockResolvedValue(null);

        await expect(
          paymentService.refundByOrderId(orderId, 'reason'),
        ).rejects.toThrow(NotFoundException);
      });

      it('should return payment directly if already refunded', async () => {
        const payment = {
          id: 'p-1',
          orderId,
          status: PaymentStatus.REFUNDED,
        };
        mockPaymentRepository.findOne.mockResolvedValue(payment);

        const result = await paymentService.refundByOrderId(orderId, 'reason');
        expect(result).toEqual(payment);
      });

      it('should throw BadRequestException if payment status is not SUCCESS', async () => {
        const payment = {
          id: 'p-1',
          orderId,
          status: PaymentStatus.PENDING,
        };
        mockPaymentRepository.findOne.mockResolvedValue(payment);

        await expect(
          paymentService.refundByOrderId(orderId, 'reason'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if payment method does not support refund', async () => {
        const payment = {
          id: 'p-1',
          orderId,
          status: PaymentStatus.SUCCESS,
          method: 'COD',
        };
        mockPaymentRepository.findOne.mockResolvedValue(payment);

        await expect(
          paymentService.refundByOrderId(orderId, 'reason'),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('getPaymentHistory', () => {
      it('should return payment history list and meta data', async () => {
        const payments = [{ id: 'p-1', status: PaymentStatus.SUCCESS }];
        const queryBuilder = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([payments, 1]),
        };
        mockPaymentRepository.createQueryBuilder.mockReturnValue(queryBuilder);

        const result = await paymentService.getPaymentHistory('user-1', {
          page: 1,
          limit: 10,
          status: PaymentStatus.SUCCESS,
        });

        expect(result).toHaveProperty('items');
        expect(result).toHaveProperty('meta');
        expect(result.meta.totalItems).toBe(1);
      });
    });
  });

  describe('VnpayService Unit Tests', () => {
    const realVnpayService = new VnpayService(
      mockOrderRepository as unknown as Repository<Order>,
      mockConfigService as unknown as ConfigService,
    );

    const userId = 'user-1';
    const orderId = 'order-1';
    const ipAddr = '127.0.0.1';

    it('should successfully generate payment url', async () => {
      mockOrderRepository.findOne.mockResolvedValue({
        id: orderId,
        userId,
        paymentMethod: PaymentMethod.VNPAY,
        totalAmount: 100000,
        orderCode: 'ORD123',
      });

      const result = await realVnpayService.createPaymentUrl(
        userId,
        orderId,
        ipAddr,
      );
      expect(result).toHaveProperty('paymentUrl');
      expect(result.paymentUrl).toContain('vnp_SecureHash');
    });

    it('should throw NotFoundException if order not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);
      await expect(
        realVnpayService.createPaymentUrl(userId, orderId, ipAddr),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user mismatch', async () => {
      mockOrderRepository.findOne.mockResolvedValue({
        id: orderId,
        userId: 'other-user',
        paymentMethod: PaymentMethod.VNPAY,
      });
      await expect(
        realVnpayService.createPaymentUrl(userId, orderId, ipAddr),
      ).rejects.toThrow();
    });

    it('should throw BadRequestException if payment method is not VNPAY', async () => {
      mockOrderRepository.findOne.mockResolvedValue({
        id: orderId,
        userId,
        paymentMethod: PaymentMethod.MOMO,
      });
      await expect(
        realVnpayService.createPaymentUrl(userId, orderId, ipAddr),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return false if hash secret is missing in verifyIpnSignature', () => {
      jest.spyOn(mockConfigService, 'get').mockReturnValueOnce(undefined);
      const result = realVnpayService.verifyIpnSignature({});
      expect(result).toBe(false);
    });

    it('should find order by orderCode in findOrderForIpn', async () => {
      const mockOrder = { id: 'order-1', orderCode: 'ORD123' };
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      const result = await realVnpayService.findOrderForIpn('ORD123');
      expect(result).toEqual(mockOrder);
    });

    it('should handle empty orderCode in findOrderForIpn', async () => {
      const result = await realVnpayService.findOrderForIpn('');
      expect(result).toBeNull();
    });

    it('should handle axios connection error gracefully during refund', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network Error'));

      const mockOrder = {
        id: 'order-1',
        orderCode: 'ORD123',
        createdAt: new Date(),
      } as Order;
      const mockPayment = {
        id: 'pay-1',
        amount: 100000,
        gatewayTxnId: 'txn-123',
      } as unknown as Payment;

      const result = await realVnpayService.refund(
        mockOrder,
        mockPayment,
        'Customer request',
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain('Không thể kết nối tới cổng VNPay');
    });

    it('should throw BadRequestException if gatewayTxnId is missing on refund', async () => {
      const mockOrder = {
        id: 'order-1',
        orderCode: 'ORD123',
        createdAt: new Date(),
      } as Order;
      const invalidPayment = {
        id: 'pay-1',
        amount: 100000,
      } as unknown as Payment;
      await expect(
        realVnpayService.refund(mockOrder, invalidPayment, 'reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('MomoService Unit Tests', () => {
    const realMomoService = new MomoService(
      mockConfigService as unknown as ConfigService,
    );

    const mockOrder = { orderCode: 'ORD123' } as Order;
    const mockPayment = {
      id: 'pay-1',
      amount: 100000,
      gatewayTxnId: '123456',
    } as unknown as Payment;

    it('should successfully create payment url', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          resultCode: 0,
          payUrl: 'https://momo.vn/pay',
          deeplink: 'momo://',
          qrCodeUrl: 'https://momo.vn/qr',
          message: 'Success',
        },
      });

      const result = await realMomoService.createPayment(
        mockOrder,
        mockPayment,
      );
      expect(result).toHaveProperty('payUrl', 'https://momo.vn/pay');
    });

    it('should throw ServiceUnavailableException if axios throws error on createPayment', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Timeout'));

      await expect(
        realMomoService.createPayment(mockOrder, mockPayment),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException if resultCode is non-zero on createPayment', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          resultCode: 1000,
          message: 'Error',
        },
      });

      await expect(
        realMomoService.createPayment(mockOrder, mockPayment),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should return false if signatures do not match lengths in verifyIpnSignature', () => {
      const isValid = realMomoService.verifyIpnSignature({
        partnerCode: 'TEST',
        orderId: '123',
        requestId: '123',
        amount: 100,
        orderInfo: 'info',
        orderType: 'momo',
        transId: '123',
        resultCode: 0,
        message: 'success',
        payType: 'qr',
        responseTime: 123,
        extraData: '',
        signature: 'wrong-sig-length',
      });
      expect(isValid).toBe(false);
    });

    it('should successfully process refund', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          resultCode: 0,
          transId: 123456,
          message: 'Success',
        },
      });

      const result = await realMomoService.refund(
        mockOrder,
        mockPayment,
        'Reason',
      );
      expect(result.success).toBe(true);
      expect(result.responseCode).toBe('0');
    });

    it('should handle axios error during refund gracefully', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await realMomoService.refund(
        mockOrder,
        mockPayment,
        'Reason',
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain('Không thể kết nối tới cổng Momo');
    });

    it('should throw BadRequestException if gatewayTxnId is missing on refund', async () => {
      const invalidPayment = {
        id: 'pay-1',
        amount: 100000,
      } as unknown as Payment;
      await expect(
        realMomoService.refund(mockOrder, invalidPayment, 'Reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if gatewayTxnId is not a valid number on refund', async () => {
      const invalidPayment = {
        id: 'pay-1',
        amount: 100000,
        gatewayTxnId: 'abc',
      } as unknown as Payment;
      await expect(
        realMomoService.refund(mockOrder, invalidPayment, 'Reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
