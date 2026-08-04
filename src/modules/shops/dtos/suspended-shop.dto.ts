import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SuspendedShopDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reasonSuspended!: string;
}
