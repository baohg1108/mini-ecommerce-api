import { z } from 'zod';

export const envSchema = z.object({
  // Environment variables validation schema
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  APP_PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  APP_HOST: z.string().trim().default('localhost'),

  // Database configuration
  DB_HOST: z.string().trim().default('localhost'),
  DB_PORT: z.coerce.number().int().min(0).max(65535).default(5432),
  DB_USER: z.string().trim().default('postgres'),
  DB_PASSWORD: z.string().trim().min(8).max(255),
  DB_NAME: z.string().trim().min(2).max(255),

  // Redis configuration
  REDIS_HOST: z.string().trim().default('localhost'),
  REDIS_PORT: z.coerce.number().int().min(0).max(65535).default(6379),
  REDIS_PASSWORD: z.string().trim().min(8).max(255),

  // Logging configuration
  LOG_LEVELS: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Jwt configuration
  JWT_SECRET: z.string().trim().min(32).max(255),
  JWT_EXPIRES_IN: z.string().trim().min(1).max(255).default('1h'),

  // Cloudinary configuration
  CLOUDINARY_NAME: z.string().trim().min(1),
  CLOUDINARY_API_KEY: z.string().trim().min(1),
  CLOUDINARY_API_SECRET: z.string().trim().min(1),
  JWT_ACCESS_TOKEN_SECRET: z.string().trim().min(32).max(255),
  JWT_REFRESH_TOKEN_SECRET: z.string().trim().min(32).max(255),
  JWT_ACCESS_TOKEN_EXPIRATION_TIME: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .default('1h'),
  JWT_REFRESH_TOKEN_EXPIRATION_TIME: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .default('7d'),

  // VNPay configuration
  VNPAY_TMN_CODE: z.string().trim().min(1),
  VNPAY_HASH_SECRET: z.string().trim().min(1),
  VNPAY_PAYMENT_URL: z.string().trim().url(),
  VNPAY_RETURN_URL: z.string().trim().url(),
  // FR-46 - VNPay Refund API (sandbox)
  VNPAY_API_URL: z
    .string()
    .trim()
    .url()
    .default('https://sandbox.vnpayment.vn/merchant_webapi/api/transaction'),
  VNPAY_CREATE_BY: z.string().trim().min(1).default('system'),
  VNPAY_REFUND_TIMEOUT_MS: z.coerce.number().int().min(1000).default(15000),

  // Momo configuration
  // https://developers.momo.vn/v3/docs/payment/api/wallet/onetime
  MOMO_PARTNER_CODE: z.string().trim().min(1),
  MOMO_ACCESS_KEY: z.string().trim().min(1),
  MOMO_SECRET_KEY: z.string().trim().min(1),
  MOMO_API_ENDPOINT: z
    .string()
    .trim()
    .url()
    .default('https://test-payment.momo.vn/v2/gateway/api/create'),
  // FR-46 - Momo Refund API (sandbox)
  // https://developers.momo.vn/v3/docs/payment/api/wallet/refund
  MOMO_REFUND_ENDPOINT: z
    .string()
    .trim()
    .url()
    .default('https://test-payment.momo.vn/v2/gateway/api/refund'),
  MOMO_REDIRECT_URL: z.string().trim().url(),
  MOMO_IPN_URL: z.string().trim().url(),
  MOMO_REQUEST_TYPE: z.string().trim().min(1).default('captureWallet'),
  MOMO_PARTNER_NAME: z.string().trim().min(1).default('Mini Ecommerce'),
  MOMO_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000),
});

export type EnvSchema = z.infer<typeof envSchema>;

export const validateEnv = (env: Record<string, unknown>): EnvSchema => {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format());
    process.exit(1);
  }
  return result.data;
};
