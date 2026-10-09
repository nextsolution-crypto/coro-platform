import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestContext } from './request-context';

const safeClass = (exception: unknown) => {
  const name =
    exception instanceof Error
      ? exception.constructor.name
      : 'UnknownException';
  return /^[A-Za-z][A-Za-z0-9_$]{0,99}$/.test(name) ? name : 'UnknownException';
};

const safeStack = (exception: unknown) => {
  if (!(exception instanceof Error) || !exception.stack) return undefined;
  const frames = exception.stack
    .split('\n')
    .slice(1, 21)
    .filter((line) => /^\s*at\s/.test(line))
    .map((line) => line.replace(/\?.*?(?=:\d+:\d+\)?$)/, '[query-redacted]'));
  return frames.length
    ? [`${safeClass(exception)}: [message-redacted]`, ...frames].join('\n')
    : undefined;
};

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SafeExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const original: string | object =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Erreur interne du serveur.';
    const body =
      typeof original === 'string'
        ? { statusCode: status, message: original }
        : original;
    const requestId = RequestContext.requestId();
    try {
      this.logger.error(
        JSON.stringify({
          requestId,
          method: request?.method ?? 'UNKNOWN',
          path: (request?.originalUrl ?? request?.url ?? '').split('?')[0],
          status,
          exceptionClass: safeClass(exception),
          classification:
            status >= 500 ? 'UNEXPECTED_SERVER_ERROR' : 'HTTP_CLIENT_ERROR',
        }),
        status >= 500 ? safeStack(exception) : undefined,
      );
    } catch {
      // Logging must never alter the safe HTTP response.
    }
    response.status(status).json({ ...body, requestId });
  }
}
