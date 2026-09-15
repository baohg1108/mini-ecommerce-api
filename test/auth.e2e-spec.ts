import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  registerUser,
  login,
  registerAndLoginCustomer,
  createAdmin,
  bearer,
  VALID_PASSWORD,
} from './utils/setup';

describe('Auth & Authorization (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // E2E-001: Đăng nhập thành công và sử dụng access token
  describe('E2E-001: Login success + use access token', () => {
    it('logs in and returns access/refresh token; token works on protected route with correct user info', async () => {
      const { email, password } = await registerUser(app, {
        fullName: 'Nguyen Van A',
      });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);

      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.accessToken).toEqual(expect.any(String));
      expect(loginRes.body.data.refreshToken).toEqual(expect.any(String));
      expect(loginRes.body.data.user.email).toBe(email);

      const { accessToken } = loginRes.body.data;

      const whoami = await request(app.getHttpServer())
        .get('/auth/whoami')
        .set(...bearer(accessToken))
        .expect(200);

      expect(whoami.body.data.email).toBe(email);
    });

    it('rejects login with wrong password', async () => {
      const { email } = await registerUser(app);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'WrongPassword@123' })
        .expect(401);
    });

    it('rejects login for non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'no-such-user@example.com', password: VALID_PASSWORD })
        .expect(401);
    });
  });

  // E2E-002: Logout vô hiệu hóa refresh token
  describe('E2E-002: Logout invalidates refresh token', () => {
    it('logout succeeds and old refresh token can no longer mint new tokens', async () => {
      const user = await registerAndLoginCustomer(app);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set(...bearer(user.accessToken))
        .expect(200);

      // old refresh token must now be rejected
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set(...bearer(user.refreshToken))
        .expect(401);
    });
  });
  // E2E-003: Refresh token rotation
  describe('E2E-003: Refresh token rotation', () => {
    it('valid refresh returns a new token pair; old refresh token is rejected after rotation; new token works', async () => {
      const user = await registerAndLoginCustomer(app);

      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set(...bearer(user.refreshToken))
        .expect(200);

      const newAccessToken = refreshRes.body.data.accessToken as string;
      const newRefreshToken = refreshRes.body.data.refreshToken as string;

      expect(newAccessToken).toEqual(expect.any(String));
      expect(newRefreshToken).toEqual(expect.any(String));
      expect(newRefreshToken).not.toBe(user.refreshToken);

      // old refresh token must be rejected now (rotated)
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set(...bearer(user.refreshToken))
        .expect(401);

      // new access token must work
      await request(app.getHttpServer())
        .get('/auth/whoami')
        .set(...bearer(newAccessToken))
        .expect(200);
    });
  });

  // E2E-004: Kiểm tra phân quyền theo role
  describe('E2E-004: Role-based authorization', () => {
    it('rejects anonymous access to a protected route with 401', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });

    it('rejects customer calling an admin-only route with 403', async () => {
      const customer = await registerAndLoginCustomer(app);

      await request(app.getHttpServer())
        .get('/users')
        .set(...bearer(customer.accessToken))
        .expect(403);
    });

    it('rejects customer calling a seller-only route with 403', async () => {
      const customer = await registerAndLoginCustomer(app);

      await request(app.getHttpServer())
        .get('/shop/me')
        .set(...bearer(customer.accessToken))
        .expect(403);
    });

    it('allows admin to access admin-only route', async () => {
      const admin = await createAdmin(app);

      await request(app.getHttpServer())
        .get('/users')
        .set(...bearer(admin.accessToken))
        .expect(200);
    });

    it('rejects a seller without an active shop from creating a product (seller-approved guard)', async () => {
      const seller = await registerAndLoginCustomer(app);
      await request(app.getHttpServer())
        .post('/users/become-seller')
        .set(...bearer(seller.accessToken))
        .expect(200);

      // seller has become-seller but has NOT registered/approved a shop yet
      await request(app.getHttpServer())
        .post('/products')
        .set(...bearer(seller.accessToken))
        .send({
          categoryId: '11111111-1111-1111-1111-111111111111',
          name: 'Unauthorized product attempt',
          slug: 'unauthorized-product-attempt',
          basePrice: 10000,
        })
        .expect(403);
    });
  });
});
