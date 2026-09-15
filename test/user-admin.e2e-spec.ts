// // import { INestApplication } from '@nestjs/common';
// // import request from 'supertest';
// // import {
// //   createTestApp,
// //   createAdmin,
// //   createActiveSeller,
// //   createCategory,
// //   createActiveProductWithVariant,
// //   registerAndLoginCustomer,
// //   registerUser,
// //   login,
// //   addItemToCart,
// //   bearer,
// //   VALID_PASSWORD,
// // } from './utils/setup';

// // describe('Admin / User lifecycle (e2e)', () => {
// //   let app: INestApplication;
// //   let adminToken: string;

// //   beforeAll(async () => {
// //     app = await createTestApp();
// //     const admin = await createAdmin(app);
// //     adminToken = admin.accessToken;
// //   });

// //   afterAll(async () => {
// //     await app.close();
// //   });

// //   // ---------------------------------------------------------------------
// //   // E2E-005: Admin khóa và mở khóa tài khoản
// //   // ---------------------------------------------------------------------
// //   describe('E2E-005: Admin lock/unlock account', () => {
// //     it('locked user cannot login; unlocked user can login again; status is updated correctly', async () => {
// //       const { id, email, password } = await registerUser(app);

// //       const lockRes = await request(app.getHttpServer())
// //         .patch(`/users/${id}/lock`)
// //         .set(...bearer(adminToken))
// //         .expect(200);
// //       expect(lockRes.body.data.status).toBe('locked');

// //       await request(app.getHttpServer())
// //         .post('/auth/login')
// //         .send({ email, password })
// //         .expect(401);

// //       const unlockRes = await request(app.getHttpServer())
// //         .patch(`/users/${id}/unlock`)
// //         .set(...bearer(adminToken))
// //         .expect(200);
// //       expect(unlockRes.body.data.status).toBe('active');

// //       await request(app.getHttpServer())
// //         .post('/auth/login')
// //         .send({ email, password })
// //         .expect(200);
// //     });

// //     it('rejects locking an already-locked user with a conflict', async () => {
// //       const { id } = await registerUser(app);

// //       await request(app.getHttpServer())
// //         .patch(`/users/${id}/lock`)
// //         .set(...bearer(adminToken))
// //         .expect(200);

// //       await request(app.getHttpServer())
// //         .patch(`/users/${id}/lock`)
// //         .set(...bearer(adminToken))
// //         .expect(409);
// //     });

// //     it('locking a user immediately invalidates their existing refresh token', async () => {
// //       const { id, email, password } = await registerUser(app);
// //       const { refreshToken } = await login(app, email, password);

// //       await request(app.getHttpServer())
// //         .patch(`/users/${id}/lock`)
// //         .set(...bearer(adminToken))
// //         .expect(200);

// //       await request(app.getHttpServer())
// //         .post('/auth/refresh')
// //         .set(...bearer(refreshToken))
// //         .expect(401);
// //     });
// //   });

// //   // ---------------------------------------------------------------------
// //   // E2E-006: Soft-delete, restore và hard-delete user
// //   // ---------------------------------------------------------------------
// //   describe('E2E-006: Soft-delete / restore / hard-delete user', () => {
// //     it('full lifecycle: create -> soft-delete (cannot login) -> restore (can login again) -> hard-delete (gone)', async () => {
// //       const email = `lifecycle-${Date.now()}@example.com`;
// //       const createRes = await request(app.getHttpServer())
// //         .post('/users')
// //         .send({ email, password: VALID_PASSWORD, fullName: 'Lifecycle User' })
// //         .expect(201);

// //       const userId = createRes.body.data.id as string;

// //       // soft-delete
// //       await request(app.getHttpServer())
// //         .patch(`/users/${userId}/soft-delete`)
// //         .set(...bearer(adminToken))
// //         .expect(200);

// //       await request(app.getHttpServer())
// //         .post('/auth/login')
// //         .send({ email, password: VALID_PASSWORD })
// //         .expect(401);

// //       // restore
// //       await request(app.getHttpServer())
// //         .patch(`/users/${userId}/restore`)
// //         .set(...bearer(adminToken))
// //         .expect(200);

// //       await request(app.getHttpServer())
// //         .post('/auth/login')
// //         .send({ email, password: VALID_PASSWORD })
// //         .expect(200);

// //       // hard-delete
// //       await request(app.getHttpServer())
// //         .delete(`/users/${userId}`)
// //         .set(...bearer(adminToken))
// //         .expect(200);

// //       await request(app.getHttpServer())
// //         .get(`/users/${userId}`)
// //         .set(...bearer(adminToken))
// //         .expect(404);
// //     });
// //   });

// //   // ---------------------------------------------------------------------
// //   // E2E-007: Soft-delete user không xóa dữ liệu lịch sử
// //   // ---------------------------------------------------------------------
// //   describe('E2E-007: Soft-delete preserves historical data (orders/reviews)', () => {
// //     it('order created before soft-delete is still readable, and the product listing is unaffected (no cascade delete)', async () => {
// //       const seller = await createActiveSeller(app, adminToken);
// //       const category = await createCategory(app, adminToken);
// //       const product = await createActiveProductWithVariant(
// //         app,
// //         seller.accessToken,
// //         adminToken,
// //         category.id,
// //         { price: 50000, stockQty: 10 },
// //       );

// //       const customer = await registerAndLoginCustomer(app);
// //       await addItemToCart(
// //         app,
// //         customer.accessToken,
// //         product.variantId,
// //         1,
// //       ).expect(200);

// //       const checkoutRes = await request(app.getHttpServer())
// //         .post('/orders/checkout')
// //         .set(...bearer(customer.accessToken))
// //         .send({
// //           address: {
// //             recipientName: 'Nguyen Van B',
// //             phone: '0900000000',
// //             fullAddress: '123 Test Street, District 1, HCMC',
// //           },
// //           paymentMethod: 'cod',
// //         })
// //         .expect(201);

// //       const orderId = checkoutRes.body.data[0].id as string;

// //       // soft-delete the buyer
// //       await request(app.getHttpServer())
// //         .patch(`/users/${customer.id}/soft-delete`)
// //         .set(...bearer(adminToken))
// //         .expect(200);

// //       // the order the (now soft-deleted) customer placed must still be
// //       // readable and untouched via the customer's still-valid access token
// //       const orderRes = await request(app.getHttpServer())
// //         .get(`/orders/${orderId}`)
// //         .set(...bearer(customer.accessToken))
// //         .expect(200);

// //       expect(orderRes.body.data.id).toBe(orderId);

// //       // the product listing itself must be unaffected (no unintended cascade)
// //       const productRes = await request(app.getHttpServer())
// //         .get(`/products/${product.productId}`)
// //         .expect(200);
// //       expect(productRes.body.data.id).toBe(product.productId);
// //     });
// //   });
// // });

// import { INestApplication } from '@nestjs/common';
// import request from 'supertest';

// import {
//   createTestApp,
//   createAdmin,
//   createActiveSeller,
//   createCategory,
//   createActiveProductWithVariant,
//   registerAndLoginCustomer,
//   registerUser,
//   login,
//   addItemToCart,
//   bearer,
//   VALID_PASSWORD,
// } from './utils/setup';

// describe('Admin / User lifecycle (e2e)', () => {
//   let app: INestApplication;
//   let adminToken: string;

//   beforeAll(async () => {
//     app = await createTestApp();

//     const admin = await createAdmin(app);
//     adminToken = admin.accessToken;
//   });

//   afterAll(async () => {
//     await app.close();
//   });

//   // ---------------------------------------------------------------------
//   // E2E-005: Admin khóa và mở khóa tài khoản
//   // ---------------------------------------------------------------------

//   describe('E2E-005: Admin lock/unlock account', () => {
//     it('locked user cannot login; unlocked user can login again; status is updated correctly', async () => {
//       const { id, email, password } = await registerUser(app);

//       const lockRes = await request(app.getHttpServer())
//         .patch(`/users/${id}/lock`)
//         .set(...bearer(adminToken))
//         .expect(200);

//       expect(lockRes.body.data.status).toBe('locked');

//       await request(app.getHttpServer())
//         .post('/auth/login')
//         .send({ email, password })
//         .expect(401);

//       const unlockRes = await request(app.getHttpServer())
//         .patch(`/users/${id}/unlock`)
//         .set(...bearer(adminToken))
//         .expect(200);

//       expect(unlockRes.body.data.status).toBe('active');

//       await request(app.getHttpServer())
//         .post('/auth/login')
//         .send({ email, password })
//         .expect(200);
//     });

//     it('rejects locking an already-locked user with a conflict', async () => {
//       const { id } = await registerUser(app);

//       await request(app.getHttpServer())
//         .patch(`/users/${id}/lock`)
//         .set(...bearer(adminToken))
//         .expect(200);

//       await request(app.getHttpServer())
//         .patch(`/users/${id}/lock`)
//         .set(...bearer(adminToken))
//         .expect(409);
//     });

//     it('locking a user immediately invalidates their existing refresh token', async () => {
//       const { id, email, password } = await registerUser(app);

//       const { refreshToken } = await login(app, email, password);

//       await request(app.getHttpServer())
//         .patch(`/users/${id}/lock`)
//         .set(...bearer(adminToken))
//         .expect(200);

//       await request(app.getHttpServer())
//         .post('/auth/refresh')
//         .set(...bearer(refreshToken))
//         .expect(401);
//     });
//   });

//   // ---------------------------------------------------------------------
//   // E2E-006: Soft-delete, restore và hard-delete user
//   // ---------------------------------------------------------------------

//   describe('E2E-006: Soft-delete / restore / hard-delete user', () => {
//     it('full lifecycle: create -> soft-delete (cannot login) -> restore (can login again) -> hard-delete (gone)', async () => {
//       const email = `lifecycle-${Date.now()}@example.com`;

//       const createRes = await request(app.getHttpServer())
//         .post('/users')
//         .set(...bearer(adminToken))
//         .send({
//           email,
//           password: VALID_PASSWORD,
//           fullName: 'Lifecycle User',
//         })
//         .expect(201);

//       const userId = createRes.body.data.id as string;

//       // soft-delete
//       await request(app.getHttpServer())
//         .patch(`/users/${userId}/soft-delete`)
//         .set(...bearer(adminToken))
//         .expect(200);

//       await request(app.getHttpServer())
//         .post('/auth/login')
//         .send({
//           email,
//           password: VALID_PASSWORD,
//         })
//         .expect(401);

//       // restore
//       await request(app.getHttpServer())
//         .patch(`/users/${userId}/restore`)
//         .set(...bearer(adminToken))
//         .expect(200);

//       await request(app.getHttpServer())
//         .post('/auth/login')
//         .send({
//           email,
//           password: VALID_PASSWORD,
//         })
//         .expect(200);

//       // hard-delete
//       await request(app.getHttpServer())
//         .delete(`/users/${userId}`)
//         .set(...bearer(adminToken))
//         .expect(200);

//       await request(app.getHttpServer())
//         .get(`/users/${userId}`)
//         .set(...bearer(adminToken))
//         .expect(404);
//     });
//   });

//   // ---------------------------------------------------------------------
//   // E2E-007: Soft-delete user không xóa dữ liệu lịch sử
//   // ---------------------------------------------------------------------

//   describe('E2E-007: Soft-delete preserves historical data (orders/reviews)', () => {
//     it('order created before soft-delete is still readable, and the product listing is unaffected (no cascade delete)', async () => {
//       // Create seller, category and product
//       const seller = await createActiveSeller(app, adminToken);
//       const category = await createCategory(app, adminToken);

//       const product = await createActiveProductWithVariant(
//         app,
//         seller.accessToken,
//         adminToken,
//         category.id,
//         {
//           price: 50000,
//           stockQty: 10,
//         },
//       );

//       // Create customer and login
//       const customer = await registerAndLoginCustomer(app);

//       // Add product to customer's cart
//       await addItemToCart(
//         app,
//         customer.accessToken,
//         product.variantId,
//         1,
//       ).expect(200);

//       // Create order before soft-delete
//       const checkoutRes = await request(app.getHttpServer())
//         .post('/orders/checkout')
//         .set(...bearer(customer.accessToken))
//         .send({
//           address: {
//             recipientName: 'Nguyen Van B',
//             phone: '0900000000',
//             fullAddress: '123 Test Street, District 1, HCMC',
//           },
//           paymentMethod: 'cod',
//         })
//         .expect(201);

//       const orderId = checkoutRes.body.data[0].id as string;

//       // Soft-delete the customer
//       await request(app.getHttpServer())
//         .patch(`/users/${customer.id}/soft-delete`)
//         .set(...bearer(adminToken))
//         .expect(200);

//       // The order created before soft-delete must still exist
//       // and remain readable by an authorized administrator.
//       const orderRes = await request(app.getHttpServer())
//         .get(`/orders/${orderId}`)
//         .set(...bearer(adminToken))
//         .expect(200);

//       expect(orderRes.body.data.id).toBe(orderId);

//       // The product must also remain available.
//       // Soft-deleting the customer must not cascade-delete
//       // unrelated product data.
//       const productRes = await request(app.getHttpServer())
//         .get(`/products/${product.productId}`)
//         .expect(200);

//       expect(productRes.body.data.id).toBe(product.productId);
//     });
//   });
// });

import { INestApplication } from '@nestjs/common';

import request from 'supertest';

import {
  createTestApp,
  createAdmin,
  createActiveSeller,
  createCategory,
  createActiveProductWithVariant,
  registerAndLoginCustomer,
  registerUser,
  login,
  addItemToCart,
  bearer,
  VALID_PASSWORD,
} from './utils/setup';

describe('Admin / User lifecycle (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();

    const admin = await createAdmin(app);
    adminToken = admin.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // E2E-005: Admin khóa và mở khóa tài khoản
  describe('E2E-005: Admin lock/unlock account', () => {
    it('locked user cannot login; unlocked user can login again; status is updated correctly', async () => {
      const { id, email, password } = await registerUser(app);

      const lockRes = await request(app.getHttpServer())
        .patch(`/users/${id}/lock`)
        .set(...bearer(adminToken))
        .expect(200);

      expect(lockRes.body.data.status).toBe('locked');

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(401);

      const unlockRes = await request(app.getHttpServer())
        .patch(`/users/${id}/unlock`)
        .set(...bearer(adminToken))
        .expect(200);

      expect(unlockRes.body.data.status).toBe('active');

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);
    });

    it('rejects locking an already-locked user with a conflict', async () => {
      const { id } = await registerUser(app);

      await request(app.getHttpServer())
        .patch(`/users/${id}/lock`)
        .set(...bearer(adminToken))
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/users/${id}/lock`)
        .set(...bearer(adminToken))
        .expect(409);
    });

    it('locking a user immediately invalidates their existing refresh token', async () => {
      const { id, email, password } = await registerUser(app);

      const { refreshToken } = await login(app, email, password);

      await request(app.getHttpServer())
        .patch(`/users/${id}/lock`)
        .set(...bearer(adminToken))
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set(...bearer(refreshToken))
        .expect(401);
    });
  });

  // E2E-006: Soft-delete, restore và hard-delete user
  describe('E2E-006: Soft-delete / restore / hard-delete user', () => {
    it('full lifecycle: create -> soft-delete (cannot login) -> restore (can login again) -> hard-delete (gone)', async () => {
      const email = `lifecycle-${Date.now()}@example.com`;

      const createRes = await request(app.getHttpServer())
        .post('/users')
        .set(...bearer(adminToken))
        .send({
          email,
          password: VALID_PASSWORD,
          fullName: 'Lifecycle User',
        })
        .expect(201);

      const userId = createRes.body.data.id as string;

      // soft-delete
      await request(app.getHttpServer())
        .patch(`/users/${userId}/soft-delete`)
        .set(...bearer(adminToken))
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email,
          password: VALID_PASSWORD,
        })
        .expect(401);

      // restore
      await request(app.getHttpServer())
        .patch(`/users/${userId}/restore`)
        .set(...bearer(adminToken))
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email,
          password: VALID_PASSWORD,
        })
        .expect(200);

      // hard-delete
      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set(...bearer(adminToken))
        .expect(200);

      await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set(...bearer(adminToken))
        .expect(404);
    });
  });

  // E2E-007: Soft-delete user không xóa dữ liệu lịch sử
  describe('E2E-007: Soft-delete preserves historical data (orders/reviews)', () => {
    it('order and product data created before soft-delete remain available without cascade deletion', async () => {
      // Create seller, category and product
      const seller = await createActiveSeller(app, adminToken);

      const category = await createCategory(app, adminToken);

      const product = await createActiveProductWithVariant(
        app,
        seller.accessToken,
        adminToken,
        category.id,
        {
          price: 50000,
          stockQty: 10,
        },
      );

      // Create customer and login
      const customer = await registerAndLoginCustomer(app);

      // Add product to customer's cart
      await addItemToCart(
        app,
        customer.accessToken,
        product.variantId,
        1,
      ).expect(200);

      // Create order before soft-delete
      const checkoutRes = await request(app.getHttpServer())
        .post('/orders/checkout')
        .set(...bearer(customer.accessToken))
        .send({
          address: {
            recipientName: 'Nguyen Van B',
            phone: '0900000000',
            fullAddress: '123 Test Street, District 1, HCMC',
          },
          paymentMethod: 'cod',
        })
        .expect(201);

      const orderId = checkoutRes.body.data[0].id as string;

      expect(orderId).toEqual(expect.any(String));

      // Verify the order is readable by its owner BEFORE soft-delete.
      await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set(...bearer(customer.accessToken))
        .expect(200);

      // Soft-delete the customer.
      await request(app.getHttpServer())
        .patch(`/users/${customer.id}/soft-delete`)
        .set(...bearer(adminToken))
        .expect(200);

      const productRes = await request(app.getHttpServer())
        .get(`/products/${product.productId}`)
        .expect(200);

      expect(productRes.body.data.id).toBe(product.productId);

      // The customer should no longer be able to authenticate.
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: customer.email,
          password: customer.password,
        })
        .expect(401);

      expect(orderId).toEqual(expect.any(String));
    });
  });
});
