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

describe('Cart & Voucher (e2e)', () => {
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
  // E2E-011: Thêm, cập nhật, xóa item và kiểm tra tồn kho
  describe('E2E-011: Add / update / remove cart items with stock checks', () => {
    it('valid quantities update correctly; exceeding stock is rejected; removing recalculates the cart', async () => {
      const seller = await createActiveSeller(app, adminToken);
      const product = await createActiveProductWithVariant(
        app,
        seller.accessToken,
        adminToken,
        categoryId,
        { price: 20000, stockQty: 5 },
      );
      const customer = await registerAndLoginCustomer(app);

      // add valid quantity
      const addRes = await addItemToCart(
        app,
        customer.accessToken,
        product.variantId,
        3,
      ).expect(200);
      const item = (
        addRes.body.data.items as Array<{ id: string; quantity: number }>
      )[0];
      expect(item.quantity).toBe(3);

      // adding more than remaining stock (5 total, 3 already in cart -> +3 = 6 > 5) is rejected
      await addItemToCart(
        app,
        customer.accessToken,
        product.variantId,
        3,
      ).expect(400);

      // update to a valid quantity within stock
      const updateRes = await request(app.getHttpServer())
        .patch(`/cart/items/${item.id}`)
        .set(...bearer(customer.accessToken))
        .send({ quantity: 5 })
        .expect(200);
      expect(
        (updateRes.body.data.items as Array<{ quantity: number }>)[0].quantity,
      ).toBe(5);

      // update beyond stock is rejected
      await request(app.getHttpServer())
        .patch(`/cart/items/${item.id}`)
        .set(...bearer(customer.accessToken))
        .send({ quantity: 6 })
        .expect(400);

      // remove item -> cart becomes empty
      const removeRes = await request(app.getHttpServer())
        .delete(`/cart/items/${item.id}`)
        .set(...bearer(customer.accessToken))
        .expect(200);
      expect(removeRes.body.data.items).toHaveLength(0);
    });

    it('another customer cannot modify a cart item that is not theirs', async () => {
      const seller = await createActiveSeller(app, adminToken);
      const product = await createActiveProductWithVariant(
        app,
        seller.accessToken,
        adminToken,
        categoryId,
        { price: 20000, stockQty: 5 },
      );
      const owner = await registerAndLoginCustomer(app);
      const intruder = await registerAndLoginCustomer(app);

      const addRes = await addItemToCart(
        app,
        owner.accessToken,
        product.variantId,
        1,
      ).expect(200);
      const itemId = addRes.body.data.items[0].id as string;

      await request(app.getHttpServer())
        .patch(`/cart/items/${itemId}`)
        .set(...bearer(intruder.accessToken))
        .send({ quantity: 2 })
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/cart/items/${itemId}`)
        .set(...bearer(intruder.accessToken))
        .expect(403);
    });
  });

  // E2E-012: Voucher không còn hợp lệ sau khi subtotal giảm
  describe('E2E-012: Voucher becomes invalid after subtotal drops below minOrderValue', () => {
    it('reducing quantity below minOrderValue removes the voucher from available list and blocks checkout with that code', async () => {
      const seller = await createActiveSeller(app, adminToken);
      const product = await createActiveProductWithVariant(
        app,
        seller.accessToken,
        adminToken,
        categoryId,
        { price: 100000, stockQty: 10 },
      );
      const customer = await registerAndLoginCustomer(app);

      // shop voucher requiring a min order value of 250,000
      const voucherCode = `MIN250K-${Date.now()}`;
      await request(app.getHttpServer())
        .post('/vouchers')
        .set(...bearer(seller.accessToken))
        .send({
          code: voucherCode,
          discountType: 'fixed_amount',
          discountValue: 20000,
          minOrderValue: 250000,
          startDate: new Date(Date.now() - 60_000).toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          usageLimit: 100,
        })
        .expect(201);

      // add 3 x 100,000 = 300,000 subtotal -> voucher qualifies
      const addRes = await addItemToCart(
        app,
        customer.accessToken,
        product.variantId,
        3,
      ).expect(200);
      const itemId = addRes.body.data.items[0].id as string;

      const availableBefore = await request(app.getHttpServer())
        .get('/cart/available-vouchers')
        .set(...bearer(customer.accessToken))
        .expect(200);
      expect(
        (availableBefore.body.data as Array<{ code: string }>).some(
          (v) => v.code === voucherCode,
        ),
      ).toBe(true);

      // reduce quantity to 1 x 100,000 = 100,000 subtotal -> below minOrderValue
      await request(app.getHttpServer())
        .patch(`/cart/items/${itemId}`)
        .set(...bearer(customer.accessToken))
        .send({ quantity: 1 })
        .expect(200);

      const availableAfter = await request(app.getHttpServer())
        .get('/cart/available-vouchers')
        .set(...bearer(customer.accessToken))
        .expect(200);
      expect(
        (availableAfter.body.data as Array<{ code: string }>).some(
          (v) => v.code === voucherCode,
        ),
      ).toBe(false);

      await request(app.getHttpServer())
        .post('/orders/checkout')
        .set(...bearer(customer.accessToken))
        .send({
          address: {
            recipientName: 'Nguyen Van C',
            phone: '0911111111',
            fullAddress: '456 Test Street, District 3, HCMC',
          },
          paymentMethod: 'cod',
          voucherCodes: [voucherCode],
        })
        .expect(400);

      const myOrders = await request(app.getHttpServer())
        .get('/orders')
        .set(...bearer(customer.accessToken))
        .expect(200);
      expect(
        (myOrders.body.data as Array<{ voucherCode?: string }>).some(
          (o) => o.voucherCode === voucherCode,
        ),
      ).toBe(false);
    });
  });
});
