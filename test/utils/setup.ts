import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

import { AppModule } from '../../src/app.module';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../../src/common/filters/all-exception.filter';
import { User } from '../../src/modules/users/entities/user.entity';
import { UserRole } from '../../src/common/enums/user-role.enum';
import { UserStatus } from '../../src/common/enums/user-status.enum';
// import { Category } from '../../src/modules/categogies/entities/category.entity';
// import { CategoryStatus } from '../../src/common/enums/category-status.enum';

export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}

export function getRepo<T>(
  app: INestApplication,
  entity: new () => T,
): Repository<T> {
  return app.get(getRepositoryToken(entity));
}

export function uniqueEmail(prefix = 'user'): string {
  return `${prefix}-${randomUUID()}@example.com`;
}

export const VALID_PASSWORD = 'Password@123';

export interface RegisteredUser {
  id: string;
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export async function registerUser(
  app: INestApplication,
  overrides: Partial<{
    email: string;
    password: string;
    fullName: string;
  }> = {},
): Promise<{ id: string; email: string; password: string }> {
  const email = overrides.email ?? uniqueEmail();
  const password = overrides.password ?? VALID_PASSWORD;
  const fullName = overrides.fullName ?? 'Test User';

  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password, fullName })
    .expect(201);

  return { id: res.body.data.id as string, email, password };
}

export async function login(
  app: INestApplication,
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    accessToken: res.body.data.accessToken as string,
    refreshToken: res.body.data.refreshToken as string,
    userId: res.body.data.user.id as string,
  };
}

export async function registerAndLoginCustomer(
  app: INestApplication,
  overrides: Partial<{
    email: string;
    password: string;
    fullName: string;
  }> = {},
): Promise<RegisteredUser> {
  const { id, email, password } = await registerUser(app, overrides);
  const { accessToken, refreshToken } = await login(app, email, password);
  return { id, email, password, accessToken, refreshToken };
}

export function bearer(token: string): [string, string] {
  return ['Authorization', `Bearer ${token}`];
}

/**
 * Admin accounts cannot be self-registered through the public API, so tests
 * insert one directly through the repository (mirrors AdminSeedService) and
 * then log in through the real /auth/login endpoint.
 */
export async function createAdmin(
  app: INestApplication,
): Promise<RegisteredUser> {
  const userRepo = getRepo(app, User);
  const email = uniqueEmail('admin');
  const password = VALID_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await userRepo.save(
    userRepo.create({
      email,
      passwordHash,
      fullName: 'Admin QA',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    }),
  );

  const { accessToken, refreshToken } = await login(app, email, password);
  return { id: admin.id, email, password, accessToken, refreshToken };
}

// ---------------------------------------------------------------------------
// Shop / Seller helpers
// ---------------------------------------------------------------------------

export interface ActiveSeller extends RegisteredUser {
  shopId: string;
}

/**
 * Registers a fresh customer, promotes to seller, registers + admin-approves
 * a shop so the account is a fully ACTIVE seller ready to list products.
 */
export async function createActiveSeller(
  app: INestApplication,
  adminToken: string,
  overrides: Partial<{
    email: string;
    password: string;
    fullName: string;
    shopName: string;
  }> = {},
): Promise<ActiveSeller> {
  const user = await registerAndLoginCustomer(app, overrides);

  await request(app.getHttpServer())
    .post('/users/become-seller')
    .set(...bearer(user.accessToken))
    .expect(200);

  // must re-login to refresh cached role claims where relevant, though role
  // is read fresh from DB on each request via RolesGuard — no re-login needed.
  const shopName = overrides.shopName ?? `Shop ${randomUUID().slice(0, 8)}`;

  const registerShopRes = await request(app.getHttpServer())
    .post('/shop/register-shop')
    .set(...bearer(user.accessToken))
    .send({
      shopName,
      description: 'A demo shop used for automated e2e testing purposes.',
    })
    .expect(200);

  const shopId = registerShopRes.body.data.id as string;

  await request(app.getHttpServer())
    .patch(`/shop/${shopId}/approve`)
    .set(...bearer(adminToken))
    .expect(200);

  return { ...user, shopId };
}

// ---------------------------------------------------------------------------
// Category / Product / Variant helpers
// ---------------------------------------------------------------------------

export async function createCategory(
  app: INestApplication,
  adminToken: string,
  overrides: Partial<{ name: string; slug: string }> = {},
): Promise<{ id: string }> {
  const suffix = randomUUID().slice(0, 8);
  const res = await request(app.getHttpServer())
    .post('/categories')
    .set(...bearer(adminToken))
    .send({
      name: overrides.name ?? `Category ${suffix}`,
      slug: overrides.slug ?? `category-${suffix}`,
    })
    .expect(201);

  return { id: res.body.data.id as string };
}

export interface ActiveProduct {
  productId: string;
  variantId: string;
  price: number;
}

/**
 * Creates a product as the given seller, attaches one variant with the
 * requested stock, then has the admin approve the product so it becomes
 * publicly ACTIVE / purchasable.
 */
export async function createActiveProductWithVariant(
  app: INestApplication,
  sellerToken: string,
  adminToken: string,
  categoryId: string,
  opts: Partial<{ price: number; stockQty: number; name: string }> = {},
): Promise<ActiveProduct> {
  const suffix = randomUUID().slice(0, 8);
  const price = opts.price ?? 100000;
  const stockQty = opts.stockQty ?? 10;

  const productRes = await request(app.getHttpServer())
    .post('/products')
    .set(...bearer(sellerToken))
    .send({
      categoryId,
      name: opts.name ?? `Product ${suffix}`,
      slug: `product-${suffix}`,
      description: 'A demo product created for automated e2e testing.',
      basePrice: price,
    })
    .expect(201);

  const productId = productRes.body.data.id as string;

  const variantRes = await request(app.getHttpServer())
    .post(`/products/${productId}/variants`)
    .set(...bearer(sellerToken))
    .send({
      sku: `SKU-${suffix}`,
      price,
      stockQty,
    })
    .expect(201);

  const variantId = variantRes.body.data.id as string;

  await request(app.getHttpServer())
    .patch(`/products/admin/${productId}/approve`)
    .set(...bearer(adminToken))
    .expect(200);

  return { productId, variantId, price };
}

// ---------------------------------------------------------------------------
// Cart / Voucher helpers
// ---------------------------------------------------------------------------
export function addItemToCart(
  app: INestApplication,
  customerToken: string,
  variantId: string,
  quantity: number,
) {
  return request(app.getHttpServer())
    .post('/cart/items')
    .set(...bearer(customerToken))
    .send({ variantId, quantity });
}
