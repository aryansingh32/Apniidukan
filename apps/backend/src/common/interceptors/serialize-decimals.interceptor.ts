import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function isDecimalLike(value: unknown): value is { toNumber: () => number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function' &&
    typeof (value as { toFixed?: unknown }).toFixed === 'function'
  );
}

function deepConvertDecimals<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => deepConvertDecimals(v)) as unknown as T;
  }
  if (isDecimalLike(value)) {
    return value.toNumber() as unknown as T;
  }
  if (value instanceof Date) {
    return value;
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = deepConvertDecimals(val);
    }
    return result as T;
  }
  return value;
}

@Injectable()
export class SerializeDecimalsInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => deepConvertDecimals(data)));
  }
}
