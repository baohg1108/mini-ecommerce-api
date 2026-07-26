import { HttpException } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    statusCode: number,
  ) {
    super(message, statusCode);
  }
}
