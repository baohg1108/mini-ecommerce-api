import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

@Entity('product_variants')
@Index('ix_product_variants_product', ['productId'])
@Check(`"price" >= 0`)
@Check(`"stock_qty" >= 0`)
@Check(`"reserved_qty" >= 0`)
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Index('ux_variants_sku', { unique: true })
  @Column({ type: 'varchar', length: 100 })
  sku!: string;

  @Column({ type: 'jsonb', default: {} })
  attributes!: Record<string, string | number>;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) =>
        value === null ? null : Number.parseFloat(value),
    },
  })
  price!: number;

  @Column({
    name: 'stock_qty',
    type: 'int',
    default: 0,
  })
  stockQty!: number;

  @Column({
    name: 'reserved_qty',
    type: 'int',
    default: 0,
  })
  reservedQty!: number;

  @Column({
    name: 'image_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  imageUrl!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status!: 'active' | 'inactive';

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

  get availableQty(): number {
    return this.stockQty - this.reservedQty;
  }
}
