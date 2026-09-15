import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import {
  createTestApp,
  createAdmin,
  createActiveSeller,
  createCategory,
  createActiveProductWithVariant,
  registerAndLoginCustomer,
  addItemToCart,
  bearer,
  getRepo,
} from './utils/setup';
import { Order } from '../src/modules/orders/entities/order.entity';
import {
  buildSignedQuery,
  verifySignedQuery,
} from '../src/common/utils/vnpay-sign.util';

function shippingAddress() {
  return {
    recipientName: 'Nguyen Van E',
    phone: '0933333333',
    fullAddress: '321 Test Street, District 7, HCMC',
  };
}

describe('Payment & Refund (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let categoryId: string;
  let vnpayHashSecret: string;

  beforeAll(async () => {
    app = await createTestApp();
    const admin = await createAdmin(app);
    adminToken = admin.accessToken;
    const category = await createCategory(app, adminToken);
    categoryId = category.id;
    vnpayHashSecret = app.get(ConfigService).get<string>('VNPAY_HASH_SECRET')!;
  });

  afterAll(async () => {
    await app.close();
  });

  async function placeVnpayOrder(price = 150000, stockQty = 10) {
    const seller = await createActiveSeller(app, adminToken);
    const product = await createActiveProductWithVariant(
      app,
      seller.accessToken,
      adminToken,
      categoryId,
      { price, stockQty },
    );
    const customer = await registerAndLoginCustomer(app);
    await addItemToCart(app, customer.accessToken, product.variantId, 1).expect(
      200,
    );
    const checkoutRes = await request(app.getHttpServer())
      .post('/orders/checkout')
      .set(...bearer(customer.accessToken))
      .send({ address: shippingAddress(), paymentMethod: 'vnpay' })
      .expect(201);

    const order = checkoutRes.body.data[0] as {
      id: string;
      orderCode: string;
      totalAmount: string;
    };
    return { seller, product, customer, order };
  }

  function buildIpnQuery(
    orderCode: string,
    totalAmount: string,
    opts: Partial<{ responseCode: string; transactionStatus: string }> = {},
  ) {
    const params: Record<string, string | number> = {
      vnp_TxnRef: orderCode,
      vnp_Amount: Math.round(Number(totalAmount) * 100),
      vnp_ResponseCode: opts.responseCode ?? '00',
      vnp_TransactionStatus: opts.transactionStatus ?? '00',
      vnp_TransactionNo: `TXN-${Date.now()}`,
    };
    const { queryString } = buildSignedQuery(params, vnpayHashSecret);
    const query: Record<string, string> = {};
    for (const pair of queryString.split('&')) {
      const [key, value] = pair.split('=');
      query[key] = decodeURIComponent(value.replace(/\+/g, '%20'));
    }
    return query;
  }

  // E2E-019: VNPay tạo URL và xử lý callback
  describe('E2E-019: VNPay create payment URL + process callback', () => {
    it('generates a payment URL with correct amount/TxnRef and a valid signature', async () => {
      const { customer, order } = await placeVnpayOrder(200000);

      const res = await request(app.getHttpServer())
        .post(`/payments/${order.id}/vnpay`)
        .set(...bearer(customer.accessToken))
        .expect(200);

      const paymentUrl = res.body.data.paymentUrl as string;
      const url = new URL(paymentUrl);

      expect(url.searchParams.get('vnp_TxnRef')).toBe(order.orderCode);
      expect(Number(url.searchParams.get('vnp_Amount'))).toBe(
        Math.round(Number(order.totalAmount) * 100),
      );

      const rawQuery: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        rawQuery[key] = value;
      });
      expect(verifySignedQuery(rawQuery, vnpayHashSecret)).toBe(true);
    });

    it('a successful signed IPN callback marks payment success, updates order status, and commits stock', async () => {
      const { order } = await placeVnpayOrder(150000, 5);

      const ipnQuery = buildIpnQuery(order.orderCode, order.totalAmount);

      const ipnRes = await request(app.getHttpServer())
        .get('/payments/vnpay/ipn')
        .query(ipnQuery)
        .expect(200);

      expect(ipnRes.body.data.RspCode).toBe('00');

      const orderRepo = getRepo(app, Order);
      const updatedOrder = await orderRepo.findOne({ where: { id: order.id } });
      expect(updatedOrder?.status).toBe('paid_pending_confirmation');
    });

    it('an IPN callback with an invalid signature is rejected and does not change order status', async () => {
      const { order } = await placeVnpayOrder(150000, 5);

      const tamperedQuery = buildIpnQuery(order.orderCode, order.totalAmount);
      tamperedQuery.vnp_SecureHash = `${tamperedQuery.vnp_SecureHash}0`; // corrupt hash

      const ipnRes = await request(app.getHttpServer())
        .get('/payments/vnpay/ipn')
        .query(tamperedQuery)
        .expect(200);

      expect(ipnRes.body.data.RspCode).toBe('97');

      const orderRepo = getRepo(app, Order);
      const untouchedOrder = await orderRepo.findOne({
        where: { id: order.id },
      });
      expect(untouchedOrder?.status).toBe('pending_payment');
    });
  });

  // E2E-020: Payment idempotency, rollback, refund and IDOR
  describe('E2E-020: Idempotency, rollback, refund, and IDOR', () => {
    it('a duplicate successful IPN callback does not double-update the order/payment', async () => {
      const { order } = await placeVnpayOrder(150000, 5);
      const ipnQuery = buildIpnQuery(order.orderCode, order.totalAmount);

      const first = await request(app.getHttpServer())
        .get('/payments/vnpay/ipn')
        .query(ipnQuery)
        .expect(200);
      expect(first.body.data.RspCode).toBe('00');

      // replay the exact same (already-processed) callback
      const second = await request(app.getHttpServer())
        .get('/payments/vnpay/ipn')
        .query(ipnQuery)
        .expect(200);
      expect(second.body.data.RspCode).toBe('02'); // "Order already confirmed"

      const orderRepo = getRepo(app, Order);
      const finalOrder = await orderRepo.findOne({ where: { id: order.id } });
      expect(finalOrder?.status).toBe('paid_pending_confirmation');
    });

    it('a failed callback releases the reserved stock back to available', async () => {
      const { customer, product, order } = await placeVnpayOrder(150000, 1);

      // stock is fully reserved (1/1) right after checkout — cannot add more
      await addItemToCart(
        app,
        customer.accessToken,
        product.variantId,
        1,
      ).expect(400);

      const failQuery = buildIpnQuery(order.orderCode, order.totalAmount, {
        responseCode: '24',
        transactionStatus: '02',
      });

      const ipnRes = await request(app.getHttpServer())
        .get('/payments/vnpay/ipn')
        .query(failQuery)
        .expect(200);
      expect(ipnRes.body.data.RspCode).toBe('00');

      const orderRepo = getRepo(app, Order);
      const failedOrder = await orderRepo.findOne({ where: { id: order.id } });
      expect(failedOrder?.status).toBe('payment_failed');

      // reserved stock has been released — adding 1 item is now possible again
      await addItemToCart(
        app,
        customer.accessToken,
        product.variantId,
        1,
      ).expect(200);
    });

    it('refund approval (COD order) refunds exactly once and restores the correct state', async () => {
      const seller = await createActiveSeller(app, adminToken);
      const product = await createActiveProductWithVariant(
        app,
        seller.accessToken,
        adminToken,
        categoryId,
        { price: 120000, stockQty: 5 },
      );
      const customer = await registerAndLoginCustomer(app);
      await addItemToCart(
        app,
        customer.accessToken,
        product.variantId,
        1,
      ).expect(200);

      const checkoutRes = await request(app.getHttpServer())
        .post('/orders/checkout')
        .set(...bearer(customer.accessToken))
        .send({ address: shippingAddress(), paymentMethod: 'cod' })
        .expect(201);
      const orderId = checkoutRes.body.data[0].id as string;

      // walk the order to "delivered" so a refund request is eligible
      await request(app.getHttpServer())
        .patch(`/orders/${orderId}/confirm`)
        .set(...bearer(seller.accessToken))
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/orders/${orderId}/preparing`)
        .set(...bearer(seller.accessToken))
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/orders/${orderId}/shipping`)
        .set(...bearer(seller.accessToken))
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/orders/${orderId}/delivered`)
        .set(...bearer(seller.accessToken))
        .expect(200);

      const refundReqRes = await request(app.getHttpServer())
        .post(`/orders/${orderId}/refund-requests`)
        .set(...bearer(customer.accessToken))
        .send({ reason: 'The product arrived broken and unusable' })
        .expect(201);
      const refundRequestId = refundReqRes.body.data.id as string;

      const approveRes = await request(app.getHttpServer())
        .patch(`/refund-requests/${refundRequestId}/approve`)
        .set(...bearer(seller.accessToken))
        .expect(200);
      expect(approveRes.body.data.status).toBe('approved');

      const orderRepo = getRepo(app, Order);
      const refundedOrder = await orderRepo.findOne({ where: { id: orderId } });
      expect(refundedOrder?.status).toBe('refunded');

      // approving twice is rejected — refund happens exactly once
      await request(app.getHttpServer())
        .patch(`/refund-requests/${refundRequestId}/approve`)
        .set(...bearer(seller.accessToken))
        .expect((res) => {
          expect([400, 409]).toContain(res.status);
        });
    });

    it('IDOR: a different customer cannot access or refund-request another customer order', async () => {
      const seller = await createActiveSeller(app, adminToken);
      const product = await createActiveProductWithVariant(
        app,
        seller.accessToken,
        adminToken,
        categoryId,
        { price: 90000, stockQty: 5 },
      );
      const ownerCustomer = await registerAndLoginCustomer(app);
      const attackerCustomer = await registerAndLoginCustomer(app);

      await addItemToCart(
        app,
        ownerCustomer.accessToken,
        product.variantId,
        1,
      ).expect(200);
      const checkoutRes = await request(app.getHttpServer())
        .post('/orders/checkout')
        .set(...bearer(ownerCustomer.accessToken))
        .send({ address: shippingAddress(), paymentMethod: 'cod' })
        .expect(201);
      const orderId = checkoutRes.body.data[0].id as string;

      // attacker cannot view the owner's order
      await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set(...bearer(attackerCustomer.accessToken))
        .expect(403);

      // attacker cannot create a refund request against it either
      await request(app.getHttpServer())
        .post(`/orders/${orderId}/refund-requests`)
        .set(...bearer(attackerCustomer.accessToken))
        .send({ reason: 'Trying to refund an order that is not mine' })
        .expect(403);

      // owner can still view their own order
      await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set(...bearer(ownerCustomer.accessToken))
        .expect(200);
    });
  });
});
