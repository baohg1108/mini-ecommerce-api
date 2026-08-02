import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('REDIS_HOST', 'localhost');
        const port = config.get<number>('REDIS_PORT', 6379);
        const password = config.get<string>('REDIS_PASSWORD');

        const redisUrl = password
          ? `redis://:${password}@${host}:${port}`
          : `redis://${host}:${port}`;

        return {
          stores: [new Keyv({ store: new KeyvRedis(redisUrl) })],
          ttl: 60 * 5 * 1000,
        };
      },
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
