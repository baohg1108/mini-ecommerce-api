import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { VnpayService } from './vnpay/vnpay.service';
import { MomoService } from './momo/momo.service';
import { Order } from '../orders/entities/order.entity';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';

const mockGuard = { canActivate: jest.fn(() => true) };

describe('PaymentController', () => {
  let controller: PaymentController;

  const mockPaymentService = {
    getPaymentHistory: jest.fn(),
    attachGatewayOrderId: jest.fn(),
    markSuccessByOrderId: jest.fn(),
    markFailedByOrderId: jest.fn(),
    findByGatewayOrderId: jest.fn(),
    markSuccessByGatewayOrderId: jest.fn(),
    markFailedByGatewayOrderId: jest.fn(),
  };

  const mockVnpayService = {
    createPaymentUrl: jest.fn(),
    verifyIpnSignature: jest.fn(),
    findOrderForIpn: jest.fn(),
  };

  const mockMomoService = {
    createPayment: jest.fn(),
    verifyIpnSignature: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockOrderRepository = {
    findOne: jest.fn(),
  };

  const userId = 'user-1';
  const orderId = 'order-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: VnpayService, useValue: mockVnpayService },
        { provide: MomoService, useValue: mockMomoService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPaymentHistory', () => {
    it('should call paymentService.getPaymentHistory with user id and query', async () => {
      const query = { page: 1, limit: 20 } as any;
      const expected = { data: [], total: 0 };
      mockPaymentService.getPaymentHistory.mockResolvedValue(expected);

      const result = await controller.getPaymentHistory(userId, query);

      expect(mockPaymentService.getPaymentHistory).toHaveBeenCalledWith(
        userId,
        query,
      );
      expect(result).toBe(expected);
    });
  });

  describe('createVnpayUrl', () => {
    it('should build the client ip from x-forwarded-for and delegate to vnpayService', async () => {
      const req = {
        headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;
      const expected = { paymentUrl: 'https://vnpay.example/pay' };
      mockVnpayService.createPaymentUrl.mockResolvedValue(expected);

      const result = await controller.createVnpayUrl(userId, orderId, req);

      expect(mockVnpayService.createPaymentUrl).toHaveBeenCalledWith(
        userId,
        orderId,
        '203.0.113.5',
      );
      expect(result).toBe(expected);
    });

    it('should fall back to the socket remote address when no forwarded header is present', async () => {
      const req = {
        headers: {},
        socket: { remoteAddress: '10.0.0.9' },
      } as unknown as Request;
      mockVnpayService.createPaymentUrl.mockResolvedValue({});

      await controller.createVnpayUrl(userId, orderId, req);

      expect(mockVnpayService.createPaymentUrl).toHaveBeenCalledWith(
        userId,
        orderId,
        '10.0.0.9',
      );
    });
  });

  describe('createMomoPayment', () => {
    const baseOrder = {
      id: orderId,
      userId,
      paymentMethod: PaymentMethod.MOMO,
      payment: { id: 'payment-1', status: PaymentStatus.PENDING, amount: 1000 },
    };

    it('should throw NotFoundException when the order does not exist', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.createMomoPayment(userId, orderId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when the order does not belong to the user', async () => {
      mockOrderRepository.findOne.mockResolvedValue({
        ...baseOrder,
        userId: 'someone-else',
      });

      await expect(
        controller.createMomoPayment(userId, orderId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when the order was not placed with Momo', async () => {
      mockOrderRepository.findOne.mockResolvedValue({
        ...baseOrder,
        paymentMethod: PaymentMethod.VNPAY,
      });

      await expect(
        controller.createMomoPayment(userId, orderId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when there is no payment record', async () => {
      mockOrderRepository.findOne.mockResolvedValue({
        ...baseOrder,
        payment: null,
      });

      await expect(
        controller.createMomoPayment(userId, orderId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when the payment is not pending', async () => {
      mockOrderRepository.findOne.mockResolvedValue({
        ...baseOrder,
        payment: { ...baseOrder.payment, status: PaymentStatus.SUCCESS },
      });

      await expect(
        controller.createMomoPayment(userId, orderId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call momoService.createPayment and attach the gateway order id on success', async () => {
      mockOrderRepository.findOne.mockResolvedValue(baseOrder);
      mockMomoService.createPayment.mockResolvedValue({
        gatewayOrderId: 'gw-order-1',
        payUrl: 'https://momo.example/pay',
        qrCodeUrl: 'https://momo.example/qr',
        deeplink: 'momo://deeplink',
      });
      mockPaymentService.attachGatewayOrderId.mockResolvedValue(undefined);

      const result = await controller.createMomoPayment(userId, orderId);

      expect(mockMomoService.createPayment).toHaveBeenCalledWith(
        baseOrder,
        baseOrder.payment,
      );
      expect(mockPaymentService.attachGatewayOrderId).toHaveBeenCalledWith(
        baseOrder.payment.id,
        'gw-order-1',
      );
      expect(result).toEqual(
        expect.objectContaining({
          orderId: baseOrder.id,
          amount: baseOrder.payment.amount,
          payUrl: 'https://momo.example/pay',
          qrCodeUrl: 'https://momo.example/qr',
          deeplink: 'momo://deeplink',
        }),
      );
    });
  });

  describe('handleVnpayReturn', () => {
    it('should redirect to the frontend success url on success', async () => {
      mockConfigService.get.mockReturnValue('http://localhost:3001');
      jest.spyOn(controller, 'handleVnpayIpn').mockResolvedValue({
        RspCode: '00',
        Message: 'Confirm Success',
      });

      const query = {
        vnp_TxnRef: 'order-1',
        vnp_ResponseCode: '00',
      } as any;
      const req = { query } as unknown as Request;
      const redirect = jest.fn();
      const response = { redirect } as unknown as Response;

      await controller.handleVnpayReturn(query, req, response);

      expect(redirect).toHaveBeenCalledTimes(1);
      const redirectUrl = redirect.mock.calls[0][0] as string;
      expect(redirectUrl).toContain('/payment/success');
      expect(redirectUrl).toContain('payment=success');
      expect(redirectUrl).toContain('order=order-1');
    });

    it('should redirect with a cancelled status when vnp_ResponseCode is 24', async () => {
      mockConfigService.get.mockReturnValue('http://localhost:3001');
      jest.spyOn(controller, 'handleVnpayIpn').mockResolvedValue({
        RspCode: '97',
        Message: 'Invalid signature',
      });

      const query = {
        vnp_TxnRef: 'order-1',
        vnp_ResponseCode: '24',
      } as any;
      const req = { query } as unknown as Request;
      const redirect = jest.fn();
      const response = { redirect } as unknown as Response;

      await controller.handleVnpayReturn(query, req, response);

      const redirectUrl = redirect.mock.calls[0][0] as string;
      expect(redirectUrl).toContain('payment=cancelled');
    });
  });

  describe('mockVnpaySuccess', () => {
    it('should throw NotFoundException when order is missing or not owned by the user', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.mockVnpaySuccess(userId, orderId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when the order is not a VNPay order', async () => {
      mockOrderRepository.findOne.mockResolvedValue({
        id: orderId,
        userId,
        paymentMethod: PaymentMethod.MOMO,
      });

      await expect(
        controller.mockVnpaySuccess(userId, orderId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call paymentService.markSuccessByOrderId for a valid VNPay order', async () => {
      mockOrderRepository.findOne.mockResolvedValue({
        id: orderId,
        userId,
        paymentMethod: PaymentMethod.VNPAY,
      });
      const expected = { status: PaymentStatus.SUCCESS };
      mockPaymentService.markSuccessByOrderId.mockResolvedValue(expected);

      const result = await controller.mockVnpaySuccess(userId, orderId);

      expect(mockPaymentService.markSuccessByOrderId).toHaveBeenCalledWith(
        orderId,
        expect.objectContaining({ gatewayResponseCode: '00' }),
      );
      expect(result).toBe(expected);
    });
  });

  describe('handleMomoIpn', () => {
    const body = {
      orderId: 'gw-order-1',
      resultCode: 0,
      transId: 'txn-1',
      signature: 'sig-1',
    } as any;

    it('should throw BadRequestException when the signature is invalid', async () => {
      mockMomoService.verifyIpnSignature.mockReturnValue(false);

      await expect(controller.handleMomoIpn(body)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should do nothing when no matching payment is found', async () => {
      mockMomoService.verifyIpnSignature.mockReturnValue(true);
      mockPaymentService.findByGatewayOrderId.mockResolvedValue(null);

      await controller.handleMomoIpn(body);

      expect(
        mockPaymentService.markSuccessByGatewayOrderId,
      ).not.toHaveBeenCalled();
    });

    it('should do nothing when the payment is no longer pending', async () => {
      mockMomoService.verifyIpnSignature.mockReturnValue(true);
      mockPaymentService.findByGatewayOrderId.mockResolvedValue({
        status: PaymentStatus.SUCCESS,
      });

      await controller.handleMomoIpn(body);

      expect(
        mockPaymentService.markSuccessByGatewayOrderId,
      ).not.toHaveBeenCalled();
    });

    it('should mark the payment successful when resultCode is 0', async () => {
      mockMomoService.verifyIpnSignature.mockReturnValue(true);
      mockPaymentService.findByGatewayOrderId.mockResolvedValue({
        status: PaymentStatus.PENDING,
      });

      await controller.handleMomoIpn(body);

      expect(
        mockPaymentService.markSuccessByGatewayOrderId,
      ).toHaveBeenCalledWith(
        body.orderId,
        expect.objectContaining({ gatewayTxnId: body.transId }),
      );
    });

    it('should mark the payment failed when resultCode is non-zero', async () => {
      mockMomoService.verifyIpnSignature.mockReturnValue(true);
      mockPaymentService.findByGatewayOrderId.mockResolvedValue({
        status: PaymentStatus.PENDING,
      });

      await controller.handleMomoIpn({ ...body, resultCode: 1 });

      expect(
        mockPaymentService.markFailedByGatewayOrderId,
      ).toHaveBeenCalledWith(
        body.orderId,
        expect.objectContaining({ gatewayResponseCode: '1' }),
      );
    });
  });

  describe('handleVnpayIpn', () => {
    const validQuery = {
      vnp_TxnRef: 'order-1',
      vnp_Amount: '100000',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_SecureHash: 'hash',
      vnp_TransactionNo: 'txn-1',
    } as any;

    const makeReq = (query: any) => ({ query }) as unknown as Request;

    it('should return code 99 when a required field is missing', async () => {
      const { vnp_TxnRef, ...rest } = validQuery;
      const req = makeReq(rest);

      const result = await controller.handleVnpayIpn(rest, req);

      expect(result.RspCode).toBe('99');
      expect(mockVnpayService.verifyIpnSignature).not.toHaveBeenCalled();
    });

    it('should return code 97 when the signature is invalid', async () => {
      mockVnpayService.verifyIpnSignature.mockReturnValue(false);
      const req = makeReq(validQuery);

      const result = await controller.handleVnpayIpn(validQuery, req);

      expect(result.RspCode).toBe('97');
    });

    it('should return code 01 when no matching order is found', async () => {
      mockVnpayService.verifyIpnSignature.mockReturnValue(true);
      mockVnpayService.findOrderForIpn.mockResolvedValue(null);
      const req = makeReq(validQuery);

      const result = await controller.handleVnpayIpn(validQuery, req);

      expect(result.RspCode).toBe('01');
    });

    it('should return code 04 when the amount does not match', async () => {
      mockVnpayService.verifyIpnSignature.mockReturnValue(true);
      mockVnpayService.findOrderForIpn.mockResolvedValue({
        totalAmount: 500,
        payment: { status: PaymentStatus.PENDING, orderId: 'order-1' },
      });
      const req = makeReq(validQuery);

      const result = await controller.handleVnpayIpn(validQuery, req);

      expect(result.RspCode).toBe('04');
    });

    it('should return code 02 when the payment is already confirmed', async () => {
      mockVnpayService.verifyIpnSignature.mockReturnValue(true);
      mockVnpayService.findOrderForIpn.mockResolvedValue({
        totalAmount: 1000,
        payment: { status: PaymentStatus.SUCCESS, orderId: 'order-1' },
      });
      const req = makeReq(validQuery);

      const result = await controller.handleVnpayIpn(validQuery, req);

      expect(result.RspCode).toBe('02');
    });

    it('should mark the payment successful and return code 00 on a valid success callback', async () => {
      mockVnpayService.verifyIpnSignature.mockReturnValue(true);
      mockVnpayService.findOrderForIpn.mockResolvedValue({
        totalAmount: 1000,
        payment: { status: PaymentStatus.PENDING, orderId: 'order-1' },
      });
      const req = makeReq(validQuery);

      const result = await controller.handleVnpayIpn(validQuery, req);

      expect(mockPaymentService.markSuccessByOrderId).toHaveBeenCalledWith(
        'order-1',
        expect.objectContaining({ gatewayTxnId: validQuery.vnp_TransactionNo }),
      );
      expect(result.RspCode).toBe('00');
    });

    it('should mark the payment failed and still return code 00 when the gateway reports a failure', async () => {
      mockVnpayService.verifyIpnSignature.mockReturnValue(true);
      mockVnpayService.findOrderForIpn.mockResolvedValue({
        totalAmount: 1000,
        payment: { status: PaymentStatus.PENDING, orderId: 'order-1' },
      });
      const failedQuery = {
        ...validQuery,
        vnp_ResponseCode: '24',
        vnp_TransactionStatus: '02',
      };
      const req = makeReq(failedQuery);

      const result = await controller.handleVnpayIpn(failedQuery, req);

      expect(mockPaymentService.markFailedByOrderId).toHaveBeenCalledWith(
        'order-1',
        expect.objectContaining({ gatewayResponseCode: '24' }),
      );
      expect(result.RspCode).toBe('00');
    });
  });
});
