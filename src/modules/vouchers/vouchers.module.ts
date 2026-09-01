import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';
import { VoucherValidationService } from './voucher-validation.service';
import { Voucher } from './entities/voucher.entity';
import { VoucherUsage } from './entities/voucher-usage.entity';
import { Shop } from '../shops/entities/shop.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Voucher, VoucherUsage, Shop]),
    UsersModule,
  ],
  controllers: [VouchersController],
  providers: [VouchersService, VoucherValidationService],
  exports: [VouchersService, VoucherValidationService],
})
export class VouchersModule {}
