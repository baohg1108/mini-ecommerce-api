import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { CategoryStatus } from '../../../common/enums/category-status.enum';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'slug must be a valid slug (lowercase letters, numbers, and hyphens only)',
  })
  slug!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsUrl()
  @MinLength(10)
  @MaxLength(500)
  iconUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(180)
  displayOrder?: number;

  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;
}
