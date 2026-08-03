import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../../modules/users/entities/user.entity';
import { AdminSeedService } from './admin.seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [AdminSeedService],
  exports: [AdminSeedService],
})
export class SeedModule {}
