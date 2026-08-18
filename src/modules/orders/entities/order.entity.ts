import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Shop } from '../../shops/entities/shop.entity';
import { OrderItem } from './order-item.entity';
import { Payment } from '../../payment/entities/payment.entity';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_code', type: 'varchar', length: 30, unique: true })
  orderCode!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'shop_id', type: 'uuid' })
  shopId!: string;

  @ManyToOne(() => Shop, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'shop_id' })
  shop!: Shop;

  @Column({ name: 'shipping_recipient_name', type: 'varchar', length: 150 })
  shippingRecipientName!: string;

  @Column({ name: 'shipping_phone', type: 'varchar', length: 20 })
  shippingPhone!: string;

  @Column({ name: 'shipping_full_address', type: 'varchar', length: 500 })
  shippingFullAddress!: string;

  @Column({
    name: 'subtotal_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  subtotalAmount!: string;

  @Column({
    name: 'discount_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  discountAmount!: string;

  @Column({
    name: 'shipping_fee',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  shippingFee!: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 12, scale: 2 })
  totalAmount!: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 20 })
  paymentMethod!: PaymentMethod;

  @Column({
    type: 'varchar',
    length: 30,
    default: OrderStatus.PENDING_CONFIRMATION,
  })
  status!: OrderStatus;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt?: Date;

  @Column({ name: 'shipped_at', type: 'timestamptz', nullable: true })
  shippedAt?: Date;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];

  @OneToOne(() => Payment, (payment) => payment.order, { cascade: true })
  payment!: Payment;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
