import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { ProductVariant } from '../../product-variant/entities/product-variant.entity';

// DB Design 3.13 - order_items
@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'variant_id', type: 'uuid' })
  variantId!: string;

  @ManyToOne(() => ProductVariant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'variant_id' })
  variant!: ProductVariant;

  @Column({ name: 'product_name_snapshot', type: 'varchar', length: 255 })
  productNameSnapshot!: string;

  @Column({ name: 'variant_attributes_snapshot', type: 'jsonb', default: {} })
  variantAttributesSnapshot!: Record<string, unknown>;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({
    name: 'price_at_order',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  priceAtOrder!: string;

  @Column({ name: 'line_total', type: 'numeric', precision: 12, scale: 2 })
  lineTotal!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
