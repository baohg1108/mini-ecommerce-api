import { UserResponseDto } from '../../users/dtos/user-response.dto';

export interface AuthResponse {
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
}
