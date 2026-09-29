import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { RequestContext } from './request-context';

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const original = exception instanceof HttpException ? exception.getResponse() : 'Erreur interne du serveur.';
    const body = typeof original === 'string' ? { statusCode: status, message: original } : original;
    response.status(status).json({ ...(body as object), requestId: RequestContext.requestId() });
  }
}
