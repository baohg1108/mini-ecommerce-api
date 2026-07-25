// src/common/interceptors/transform.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((result) => {
        if (result && typeof result === 'object' && 'data' in result) {
          return {
            success: true,
            data: result.data,
            message: result.message ?? 'Success operation !',
            ...(result.pagination && { pagination: result.pagination }),
          };
        }
        return {
          success: true,
          data: result,
          message: 'Success operation !',
        };
      }),
    );
  }
}
