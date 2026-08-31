import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Shop } from '../../shops/entities/shop.entity';
import { VoucherType } from '../../../common/enums/voucher-type.enum';
import { VoucherScope } from '../../../common/enums/voucher-scope.enum';
import { VoucherStatus } from '../../../common/enums/voucher-status.enum';

const decimalTransformer = {
  to: (value?: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity('vouchers')
@Index('ux_vouchers_shop_code', ['shopId', 'code'], { unique: true })
@Index('ix_vouchers_scope_status', ['scope', 'status'])
export class Voucher {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: 'Voucher code, unique within its scope (system or shop)',
  })
  code!: string;

  @Column({
    name: 'discount_type',
    type: 'enum',
    enum: VoucherType,
    enumName: 'voucher_type_enum',
  })
  discountType!: VoucherType;

  @Column({
    name: 'discount_value',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  discountValue!: number;

  @Column({
    name: 'min_order_value',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  minOrderValue!: number;

  @Column({
    name: 'max_discount_value',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  maxDiscountValue!: number | null;

  @Column({
    name: 'start_date',
    type: 'timestamptz',
  })
  startDate!: Date;

  @Column({
    name: 'end_date',
    type: 'timestamptz',
  })
  endDate!: Date;

  @Column({
    name: 'usage_limit',
    type: 'int',
  })
  usageLimit!: number;

  @Column({
    name: 'used_count',
    type: 'int',
    default: 0,
  })
  usedCount!: number;

  @Column({
    type: 'enum',
    enum: VoucherScope,
    enumName: 'voucher_scope_enum',
  })
  scope!: VoucherScope;

  @Column({
    name: 'shop_id',
    type: 'uuid',
    nullable: true,
    comment: 'Null when scope = system',
  })
  shopId!: string | null;

  @ManyToOne(() => Shop, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop!: Shop | null;

  @Column({
    type: 'enum',
    enum: VoucherStatus,
    enumName: 'voucher_status_enum',
    default: VoucherStatus.UPCOMING,
  })
  status!: VoucherStatus;

  @Column({
    name: 'created_by',
    type: 'uuid',
  })
  createdBy!: string;

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
