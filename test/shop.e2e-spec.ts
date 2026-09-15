import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  createAdmin,
  registerAndLoginCustomer,
  bearer,
} from './utils/setup';

describe('Shop lifecycle (e2e)', () => {
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

  // E2E-008: Shop lifecycle: register, approve, reject, suspend, unsuspend
  describe('E2E-008: register -> approve -> suspend -> unsuspend, and register -> reject', () => {
    it('pending shop is not publicly visible', async () => {
      const seller = await registerAndLoginCustomer(app);
      await request(app.getHttpServer())
        .post('/users/become-seller')
        .set(...bearer(seller.accessToken))
        .expect(200);

      const registerRes = await request(app.getHttpServer())
        .post('/shop/register-shop')
        .set(...bearer(seller.accessToken))
        .send({
          shopName: `Pending Shop ${Date.now()}`,
          description: 'A shop pending admin review for e2e testing.',
        })
        .expect(200);

      const shopId = registerRes.body.data.id as string;
      expect(registerRes.body.data.status).toBe('pending');

      // not visible in public listing nor public detail
      await request(app.getHttpServer())
        .get(`/shop/public/${shopId}`)
        .expect(404);

      const publicList = await request(app.getHttpServer())
        .get('/shop/public')
        .expect(200);
      const found = (publicList.body.data as Array<{ id: string }>).find(
        (s) => s.id === shopId,
      );
      expect(found).toBeUndefined();
    });

    it('approved shop becomes publicly visible; suspended shop is hidden again; unsuspend restores visibility', async () => {
      const seller = await registerAndLoginCustomer(app);
      await request(app.getHttpServer())
        .post('/users/become-seller')
        .set(...bearer(seller.accessToken))
        .expect(200);

      const registerRes = await request(app.getHttpServer())
        .post('/shop/register-shop')
        .set(...bearer(seller.accessToken))
        .send({
          shopName: `Suspend Cycle Shop ${Date.now()}`,
          description: 'A shop used to test suspend/unsuspend for e2e.',
        })
        .expect(200);

      const shopId = registerRes.body.data.id as string;

      // approve -> becomes ACTIVE and publicly visible
      const approveRes = await request(app.getHttpServer())
        .patch(`/shop/${shopId}/approve`)
        .set(...bearer(adminToken))
        .expect(200);
      expect(approveRes.body.data.status).toBe('active');

      await request(app.getHttpServer())
        .get(`/shop/public/${shopId}`)
        .expect(200);

      // suspend -> hidden from public again
      await request(app.getHttpServer())
        .patch(`/shop/${shopId}/suspend`)
        .set(...bearer(adminToken))
        .send({ reasonSuspended: 'Violates marketplace policy for testing' })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/shop/public/${shopId}`)
        .expect(404);

      // cannot suspend again while already suspended
      await request(app.getHttpServer())
        .patch(`/shop/${shopId}/suspend`)
        .set(...bearer(adminToken))
        .send({ reasonSuspended: 'Second suspend attempt for testing' })
        .expect(409);

      // unsuspend -> visible again
      const unsuspendRes = await request(app.getHttpServer())
        .patch(`/shop/${shopId}/unsuspend`)
        .set(...bearer(adminToken))
        .expect(200);
      expect(unsuspendRes.body.data.status).toBe('active');

      await request(app.getHttpServer())
        .get(`/shop/public/${shopId}`)
        .expect(200);
    });

    it('rejected shop is not publicly visible and stores the rejection reason', async () => {
      const seller = await registerAndLoginCustomer(app);
      await request(app.getHttpServer())
        .post('/users/become-seller')
        .set(...bearer(seller.accessToken))
        .expect(200);

      const registerRes = await request(app.getHttpServer())
        .post('/shop/register-shop')
        .set(...bearer(seller.accessToken))
        .send({
          shopName: `Reject Shop ${Date.now()}`,
          description: 'A shop that will be rejected for e2e testing.',
        })
        .expect(200);

      const shopId = registerRes.body.data.id as string;

      const rejectRes = await request(app.getHttpServer())
        .patch(`/shop/${shopId}/reject`)
        .set(...bearer(adminToken))
        .send({ reason: 'Incomplete business license documents' })
        .expect(200);

      expect(rejectRes.body.data.status).toBe('rejected');

      await request(app.getHttpServer())
        .get(`/shop/public/${shopId}`)
        .expect(404);

      await request(app.getHttpServer())
        .patch(`/shop/${shopId}/approve`)
        .set(...bearer(adminToken))
        .expect(409);
    });
  });
});
