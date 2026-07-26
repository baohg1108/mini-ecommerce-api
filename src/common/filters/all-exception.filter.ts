import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

interface HttpExceptionResponseBody {
  message?: string | string[];
  code?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const responseBody = exception.getResponse();

      const body: HttpExceptionResponseBody =
        typeof responseBody === 'string' ? {} : responseBody;

      const message =
        typeof responseBody === 'string'
          ? responseBody
          : (body.message ?? exception.message);

      return res.status(status).json({
        success: false,
        error: {
          code: body.code ?? exception.name,
          message: Array.isArray(message) ? message.join(', ') : message,
        },
      });
    }

    console.error(exception);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error system ! Please contact with admin',
      },
    });
  }
}
