import { Module } from '@nestjs/common';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shop } from './entities/shop.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { ProductModule } from '../products/product.module';

@Module({
  imports: [TypeOrmModule.forFeature([Shop, User]), UsersModule, ProductModule],
  controllers: [ShopController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
