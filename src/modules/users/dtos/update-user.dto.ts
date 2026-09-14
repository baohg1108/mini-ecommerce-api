import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  // IsPhoneNumber,
  IsUrl,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  refreshToken?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Full name must not exceed 100 characters' })
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Phone number must be at least 8 characters long' })
  @MaxLength(20, { message: 'Phone number must not exceed 20 characters' })
  // @IsPhoneNumber(undefined, { message: 'Invalid phone number format' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255, { message: 'Avatar URL must not exceed 255 characters' })
  @IsUrl({}, { message: 'Invalid URL format for avatarUrl' })
  avatarUrl?: string;
}
