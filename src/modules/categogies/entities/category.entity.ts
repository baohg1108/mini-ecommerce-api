import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  Check,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { CategoryStatus } from '../../../common/enums/category-status.enum';

@Entity('categories')
@Index('ix_categories_parent', ['parentId'])
@Check(`"status" IN ('active', 'hidden')`)
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string | null;

  @ManyToOne(() => Category, (category) => category.children, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'parent_id' })
  parent!: Category | null;

  @OneToMany(() => Category, (category) => category.parent)
  children!: Category[];

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Index('ux_categories_slug', { unique: true })
  @Column({ type: 'varchar', length: 160, unique: true })
  slug!: string;

  @Column({ name: 'icon_url', type: 'varchar', length: 500, nullable: true })
  iconUrl!: string | null;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: CategoryStatus.ACTIVE,
  })
  status!: CategoryStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
