import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsUrl,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  refreshToken?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^[0-9+\-\s()]{8,20}$/, { message: 'Phone number is invalid' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  @IsUrl()
  avatarUrl?: string;
}
