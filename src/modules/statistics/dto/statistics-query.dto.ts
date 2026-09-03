import { IsOptional, IsDateString } from 'class-validator';

export class StatisticsQueryDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
