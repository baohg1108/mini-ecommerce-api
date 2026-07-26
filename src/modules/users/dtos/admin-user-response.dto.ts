import { Expose } from 'class-transformer';
import { UserResponseDto } from './user-response.dto';

export class AdminUserResponseDto extends UserResponseDto {
  @Expose()
  lastLoginAt!: Date | null;

  @Expose()
  updatedAt?: Date | null;

  @Expose()
  deletedAt?: Date | null;
}
