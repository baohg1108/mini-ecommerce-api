import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';

@Entity('users')
@Index('ix_users_role_status', ['role', 'status'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    comment: 'User login email',
  })
  email!: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    comment: 'Hashed password (bcrypt)',
  })
  passwordHash!: string;

  @Column({
    name: 'full_name',
    type: 'varchar',
    length: 150,
  })
  fullName!: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  phone?: string;

  @Column({
    name: 'avatar_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  avatarUrl?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role_enum',
    default: UserRole.CUSTOMER,
  })
  role!: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    enumName: 'user_status_enum',
    default: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  @Column({
    name: 'email_verified_at',
    type: 'timestamptz',
    nullable: true,
  })
  emailVerifiedAt?: Date;

  @Column({
    name: 'last_login_at',
    type: 'timestamptz',
    nullable: true,
  })
  lastLoginAt!: Date | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt!: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt!: Date | null;
}
