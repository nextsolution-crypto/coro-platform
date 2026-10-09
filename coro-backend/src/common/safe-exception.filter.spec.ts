import { BadRequestException, Logger } from '@nestjs/common';
import { RequestContext } from './request-context';
import { SafeExceptionFilter } from './safe-exception.filter';

const host = (response: { status: jest.Mock; json: jest.Mock }) =>
  ({
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({
        method: 'POST',
        originalUrl: '/api/test?token=must-not-log',
        headers: { authorization: 'Bearer secret' },
        body: { password: 'secret', email: 'private@example.test' },
      }),
    }),
  }) as never;

describe('SafeExceptionFilter', () => {
  let response: { status: jest.Mock; json: jest.Mock };
  let logger: jest.SpyInstance;

  beforeEach(() => {
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    logger = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('correlates an unexpected error without exposing its message or request data', () => {
    const error = new TypeError('database secret and private@example.test');
    RequestContext.run('request-500', () =>
      new SafeExceptionFilter().catch(error, host(response)),
    );

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Erreur interne du serveur.',
      requestId: 'request-500',
    });
    expect(logger).toHaveBeenCalledTimes(1);
    const logged = logger.mock.calls.flat().join('\n');
    expect(logged).toContain('request-500');
    expect(logged).toContain('POST');
    expect(logged).toContain('/api/test');
    expect(logged).toContain('TypeError');
    expect(logged).toContain('UNEXPECTED_SERVER_ERROR');
    expect(logged).not.toContain('must-not-log');
    expect(logged).not.toContain('database secret');
    expect(logged).not.toContain('private@example.test');
    expect(logged).not.toContain('Bearer secret');
    expect(logged).not.toContain('password');
  });

  it('preserves known 4xx responses and logs once', () => {
    RequestContext.run('request-400', () =>
      new SafeExceptionFilter().catch(
        new BadRequestException('Champ invalide.'),
        host(response),
      ),
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Champ invalide.',
      error: 'Bad Request',
      requestId: 'request-400',
    });
    expect(logger).toHaveBeenCalledTimes(1);
    expect(logger.mock.calls.flat().join('\n')).not.toContain(
      'Champ invalide.',
    );
  });

  it('keeps the HTTP response stable when logging fails', () => {
    logger.mockImplementation(() => {
      throw new Error('logger unavailable');
    });
    RequestContext.run('request-stable', () =>
      new SafeExceptionFilter().catch(new Error('private'), host(response)),
    );
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Erreur interne du serveur.',
      requestId: 'request-stable',
    });
  });
});
