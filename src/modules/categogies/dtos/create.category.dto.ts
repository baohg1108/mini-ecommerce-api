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
} from 'class-validator';
import { CategoryStatus } from '../../../common/enums/category-status.enum';

export class CreateCategoryDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsString()
  @MaxLength(160)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug chỉ được chứa chữ thường, số và dấu gạch ngang',
  })
  slug!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  iconUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;
}
