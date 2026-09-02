import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ShopStatus } from '../../../common/enums/shop-status.enum';

@Entity('shops')
@Index('ux_shops_user', ['userId'], { unique: true })
@Index('ux_shops_slug', ['slug'], { unique: true })
@Index('ix_shops_status', ['status'])
export class Shop {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'user_id',
    type: 'uuid',
    unique: true,
  })
  userId!: string;

  @OneToOne(() => User, (user) => user.shop, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    name: 'shop_name',
    type: 'varchar',
    length: 200,
  })
  shopName!: string;

  @Column({
    name: 'slug',
    type: 'varchar',
    length: 255,
    unique: true,
  })
  slug!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    name: 'logo_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  logoUrl!: string | null;

  @Column({
    name: 'business_license_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  businessLicenseUrl!: string | null;

  @Column({
    name: 'return_policy',
    type: 'text',
    nullable: true,
  })
  returnPolicy!: string | null;

  @Column({
    name: 'shipping_policy',
    type: 'text',
    nullable: true,
  })
  shippingPolicy!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: ShopStatus.PENDING,
  })
  status!: ShopStatus;

  @Column({
    name: 'rejection_reason',
    type: 'text',
    nullable: true,
  })
  rejectionReason!: string | null;

  @Column({
    name: 'avg_rating',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
    transformer: {
      to: (value?: number) => value,
      from: (value: string) => Number(value),
    },
  })
  avgRating!: number;

  @Column({
    name: 'review_count',
    type: 'int',
    default: 0,
  })
  reviewCount!: number;

  @Column({
    name: 'approved_at',
    type: 'timestamptz',
    nullable: true,
  })
  approvedAt!: Date | null;

  @Column({
    name: 'approved_by',
    type: 'uuid',
    nullable: true,
  })
  approvedBy!: string | null;

  @ManyToOne(() => User, (user) => user.approvedShops, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'approved_by' })
  approver!: User | null;

  @Column({
    name: 'rejected_at',
    type: 'timestamptz',
    nullable: true,
  })
  rejectedAt!: Date | null;

  @Column({
    name: 'rejected_by',
    type: 'uuid',
    nullable: true,
  })
  rejectedBy!: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'rejected_by' })
  rejector!: User | null;

  @Column({
    name: 'suspended_reason',
    type: 'text',
    nullable: true,
  })
  suspendedReason!: string | null;

  @Column({
    name: 'suspended_at',
    type: 'timestamptz',
    nullable: true,
  })
  suspendedAt!: Date | null;

  @Column({
    name: 'suspended_by',
    type: 'uuid',
    nullable: true,
  })
  suspendedBy!: string | null;

  @ManyToOne(() => User, (user) => user.suspendedShops, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'suspended_by' })
  suspender!: User | null;

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
}
