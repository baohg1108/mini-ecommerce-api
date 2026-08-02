import { Exclude, Expose, Type } from 'class-transformer';
import type { Category } from '../entities/category.entity';
import { CategoryStatus } from '../../../common/enums/category-status.enum';

@Exclude()
export class CategoryResponseDto {
  @Expose()
  id!: string;

  @Expose()
  parentId!: string | null;

  @Expose()
  name!: string;

  @Expose()
  slug!: string;

  @Expose()
  iconUrl!: string | null;

  @Expose()
  displayOrder!: number;

  @Expose()
  status!: CategoryStatus;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  @Type(() => CategoryResponseDto)
  children?: CategoryResponseDto[];

  constructor(partial: Partial<Category>) {
    Object.assign(this, partial);
  }
}
