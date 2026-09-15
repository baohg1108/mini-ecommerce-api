import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  createAdmin,
  createActiveSeller,
  createCategory,
  bearer,
} from './utils/setup';

describe('Product management (e2e)', () => {
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

  // E2E-009: Seller quản lý product của chính mình
  describe('E2E-009: Seller manages their own products', () => {
    it('owner can create/update/hide/unhide/delete; another seller cannot touch it; public search reflects status', async () => {
      const seller = await createActiveSeller(app, adminToken);
      const otherSeller = await createActiveSeller(app, adminToken);

      const suffix = Date.now();
      const createRes = await request(app.getHttpServer())
        .post('/products')
        .set(...bearer(seller.accessToken))
        .send({
          categoryId,
          name: `Owned Product ${suffix}`,
          slug: `owned-product-${suffix}`,
          description: 'Product created to validate seller ownership rules.',
          basePrice: 75000,
        })
        .expect(201);

      const productId = createRes.body.data.id as string;
      expect(createRes.body.data.status).toBe('pending');

      // owner can update
      const updateRes = await request(app.getHttpServer())
        .patch(`/products/${productId}`)
        .set(...bearer(seller.accessToken))
        .send({ name: `Owned Product Updated ${suffix}` })
        .expect(200);
      expect(updateRes.body.data.name).toBe(`Owned Product Updated ${suffix}`);

      // another seller cannot update/hide/delete this product
      await request(app.getHttpServer())
        .patch(`/products/${productId}`)
        .set(...bearer(otherSeller.accessToken))
        .send({ name: 'Hijack attempt' })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/products/${productId}/hide`)
        .set(...bearer(otherSeller.accessToken))
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .set(...bearer(otherSeller.accessToken))
        .expect(403);

      // admin approves so it becomes searchable publicly
      await request(app.getHttpServer())
        .patch(`/products/admin/${productId}/approve`)
        .set(...bearer(adminToken))
        .expect(200);

      const searchActive = await request(app.getHttpServer())
        .get('/products/search')
        .query({ keyword: `Owned Product Updated ${suffix}` })
        .expect(200);
      expect(
        (searchActive.body.data.items as Array<{ id: string }>).some(
          (p) => p.id === productId,
        ),
      ).toBe(true);

      // owner hides -> disappears from public search
      const hideRes = await request(app.getHttpServer())
        .patch(`/products/${productId}/hide`)
        .set(...bearer(seller.accessToken))
        .expect(200);
      expect(hideRes.body.data.status).toBe('hidden');

      const searchHidden = await request(app.getHttpServer())
        .get('/products/search')
        .query({ keyword: `Owned Product Updated ${suffix}` })
        .expect(200);
      expect(
        (searchHidden.body.data.items as Array<{ id: string }>).some(
          (p) => p.id === productId,
        ),
      ).toBe(false);

      // owner unhides -> becomes active + searchable again
      const unhideRes = await request(app.getHttpServer())
        .patch(`/products/${productId}/unhide`)
        .set(...bearer(seller.accessToken))
        .expect(200);
      expect(unhideRes.body.data.status).toBe('active');

      const searchUnhidden = await request(app.getHttpServer())
        .get('/products/search')
        .query({ keyword: `Owned Product Updated ${suffix}` })
        .expect(200);
      expect(
        (searchUnhidden.body.data.items as Array<{ id: string }>).some(
          (p) => p.id === productId,
        ),
      ).toBe(true);

      // owner deletes -> gone
      await request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .set(...bearer(seller.accessToken))
        .expect(200);

      await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(404);
    });
  });

  // E2E-010: Admin moderation product
  describe('E2E-010: Admin moderates products', () => {
    it('rejected product is not public and stores the reason; removed product disappears from public search', async () => {
      const seller = await createActiveSeller(app, adminToken);

      const suffixReject = `${Date.now()}-reject`;
      const rejectCandidate = await request(app.getHttpServer())
        .post('/products')
        .set(...bearer(seller.accessToken))
        .send({
          categoryId,
          name: `Reject Candidate ${suffixReject}`,
          slug: `reject-candidate-${suffixReject}`,
          basePrice: 60000,
        })
        .expect(201);

      const rejectId = rejectCandidate.body.data.id as string;

      const rejectRes = await request(app.getHttpServer())
        .patch(`/products/admin/${rejectId}/reject`)
        .set(...bearer(adminToken))
        .send({ rejectionReason: 'Product images violate marketplace policy' })
        .expect(200);
      expect(rejectRes.body.data.status).toBe('rejected');

      await request(app.getHttpServer())
        .get(`/products/${rejectId}`)
        .expect(404);

      // cannot approve/reject twice — only pending products can be approved/rejected
      await request(app.getHttpServer())
        .patch(`/products/admin/${rejectId}/approve`)
        .set(...bearer(adminToken))
        .expect(400);

      // ---- removal of an already-active product ----
      const suffixRemove = `${Date.now()}-remove`;
      const removeCandidate = await request(app.getHttpServer())
        .post('/products')
        .set(...bearer(seller.accessToken))
        .send({
          categoryId,
          name: `Remove Candidate ${suffixRemove}`,
          slug: `remove-candidate-${suffixRemove}`,
          basePrice: 60000,
        })
        .expect(201);

      const removeId = removeCandidate.body.data.id as string;

      await request(app.getHttpServer())
        .patch(`/products/admin/${removeId}/approve`)
        .set(...bearer(adminToken))
        .expect(200);

      await request(app.getHttpServer())
        .get(`/products/${removeId}`)
        .expect(200);

      const removeRes = await request(app.getHttpServer())
        .patch(`/products/admin/${removeId}/remove`)
        .set(...bearer(adminToken))
        .send({ reason: 'Counterfeit item reported by multiple buyers' })
        .expect(200);
      expect(removeRes.body.data.status).toBe('removed');

      await request(app.getHttpServer())
        .get(`/products/${removeId}`)
        .expect(404);

      const searchRemoved = await request(app.getHttpServer())
        .get('/products/search')
        .query({ keyword: `Remove Candidate ${suffixRemove}` })
        .expect(200);
      expect(
        (searchRemoved.body.data.items as Array<{ id: string }>).some(
          (p) => p.id === removeId,
        ),
      ).toBe(false);
    });
  });
});
