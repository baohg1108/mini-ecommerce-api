import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';

@Injectable()
export class AdminSeedService {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seed(): Promise<void> {
    const admins = [
      {
        email: 'admin1@example.com',
        fullName: 'Admin 1',
        password: 'Admin@123',
      },
      {
        email: 'admin2@example.com',
        fullName: 'Admin 2',
        password: 'Admin@123',
      },
      {
        email: 'admin3@example.com',
        fullName: 'Admin 3',
        password: 'Admin@123',
      },
    ];

    for (const admin of admins) {
      const exists = await this.userRepository.exists({
        where: { email: admin.email },
      });

      if (exists) {
        this.logger.log(`Admin already exists: ${admin.email}`);
        continue;
      }

      const passwordHash = await bcrypt.hash(admin.password, 12);

      await this.userRepository.save(
        this.userRepository.create({
          email: admin.email,
          passwordHash,
          fullName: admin.fullName,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        }),
      );

      this.logger.log(`Seeded admin: ${admin.email}`);
    }
  }
}
