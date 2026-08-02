import { IsOptional, IsUUID } from 'class-validator';

export class MoveCategoryDto {
  @IsOptional()
  @IsUUID()
  newParentId?: string | null;
}
