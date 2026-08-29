import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid', unique: true })
  orderId!: string;

  @OneToOne(() => Order, (order) => order.payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ type: 'varchar', length: 20 })
  method!: PaymentMethod;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'varchar', length: 20, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({
    name: 'gateway_order_id',
    type: 'varchar',
    length: 100,
    nullable: true,
    unique: true,
  })
  gatewayOrderId?: string;

  @Column({
    name: 'gateway_txn_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  gatewayTxnId?: string;

  @Column({
    name: 'gateway_response_code',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  gatewayResponseCode?: string;

  @Column({
    name: 'gateway_signature',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  gatewaySignature?: string;

  @Column({ name: 'raw_callback_payload', type: 'jsonb', nullable: true })
  rawCallbackPayload?: Record<string, unknown>;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt?: Date;

  @Column({
    name: 'refund_gateway_txn_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  refundGatewayTxnId?: string;

  @Column({
    name: 'refund_response_code',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  refundResponseCode?: string;

  @Column({
    name: 'raw_refund_response_payload',
    type: 'jsonb',
    nullable: true,
  })
  rawRefundResponsePayload?: Record<string, unknown>;

  @Column({ name: 'refunded_at', type: 'timestamptz', nullable: true })
  refundedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
