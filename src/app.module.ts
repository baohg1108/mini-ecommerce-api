import { Module } from '@nestjs/common';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { validateEnv } from './configs/env.validation';
import databaseConfig from './configs/database.config';
import { UsersModule } from './modules/users/users.module';
import { RedisCacheModule } from './modules/redis/redis-cache.module';
import { RedisClientModule } from './modules/redis/redis-client.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { ProductImageController } from './modules/products/product-image/product-image.controller';
import { AuthModule } from './modules/auth/auth.module';
import { CategoryModule } from './modules/categogies/category.module';
import { ProductModule } from './modules/products/product.module';
import { ShopModule } from './modules/shops/shop.module';
import { APP_GUARD } from '@nestjs/core';
import { AccessTokenGuard } from './common/guards/access-token.guard';
import { SeedModule } from './databases/seeds/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const dbConfig = configService.get<TypeOrmModuleOptions>('database');
        if (!dbConfig) {
          throw new Error('Database configuration is not defined');
        }
        return dbConfig;
      },
    }),
    UsersModule,
    RedisCacheModule,
    RedisClientModule,
    CloudinaryModule,
    AuthModule,
    CategoryModule,
    ProductModule,
    ShopModule,
    SeedModule,
  ],
  controllers: [ProductImageController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
  ],
})
export class AppModule {}
