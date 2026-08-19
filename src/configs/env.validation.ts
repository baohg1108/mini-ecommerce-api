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
