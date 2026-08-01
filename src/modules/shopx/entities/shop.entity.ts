import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ShopStatus } from '../../../common/enums/shop-status.enum';

@Entity('shops')
@Index('ix_shops_user', ['userId'], { unique: true })
@Index('ix_shops_status', ['status'])
@Check(`"status" IN ('pending','active','rejected','suspended')`)
export class Shop {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'shop_name', type: 'varchar', length: 200 })
  shopName!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl?: string;

  @Column({
    name: 'business_license_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  businessLicenseUrl?: string;

  @Column({ name: 'return_policy', type: 'text', nullable: true })
  returnPolicy?: string;

  @Column({ name: 'shipping_policy', type: 'text', nullable: true })
  shippingPolicy?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ShopStatus.PENDING,
  })
  status!: ShopStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({
    name: 'avg_rating',
    type: 'numeric',
    precision: 3,
    scale: 2,
    default: 0,
  })
  avgRating!: number;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'approved_by' })
  approver?: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
