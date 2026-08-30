import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { createHmac } from 'node:crypto';
import axios from 'axios';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PaymentService } from './payment.service';
import { VnpayService } from './vnpay/vnpay.service';
import { MomoService } from './momo/momo.service';

import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';

import { ProductVariantService } from '../product-variant/product-variant.service';
import { MomoIpnDto } from './momo/dtos/momo-ipn.dto';
import { VnpayIpnDto } from './vnpay/dtos/vnpay-ipn.dto';

import * as vnpaySignUtil from '../../common/utils/vnpay-sign.util';

/* eslint-disable @typescript-eslint/unbound-method --
 * `expect(mock.someMethod).toHaveBeenCalledWith(...)` never actually invokes
 * the method unbound from its object — Jest reads `.mock.calls` off the
 * function reference. The rule can't tell that apart from a real unbound
 * call, so it false-positives on every typed TypeORM/axios mock here. */

jest.mock('axios');
jest.mock('../../common/utils/vnpay-sign.util');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedBuildSignedQuery = vnpaySignUtil.buildSignedQuery as jest.Mock;
const mockedVerifySignedQuery = vnpaySignUtil.verifySignedQuery as jest.Mock;
const mockedFormatVnpDate = vnpaySignUtil.formatVnpDate as jest.Mock;

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: jest.Mocked<Partial<Repository<Payment>>> & {
    createQueryBuilder: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let productVariantService: {
    commitStock: jest.Mock;
    releaseReservedStock: jest.Mock;
  };

  beforeEach(async () => {
    paymentRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    dataSource = { transaction: jest.fn() };

    productVariantService = {
      commitStock: jest.fn(),
      releaseReservedStock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getRepositoryToken(Payment), useValue: paymentRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: ProductVariantService, useValue: productVariantService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createManagerWithQueryBuilder = (
    paymentResult: Payment | null,
    extra: Record<string, unknown> = {},
  ): EntityManager => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(paymentResult),
    };
    return {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      ...extra,
    } as unknown as EntityManager;
  };

  describe('createForOrder', () => {
    it('PAY-UNIT-013: throws NotFoundException when order has no id', async () => {
      const manager = {} as EntityManager;

      await expect(
        service.createForOrder(manager, {} as Order, PaymentMethod.COD),
      ).rejects.toThrow(NotFoundException);
    });

    it('PAY-UNIT-014: throws NotFoundException when order not found in DB', async () => {
      const manager = {
        findOne: jest.fn().mockResolvedValue(null),
      } as unknown as EntityManager;

      await expect(
        service.createForOrder(
          manager,
          { id: 'o1' } as Order,
          PaymentMethod.COD,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(manager.findOne).toHaveBeenCalledWith(Order, {
        where: { id: 'o1' },
      });
    });

    it('PAY-UNIT-015: creates payment with PENDING status', async () => {
      const existingOrder = { id: 'o1', totalAmount: '100000' } as Order;

      const manager = {
        findOne: jest.fn().mockResolvedValue(existingOrder),
        create: jest.fn((_entity: unknown, data: unknown) => data),
        save: jest.fn((_entity: unknown, data: Partial<Payment>) =>
          Promise.resolve({ id: 'p1', ...data } as Payment),
        ),
      } as unknown as EntityManager;

      const result = await service.createForOrder(
        manager,
        { id: 'o1' } as Order,
        PaymentMethod.COD,
      );

      expect(manager.create).toHaveBeenCalledWith(Payment, {
        orderId: 'o1',
        method: PaymentMethod.COD,
        amount: '100000',
        status: PaymentStatus.PENDING,
      });
      expect(manager.save).toHaveBeenCalledWith(
        Payment,
        expect.objectContaining({
          status: PaymentStatus.PENDING,
          orderId: 'o1',
        }),
      );
      expect(result.status).toBe(PaymentStatus.PENDING);
    });
  });

  describe('findByOrderId', () => {
    it('PAY-UNIT-016: throws NotFoundException when payment missing', async () => {
      (paymentRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findByOrderId('o1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('PAY-UNIT-017: returns payment when found', async () => {
      const payment = { id: 'p1', orderId: 'o1' } as Payment;
      (paymentRepository.findOne as jest.Mock).mockResolvedValue(payment);

      const result = await service.findByOrderId('o1');

      expect(result).toBe(payment);
      expect(paymentRepository.findOne).toHaveBeenCalledWith({
        where: { orderId: 'o1' },
      });
    });
  });

  describe('findByGatewayOrderId', () => {
    it('PAY-UNIT-018: returns null when not found', async () => {
      (paymentRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findByGatewayOrderId('gw-1');

      expect(result).toBeNull();
    });
  });

  describe('attachGatewayOrderId', () => {
    it('PAY-UNIT-019: throws NotFoundException when payment missing', async () => {
      (paymentRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.attachGatewayOrderId('p1', 'gw-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('PAY-UNIT-020: saves gatewayOrderId onto payment', async () => {
      const payment = { id: 'p1' } as Payment;
      (paymentRepository.findOne as jest.Mock).mockResolvedValue(payment);
      (paymentRepository.save as jest.Mock).mockImplementation((p) =>
        Promise.resolve(p),
      );

      await service.attachGatewayOrderId('p1', 'gw-1');

      expect(payment.gatewayOrderId).toBe('gw-1');
      expect(paymentRepository.save).toHaveBeenCalledTimes(1);
      expect(paymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ gatewayOrderId: 'gw-1' }),
      );
    });
  });

  describe('markSuccess', () => {
    it('PAY-UNIT-021: throws NotFoundException when payment missing', async () => {
      const manager = createManagerWithQueryBuilder(null);

      await expect(service.markSuccess(manager, 'o1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('PAY-UNIT-022: sets SUCCESS and commits stock for all order items', async () => {
      const payment = {
        id: 'p1',
        orderId: 'o1',
        status: PaymentStatus.PENDING,
      } as Payment;
      const orderItems = [
        { variantId: 'v1', quantity: 2 } as OrderItem,
        { variantId: 'v2', quantity: 1 } as OrderItem,
      ];

      const manager = createManagerWithQueryBuilder(payment, {
        save: jest.fn((_entity: unknown, data: Payment) =>
          Promise.resolve(data),
        ),
        update: jest.fn().mockResolvedValue(undefined),
        find: jest.fn().mockResolvedValue(orderItems),
      });

      const result = await service.markSuccess(manager, 'o1', {
        gatewayTxnId: 'tx1',
        gatewayResponseCode: '00',
      });

      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(result.paidAt).toBeInstanceOf(Date);
      expect(result.gatewayTxnId).toBe('tx1');

      expect(manager.update).toHaveBeenCalledWith(
        Order,
        { id: 'o1' },
        { status: OrderStatus.PAID_PENDING_CONFIRMATION },
      );

      expect(productVariantService.commitStock).toHaveBeenCalledTimes(2);
      expect(productVariantService.commitStock).toHaveBeenNthCalledWith(
        1,
        manager,
        'v1',
        2,
      );
      expect(productVariantService.commitStock).toHaveBeenNthCalledWith(
        2,
        manager,
        'v2',
        1,
      );
      expect(productVariantService.releaseReservedStock).not.toHaveBeenCalled();
    });
  });

  describe('markFailed', () => {
    it('PAY-UNIT-023: throws NotFoundException when payment missing', async () => {
      const manager = createManagerWithQueryBuilder(null);

      await expect(service.markFailed(manager, 'o1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('PAY-UNIT-024: sets FAILED and releases reserved stock', async () => {
      const payment = {
        id: 'p1',
        orderId: 'o1',
        status: PaymentStatus.PENDING,
      } as Payment;
      const orderItems = [{ variantId: 'v1', quantity: 3 } as OrderItem];

      const manager = createManagerWithQueryBuilder(payment, {
        save: jest.fn((_entity: unknown, data: Payment) =>
          Promise.resolve(data),
        ),
        update: jest.fn().mockResolvedValue(undefined),
        find: jest.fn().mockResolvedValue(orderItems),
      });

      const result = await service.markFailed(manager, 'o1', {
        gatewayResponseCode: '99',
      });

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(manager.update).toHaveBeenCalledWith(
        Order,
        { id: 'o1' },
        { status: OrderStatus.PAYMENT_FAILED },
      );

      expect(productVariantService.releaseReservedStock).toHaveBeenCalledTimes(
        1,
      );
      expect(productVariantService.releaseReservedStock).toHaveBeenCalledWith(
        manager,
        'v1',
        3,
      );
      expect(productVariantService.commitStock).not.toHaveBeenCalled();
    });
  });

  describe('markSuccessByOrderId', () => {
    it('PAY-UNIT-025: wraps markSuccess inside a DB transaction', async () => {
      const fakeManager = { fake: true } as unknown as EntityManager;
      dataSource.transaction.mockImplementation(
        (cb: (m: EntityManager) => unknown) => cb(fakeManager),
      );

      const markSuccessSpy = jest
        .spyOn(service, 'markSuccess')
        .mockResolvedValue({ id: 'p1' } as Payment);

      const result = await service.markSuccessByOrderId('o1', {
        gatewayTxnId: 'tx1',
      });

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(markSuccessSpy).toHaveBeenCalledWith(fakeManager, 'o1', {
        gatewayTxnId: 'tx1',
      });
      expect(result).toEqual({ id: 'p1' });
    });
  });

  describe('markFailedByGatewayOrderId', () => {
    it('PAY-UNIT-026: returns null when gatewayOrderId unknown', async () => {
      const manager = {
        findOne: jest.fn().mockResolvedValue(null),
      } as unknown as EntityManager;
      dataSource.transaction.mockImplementation(
        (cb: (m: EntityManager) => unknown) => cb(manager),
      );
      const markFailedSpy = jest.spyOn(service, 'markFailed');

      const result = await service.markFailedByGatewayOrderId('gw-x');

      expect(result).toBeNull();
      expect(markFailedSpy).not.toHaveBeenCalled();
    });
  });

  describe('markSuccessByGatewayOrderId', () => {
    it('PAY-UNIT-027: returns null when gatewayOrderId unknown', async () => {
      const manager = {
        findOne: jest.fn().mockResolvedValue(null),
      } as unknown as EntityManager;
      dataSource.transaction.mockImplementation(
        (cb: (m: EntityManager) => unknown) => cb(manager),
      );
      const markSuccessSpy = jest.spyOn(service, 'markSuccess');

      const result = await service.markSuccessByGatewayOrderId('gw-x', {});

      expect(result).toBeNull();
      expect(markSuccessSpy).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentHistory', () => {
    const buildQueryBuilderMock = (payments: Payment[], total: number) => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([payments, total]),
      };
      paymentRepository.createQueryBuilder.mockReturnValue(qb);
      return qb;
    };

    it('PAY-UNIT-028: applies default pagination (page=1, limit=10)', async () => {
      const qb = buildQueryBuilderMock([], 0);

      const result = await service.getPaymentHistory('u1', {});

      expect(qb.where).toHaveBeenCalledWith('order.user_id = :userId', {
        userId: 'u1',
      });
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 0,
      });
    });

    it('PAY-UNIT-029: applies status filter via andWhere', async () => {
      const qb = buildQueryBuilderMock([], 0);

      await service.getPaymentHistory('u1', {
        status: PaymentStatus.SUCCESS,
      });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith('payment.status = :status', {
        status: PaymentStatus.SUCCESS,
      });
    });

    it('PAY-UNIT-030: returns empty result with totalPages=0', async () => {
      buildQueryBuilderMock([], 0);

      const result = await service.getPaymentHistory('u1', {
        page: 2,
        limit: 5,
      });

      expect(result.items).toEqual([]);
      expect(result.meta.totalItems).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });
});

// =============================================================================
// VnpayService — PAY-UNIT-031 → 040
// =============================================================================
describe('VnpayService', () => {
  let service: VnpayService;
  let orderRepository: jest.Mocked<Partial<Repository<Order>>>;
  let configService: { get: jest.Mock };

  const VALID_CONFIG: Record<string, string> = {
    VNPAY_TMN_CODE: 'TMN001',
    VNPAY_HASH_SECRET: 'secret-key',
    VNPAY_PAYMENT_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    VNPAY_RETURN_URL: 'https://shop.example.com/vnpay/return',
  };

  beforeEach(async () => {
    orderRepository = { findOne: jest.fn() };

    configService = {
      get: jest.fn((key: string) => VALID_CONFIG[key]),
    };

    mockedFormatVnpDate.mockReturnValue('20260824120000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VnpayService,
        { provide: getRepositoryToken(Order), useValue: orderRepository },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<VnpayService>(VnpayService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentUrl', () => {
    it('PAY-UNIT-031: throws NotFoundException when order missing', async () => {
      (orderRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createPaymentUrl('u1', 'o1', '127.0.0.1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('PAY-UNIT-032: throws ForbiddenException when order belongs to another user', async () => {
      (orderRepository.findOne as jest.Mock).mockResolvedValue({
        id: 'o1',
        userId: 'u2',
        paymentMethod: PaymentMethod.VNPAY,
      });

      await expect(
        service.createPaymentUrl('u1', 'o1', '127.0.0.1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('PAY-UNIT-033: throws BadRequestException when order is not VNPay method', async () => {
      (orderRepository.findOne as jest.Mock).mockResolvedValue({
        id: 'o1',
        userId: 'u1',
        paymentMethod: PaymentMethod.COD,
      });

      await expect(
        service.createPaymentUrl('u1', 'o1', '127.0.0.1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('PAY-UNIT-034: throws BadRequestException when VNPay config missing', async () => {
      (orderRepository.findOne as jest.Mock).mockResolvedValue({
        id: 'o1',
        userId: 'u1',
        paymentMethod: PaymentMethod.VNPAY,
        totalAmount: '100000',
        orderCode: 'ORD001',
      });
      configService.get.mockImplementation((key: string) =>
        key === 'VNPAY_TMN_CODE' ? undefined : VALID_CONFIG[key],
      );

      await expect(
        service.createPaymentUrl('u1', 'o1', '127.0.0.1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('PAY-UNIT-035: returns signed VNPay payment URL', async () => {
      (orderRepository.findOne as jest.Mock).mockResolvedValue({
        id: 'o1',
        userId: 'u1',
        paymentMethod: PaymentMethod.VNPAY,
        totalAmount: '100000',
        orderCode: 'ORD001',
      });
      mockedBuildSignedQuery.mockReturnValue({
        queryString: 'vnp_Amount=10000000&vnp_TxnRef=ORD001&vnp_SecureHash=abc',
      });

      const result = await service.createPaymentUrl('u1', 'o1', '127.0.0.1');

      expect(mockedBuildSignedQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          vnp_Amount: 10000000,
          vnp_TxnRef: 'ORD001',
          vnp_IpAddr: '127.0.0.1',
        }),
        'secret-key',
      );
      expect(result.paymentUrl).toBe(
        `${VALID_CONFIG.VNPAY_PAYMENT_URL}?vnp_Amount=10000000&vnp_TxnRef=ORD001&vnp_SecureHash=abc`,
      );
    });
  });

  describe('verifyIpnSignature', () => {
    it('PAY-UNIT-036: returns false when hash secret missing', () => {
      configService.get.mockImplementation((key: string) =>
        key === 'VNPAY_HASH_SECRET' ? undefined : VALID_CONFIG[key],
      );

      const result = service.verifyIpnSignature({ vnp_TxnRef: 'ORD001' });

      expect(result).toBe(false);
      expect(mockedVerifySignedQuery).not.toHaveBeenCalled();
    });

    it('PAY-UNIT-037: returns true for valid signature', () => {
      mockedVerifySignedQuery.mockReturnValue(true);

      const query = { vnp_TxnRef: 'ORD001', vnp_SecureHash: 'valid-hash' };
      const result = service.verifyIpnSignature(query);

      expect(mockedVerifySignedQuery).toHaveBeenCalledWith(query, 'secret-key');
      expect(result).toBe(true);
    });

    it('PAY-UNIT-038: returns false for tampered signature', () => {
      mockedVerifySignedQuery.mockReturnValue(false);

      const result = service.verifyIpnSignature({
        vnp_TxnRef: 'ORD001',
        vnp_SecureHash: 'tampered',
      });

      expect(result).toBe(false);
    });
  });

  describe('findOrderForIpn', () => {
    it('PAY-UNIT-039: returns null for empty orderCode', async () => {
      const result = await service.findOrderForIpn('');

      expect(result).toBeNull();
      expect(orderRepository.findOne).not.toHaveBeenCalled();
    });

    it('PAY-UNIT-040: returns order with payment relation', async () => {
      const order = { id: 'o1', orderCode: 'ORD001', payment: { id: 'p1' } };
      (orderRepository.findOne as jest.Mock).mockResolvedValue(order);

      const result = await service.findOrderForIpn('ORD001');

      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { orderCode: 'ORD001' },
        relations: { payment: true },
      });
      expect(result).toBe(order);
    });
  });
});

// =============================================================================
// MomoService — PAY-UNIT-041 → 046
// =============================================================================
describe('MomoService', () => {
  let service: MomoService;

  const CONFIG: Record<string, string | number> = {
    MOMO_PARTNER_CODE: 'MOMOTEST',
    MOMO_PARTNER_NAME: 'Mini Shop',
    MOMO_ACCESS_KEY: 'access-key',
    MOMO_SECRET_KEY: 'secret-key',
    MOMO_API_ENDPOINT: 'https://test-payment.momo.vn/v2/gateway/api/create',
    MOMO_REDIRECT_URL: 'https://shop.example.com/momo/return',
    MOMO_IPN_URL: 'https://shop.example.com/payments/momo/ipn',
    MOMO_REQUEST_TYPE: 'captureWallet',
    MOMO_REQUEST_TIMEOUT_MS: 5000,
  };

  // Rebuilds the exact HMAC-SHA256 signature MomoService.sign() would
  // produce, so tests assert real, correct signatures instead of hardcoded ones.
  const signIpnPayload = (payload: Omit<MomoIpnDto, 'signature'>): string => {
    const rawSignature =
      `accessKey=${CONFIG.MOMO_ACCESS_KEY}` +
      `&amount=${payload.amount}` +
      `&extraData=${payload.extraData ?? ''}` +
      `&message=${payload.message}` +
      `&orderId=${payload.orderId}` +
      `&orderInfo=${payload.orderInfo}` +
      `&orderType=${payload.orderType ?? ''}` +
      `&partnerCode=${payload.partnerCode}` +
      `&payType=${payload.payType ?? ''}` +
      `&requestId=${payload.requestId}` +
      `&responseTime=${payload.responseTime}` +
      `&resultCode=${payload.resultCode}` +
      `&transId=${payload.transId}`;

    return createHmac('sha256', CONFIG.MOMO_SECRET_KEY as string)
      .update(rawSignature)
      .digest('hex');
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MomoService,
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn((key: string) => CONFIG[key]) },
        },
      ],
    }).compile();

    service = module.get<MomoService>(MomoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    const order = { id: 'o1', orderCode: 'ORD001' } as Order;
    const payment = { id: 'p1', amount: '100000' } as Payment;

    it('PAY-UNIT-041: returns payUrl when resultCode=0', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          partnerCode: 'MOMOTEST',
          orderId: 'gw-1',
          requestId: 'req-1',
          amount: 100000,
          responseTime: Date.now(),
          message: 'Success',
          resultCode: 0,
          payUrl: 'https://test-payment.momo.vn/pay/gw-1',
          deeplink: 'momo://gw-1',
          qrCodeUrl: 'https://test-payment.momo.vn/qr/gw-1',
        },
      });

      const result = await service.createPayment(order, payment);

      expect(result.payUrl).toBe('https://test-payment.momo.vn/pay/gw-1');
      expect(result.resultCode).toBe(0);
      expect(result.gatewayOrderId).toMatch(/^p1-\d+$/);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        CONFIG.MOMO_API_ENDPOINT,
        expect.objectContaining({ amount: 100000, partnerCode: 'MOMOTEST' }),
        expect.objectContaining({ timeout: CONFIG.MOMO_REQUEST_TIMEOUT_MS }),
      );
    });

    it('PAY-UNIT-042: throws ServiceUnavailableException on network error', async () => {
      mockedAxios.post.mockRejectedValue(new Error('timeout'));

      await expect(service.createPayment(order, payment)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('PAY-UNIT-043: throws ServiceUnavailableException when resultCode != 0', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { resultCode: 99, message: 'Invalid request' },
      });

      await expect(service.createPayment(order, payment)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('verifyIpnSignature', () => {
    const basePayload: Omit<MomoIpnDto, 'signature'> = {
      partnerCode: 'MOMOTEST',
      orderId: 'gw-1',
      requestId: 'req-1',
      amount: 100000,
      orderInfo: 'Thanh toan don hang ORD001',
      transId: 'txn-1',
      resultCode: 0,
      message: 'Success',
      responseTime: 1700000000000,
    };

    it('PAY-UNIT-044: returns true for a valid HMAC signature', () => {
      const signature = signIpnPayload(basePayload);
      const payload: MomoIpnDto = { ...basePayload, signature };

      expect(service.verifyIpnSignature(payload)).toBe(true);
    });

    it('PAY-UNIT-045: returns false for an invalid signature of equal length', () => {
      const validSignature = signIpnPayload(basePayload);
      const tampered =
        (validSignature[0] === 'a' ? 'b' : 'a') + validSignature.slice(1);

      const payload: MomoIpnDto = {
        ...basePayload,
        signature: tampered,
      };

      expect(service.verifyIpnSignature(payload)).toBe(false);
    });

    it('PAY-UNIT-046: returns false safely when signature length differs', () => {
      const payload: MomoIpnDto = {
        ...basePayload,
        signature: 'too-short',
      };

      expect(() => service.verifyIpnSignature(payload)).not.toThrow();
      expect(service.verifyIpnSignature(payload)).toBe(false);
    });
  });
});

// =============================================================================
// MomoIpnDto — PAY-UNIT-008 → 010
// =============================================================================
describe('MomoIpnDto', () => {
  const VALID_PAYLOAD = {
    partnerCode: 'MOMOTEST',
    orderId: 'gw-1-1700000000000',
    requestId: 'req-1',
    amount: 100000,
    orderInfo: 'Thanh toan don hang ORD001',
    orderType: 'momo_wallet',
    transId: 'txn-1',
    resultCode: 0,
    message: 'Success',
    payType: 'qr',
    responseTime: 1700000000000,
    requestType: 'captureWallet',
    extraData: '',
    signature: 'abc123',
  };

  it('PAY-UNIT-008: rejects payload missing partnerCode', async () => {
    // Intentionally dropping this key via rest destructure (project's no-unused-vars has no ignoreRestSiblings)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { partnerCode, ...withoutPartnerCode } = VALID_PAYLOAD;
    const dto = plainToInstance(MomoIpnDto, withoutPartnerCode);

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'partnerCode')).toBe(true);
  });

  it('PAY-UNIT-009: rejects payload with non-integer resultCode', async () => {
    const dto = plainToInstance(MomoIpnDto, {
      ...VALID_PAYLOAD,
      resultCode: '0',
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'resultCode')).toBe(true);
  });

  it('PAY-UNIT-010: accepts a fully valid MoMo IPN payload', async () => {
    const dto = plainToInstance(MomoIpnDto, VALID_PAYLOAD);

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});

// =============================================================================
// VnpayIpnDto — PAY-UNIT-011 / 012
// =============================================================================
describe('VnpayIpnDto', () => {
  const VALID_PAYLOAD = {
    vnp_TxnRef: 'ORD001',
    vnp_Amount: '10000000',
    vnp_ResponseCode: '00',
    vnp_TransactionStatus: '00',
    vnp_SecureHash: 'abc123',
    vnp_TransactionNo: '14000001',
    vnp_BankCode: 'NCB',
    vnp_PayDate: '20260824120000',
  };

  it('PAY-UNIT-011: rejects payload missing vnp_TxnRef', async () => {
    // Intentionally dropping this key via rest destructure (project's no-unused-vars has no ignoreRestSiblings)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { vnp_TxnRef, ...withoutTxnRef } = VALID_PAYLOAD;
    const dto = plainToInstance(VnpayIpnDto, withoutTxnRef);

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'vnp_TxnRef')).toBe(true);
  });

  it('PAY-UNIT-012: accepts a fully valid VNPay IPN payload', async () => {
    const dto = plainToInstance(VnpayIpnDto, VALID_PAYLOAD);

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
