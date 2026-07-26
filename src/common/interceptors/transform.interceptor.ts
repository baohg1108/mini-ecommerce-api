import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface EnvelopeSource {
  data: unknown;
  message?: string;
  pagination?: unknown;
}

interface ResponseEnvelope {
  success: true;
  data: unknown;
  message: string;
  pagination?: unknown;
}

function isEnvelopeSource(value: unknown): value is EnvelopeSource {
  return typeof value === 'object' && value !== null && 'data' in value;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor<
  unknown,
  ResponseEnvelope
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseEnvelope> {
    const source$ = next.handle() as Observable<unknown>;

    return source$.pipe(
      map((result: unknown): ResponseEnvelope => {
        if (isEnvelopeSource(result)) {
          const envelope: ResponseEnvelope = {
            success: true,
            data: result.data,
            message: result.message ?? 'Success operation !',
          };

          if (result.pagination !== undefined) {
            envelope.pagination = result.pagination;
          }

          return envelope;
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
