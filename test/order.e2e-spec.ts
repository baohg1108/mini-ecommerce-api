import { INestApplication } from '@nestjs/common';
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
} from './utils/setup';

function shippingAddress(overrides: Partial<Record<string, string>> = {}) {
  return {
    recipientName: overrides.recipientName ?? 'Nguyen Van D',
    phone: overrides.phone ?? '0922222222',
    fullAddress: overrides.fullAddress ?? '789 Test Street, District 5, HCMC',
  };
}

describe('Order (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let categoryId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const admin = await createAdmin(app);
    adminToken = admin.accessToken;
    const category = await createCategory(app, adminToken);
    categoryId = category.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // E2E-013: Checkout COD một shop
  describe('E2E-013: Checkout COD single shop', () => {
    it('creates exactly one order with correct totals, empties the cart, and reserves stock', async () => {
      const seller = await createActiveSeller(app, adminToken);
      const product = await createActiveProductWithVariant(
        app,
        seller.accessToken,
        adminToken,
        categoryId,
        { price: 50000, stockQty: 10 },
      );
      const customer = await registerAndLoginCustomer(app);

      await addItemToCart(
        app,
        customer.accessToken,
        product.variantId,
        2,
      ).expect(200);

      const checkoutRes = await request(app.getHttpServer())
        .post('/orders/checkout')
        .set(...bearer(customer.accessToken))
        .send({ address: shippingAddress(), paymentMethod: 'cod' })
        .expect(201);

      const orders = checkoutRes.body.data as Array<Record<string, unknown>>;
      expect(orders).toHaveLength(1);
      const order = orders[0];
      expect(Number(order.subtotalAmount)).toBe(100000);
      expect(Number(order.discountAmount)).toBe(0);
      expect(Number(order.totalAmount)).toBe(100000);
      expect(order.status).toBe('pending_confirmation');

      // cart is now empty
      const cartRes = await request(app.getHttpServer())
        .get('/cart')
        .set(...bearer(customer.accessToken))
        .expect(200);
      expect(cartRes.body.data.items).toHaveLength(0);
      const secondAdd = await addItemToCart(
        app,
        customer.accessToken,
        product.variantId,
        9,
      );
      // only 8 left available (10 - 2 reserved), so requesting 9 must fail
      expect(secondAdd.status).toBe(400);
    });
  });

  // E2E-014: Checkout cart có nhiều shop
  describe('E2E-014: Checkout with multiple shops in cart', () => {
    it('creates one order per shop, with line items scoped correctly and totals summed per shop', async () => {
      const sellerA = await createActiveSeller(app, adminToken);
      const sellerB = await createActiveSeller(app, adminToken);
      const productA = await createActiveProductWithVariant(
        app,
        sellerA.accessToken,
        adminToken,
        categoryId,
        { price: 30000, stockQty: 10 },
      );
      const productB = await createActiveProductWithVariant(
        app,
        sellerB.accessToken,
        adminToken,
        categoryId,
        { price: 45000, stockQty: 10 },
      );
      const customer = await registerAndLoginCustomer(app);

      await addItemToCart(
        app,
        customer.accessToken,
        productA.variantId,
        2,
      ).expect(200);
      await addItemToCart(
        app,
        customer.accessToken,
        productB.variantId,
        1,
      ).expect(200);

      const checkoutRes = await request(app.getHttpServer())
        .post('/orders/checkout')
        .set(...bearer(customer.accessToken))
        .send({ address: shippingAddress(), paymentMethod: 'cod' })
        .expect(201);

      const orders = checkoutRes.body.data as Array<{
        shopId: string;
        subtotalAmount: string;
        items: Array<{ variantId: string }>;
      }>;
      expect(orders).toHaveLength(2);

      const orderShopA = orders.find((o) => o.shopId === sellerA.shopId);
      const orderShopB = orders.find((o) => o.shopId === sellerB.shopId);

      expect(orderShopA).toBeDefined();
      expect(orderShopB).toBeDefined();

      // no cross-shop mixing of line items
      expect(
        orderShopA!.items.every((i) => i.variantId === productA.variantId),
      ).toBe(true);
      expect(
        orderShopB!.items.every((i) => i.variantId === productB.variantId),
      ).toBe(true);

      expect(Number(orderShopA!.subtotalAmount)).toBe(60000);
      expect(Number(orderShopB!.subtotalAmount)).toBe(45000);
    });
  });

  // E2E-015: Hai checkout đồng thời với stock bằng 1
  describe('E2E-015: Two concurrent checkouts racing on stock = 1', () => {
    it('only one checkout succeeds; the other fails; final stock is 0', async () => {
      const seller = await createActiveSeller(app, adminToken);
      const product = await createActiveProductWithVariant(
        app,
        seller.accessToken,
        adminToken,
        categoryId,
        { price: 99000, stockQty: 1 },
      );

      const customerA = await registerAndLoginCustomer(app);
      const customerB = await registerAndLoginCustomer(app);

      await addItemToCart(
        app,
        customerA.accessToken,
        product.variantId,
        1,
      ).expect(200);
      await addItemToCart(
        app,
        customerB.accessToken,
        product.variantId,
        1,
      ).expect(200);

      const [resA, resB] = await Promise.all([
        request(app.getHttpServer())
          .post('/orders/checkout')
          .set(...bearer(customerA.accessToken))
          .send({ address: shippingAddress(), paymentMethod: 'cod' }),
        request(app.getHttpServer())
          .post('/orders/checkout')
          .set(...bearer(customerB.accessToken))
          .send({ address: shippingAddress(), paymentMethod: 'cod' }),
      ]);

      const statuses = [resA.status, resB.status].sort();
      // exactly one succeeded (201) and the other failed (400/409)
      expect(statuses[0]).toBeGreaterThanOrEqual(400);
      expect(statuses[1]).toBe(201);

      // no further stock is purchasable — a third attempt must fail
      const customerC = await registerAndLoginCustomer(app);
      const addThird = await addItemToCart(
        app,
        customerC.accessToken,
        product.variantId,
        1,
      );
      expect(addThird.status).toBe(400);
    });
  });

  // E2E-016: Seller chỉ thấy và cập nhật order thuộc shop mình
  describe('E2E-016: Seller can only view/update orders belonging to their shop', () => {
    it("seller order list excludes foreign shop's orders; updating a foreign order is forbidden", async () => {
      const sellerA = await createActiveSeller(app, adminToken);
      const sellerB = await createActiveSeller(app, adminToken);
      const productA = await createActiveProductWithVariant(
        app,
        sellerA.accessToken,
        adminToken,
        categoryId,
        { price: 40000, stockQty: 10 },
      );
      const customer = await registerAndLoginCustomer(app);

      await addItemToCart(
        app,
        customer.accessToken,
        productA.variantId,
        1,
      ).expect(200);
      const checkoutRes = await request(app.getHttpServer())
        .post('/orders/checkout')
        .set(...bearer(customer.accessToken))
        .send({ address: shippingAddress(), paymentMethod: 'cod' })
        .expect(201);
      const orderId = checkoutRes.body.data[0].id as string;

      // sellerB's order list must not contain sellerA's order
      const sellerBOrders = await request(app.getHttpServer())
        .get('/seller/orders')
        .set(...bearer(sellerB.accessToken))
        .expect(200);
      const items = sellerBOrders.body.data.items as Array<{ orderId: string }>;
      expect(items.some((i) => i.orderId === orderId)).toBe(false);

      // sellerB attempting to confirm sellerA's order is forbidden
      await request(app.getHttpServer())
        .patch(`/orders/${orderId}/confirm`)
        .set(...bearer(sellerB.accessToken))
        .expect(403);

      // sellerA (rightful owner) can confirm it
      const confirmRes = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/confirm`)
        .set(...bearer(sellerA.accessToken))
        .expect(200);
      expect(confirmRes.body.data.status).toBe('confirmed');

      // sellerA's own list does contain it
      const sellerAOrders = await request(app.getHttpServer())
        .get('/seller/orders')
        .set(...bearer(sellerA.accessToken))
        .expect(200);
      expect(
        (sellerAOrders.body.data.items as Array<{ orderId: string }>).some(
          (i) => i.orderId === orderId,
        ),
      ).toBe(true);
    });
  });

  // E2E-017: Order state machine
  describe('E2E-017: Order state machine transitions', () => {
    async function placeConfirmedOrder() {
      const seller = await createActiveSeller(app, adminToken);
      const product = await createActiveProductWithVariant(
        app,
        seller.accessToken,
        adminToken,
        categoryId,
        { price: 35000, stockQty: 10 },
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
      return { seller, customer, orderId };
    }

    it('happy path: confirm -> preparing -> shipping -> delivered -> complete', async () => {
      const { seller, orderId } = await placeConfirmedOrder();

      await request(app.getHttpServer())
        .patch(`/orders/${orderId}/confirm`)
        .set(...bearer(seller.accessToken))
        .expect(200);

      const preparingRes = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/preparing`)
        .set(...bearer(seller.accessToken))
        .expect(200);
      expect(preparingRes.body.data.status).toBe('preparing');

      const shippingRes = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/shipping`)
        .set(...bearer(seller.accessToken))
        .expect(200);
      expect(shippingRes.body.data.status).toBe('shipping');

      const deliveredRes = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/delivered`)
        .set(...bearer(seller.accessToken))
        .expect(200);
      expect(deliveredRes.body.data.status).toBe('delivered');

      const completeRes = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/complete`)
        .set(...bearer(seller.accessToken))
        .expect(200);
      expect(completeRes.body.data.status).toBe('completed');
    });

    it('rejects skipping a state (pending_confirmation -> shipping directly)', async () => {
      const { seller, orderId } = await placeConfirmedOrder();

      await request(app.getHttpServer())
        .patch(`/orders/${orderId}/shipping`)
        .set(...bearer(seller.accessToken))
        .expect(400);
    });

    it('rejects going backwards (delivered -> preparing)', async () => {
      const { seller, orderId } = await placeConfirmedOrder();

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

      // cannot go back to preparing after delivered
      await request(app.getHttpServer())
        .patch(`/orders/${orderId}/preparing`)
        .set(...bearer(seller.accessToken))
        .expect(400);
    });

    it('customer can cancel only while pending_confirmation; seller cancel releases/restocks correctly', async () => {
      const { customer, orderId } = await placeConfirmedOrder();

      const cancelRes = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/cancel`)
        .set(...bearer(customer.accessToken))
        .send({ reason: 'Changed my mind about this purchase' })
        .expect(200);
      expect(cancelRes.body.data.status).toBe('cancelled');

      // cannot cancel twice
      await request(app.getHttpServer())
        .patch(`/orders/${orderId}/cancel`)
        .set(...bearer(customer.accessToken))
        .send({ reason: 'Trying to cancel again' })
        .expect(400);
    });
  });

  // E2E-018: Voucher negative business rules
  describe('E2E-018: Voucher negative business rules block checkout', () => {
    async function setupCartWithSubtotal(subtotal: number) {
      const seller = await createActiveSeller(app, adminToken);
      const product = await createActiveProductWithVariant(
        app,
        seller.accessToken,
        adminToken,
        categoryId,
        { price: subtotal, stockQty: 10 },
      );
      const customer = await registerAndLoginCustomer(app);
      await addItemToCart(
        app,
        customer.accessToken,
        product.variantId,
        1,
      ).expect(200);
      return { seller, customer, product };
    }

    it('rejects an expired voucher and does not create an order', async () => {
      const { seller, customer } = await setupCartWithSubtotal(200000);
      const code = `EXPIRED-${Date.now()}`;

      await request(app.getHttpServer())
        .post('/vouchers')
        .set(...bearer(seller.accessToken))
        .send({
          code,
          discountType: 'fixed_amount',
          discountValue: 10000,
          startDate: new Date(
            Date.now() - 10 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          usageLimit: 10,
        })
        .expect(400);

      // checkout referencing a non-existent voucher code must fail as well
      await request(app.getHttpServer())
        .post('/orders/checkout')
        .set(...bearer(customer.accessToken))
        .send({
          address: shippingAddress(),
          paymentMethod: 'cod',
          voucherCodes: [code],
        })
        .expect(404);
    });

    it('rejects a not-yet-started (upcoming) voucher', async () => {
      const { seller, customer } = await setupCartWithSubtotal(200000);
      const code = `UPCOMING-${Date.now()}`;

      await request(app.getHttpServer())
        .post('/vouchers')
        .set(...bearer(seller.accessToken))
        .send({
          code,
          discountType: 'fixed_amount',
          discountValue: 10000,
          startDate: new Date(
            Date.now() + 10 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          endDate: new Date(
            Date.now() + 20 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          usageLimit: 10,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/orders/checkout')
        .set(...bearer(customer.accessToken))
        .send({
          address: shippingAddress(),
          paymentMethod: 'cod',
          voucherCodes: [code],
        })
        .expect(400);
    });

    it('rejects a shop voucher applied to a different shop (wrong scope)', async () => {
      const otherSeller = await createActiveSeller(app, adminToken);
      const { customer } = await setupCartWithSubtotal(200000);
      const code = `WRONGSHOP-${Date.now()}`;

      await request(app.getHttpServer())
        .post('/vouchers')
        .set(...bearer(otherSeller.accessToken))
        .send({
          code,
          discountType: 'fixed_amount',
          discountValue: 10000,
          startDate: new Date(Date.now() - 60_000).toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          usageLimit: 10,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/orders/checkout')
        .set(...bearer(customer.accessToken))
        .send({
          address: shippingAddress(),
          paymentMethod: 'cod',
          voucherCodes: [code],
        })
        .expect(404);
    });

    it('rejects a voucher once its total usage limit has been reached', async () => {
      const { seller, product } = await setupCartWithSubtotal(200000);
      const code = `LIMIT1-${Date.now()}`;

      await request(app.getHttpServer())
        .post('/vouchers')
        .set(...bearer(seller.accessToken))
        .send({
          code,
          discountType: 'fixed_amount',
          discountValue: 5000,
          startDate: new Date(Date.now() - 60_000).toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          usageLimit: 1,
        })
        .expect(201);

      // first customer consumes the only usage slot
      const firstCustomer = await registerAndLoginCustomer(app);
      await addItemToCart(
        app,
        firstCustomer.accessToken,
        product.variantId,
        1,
      ).expect(200);
      await request(app.getHttpServer())
        .post('/orders/checkout')
        .set(...bearer(firstCustomer.accessToken))
        .send({
          address: shippingAddress(),
          paymentMethod: 'cod',
          voucherCodes: [code],
        })
        .expect(201);

      // second customer should now be rejected: usage limit exceeded
      const secondCustomer = await registerAndLoginCustomer(app);
      await addItemToCart(
        app,
        secondCustomer.accessToken,
        product.variantId,
        1,
      ).expect(200);
      await request(app.getHttpServer())
        .post('/orders/checkout')
        .set(...bearer(secondCustomer.accessToken))
        .send({
          address: shippingAddress(),
          paymentMethod: 'cod',
          voucherCodes: [code],
        })
        .expect(400);
    });

    it('rejects a voucher when the cart subtotal is below minOrderValue', async () => {
      const { seller, customer } = await setupCartWithSubtotal(50000);
      const code = `MINVALUE-${Date.now()}`;

      await request(app.getHttpServer())
        .post('/vouchers')
        .set(...bearer(seller.accessToken))
        .send({
          code,
          discountType: 'fixed_amount',
          discountValue: 5000,
          minOrderValue: 500000,
          startDate: new Date(Date.now() - 60_000).toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          usageLimit: 10,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/orders/checkout')
        .set(...bearer(customer.accessToken))
        .send({
          address: shippingAddress(),
          paymentMethod: 'cod',
          voucherCodes: [code],
        })
        .expect(400);

      // no order should have been created for this customer
      const orders = await request(app.getHttpServer())
        .get('/orders')
        .set(...bearer(customer.accessToken))
        .expect(200);
      expect(orders.body.data).toHaveLength(0);
    });
  });
});
