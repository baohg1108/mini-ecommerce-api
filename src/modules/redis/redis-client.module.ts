import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url:
          config.get<string>('REDIS_URL') ||
          `redis://${config.get('REDIS_HOST', 'localhost')}:${config.get('REDIS_PORT', 6379)}`,
        options: {
          password: config.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
  ],
  exports: [RedisModule],
})
export class RedisClientModule {}
