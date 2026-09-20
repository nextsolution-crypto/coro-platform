import { EventEmitter } from 'events';
import * as https from 'https';
import { StorageService } from './storage.service';

jest.mock('https', () => ({ request: jest.fn() }));

function mockRequests(responses: Array<{ statusCode: number; response?: Buffer }>) {
  const request = https.request as unknown as jest.Mock;
  request.mockImplementation(((options: any, callback: any) => {
    const next = responses.shift();
    if (!next) throw new Error('Unexpected HTTP request');
    const req = new EventEmitter() as any;
    req.write = jest.fn();
    req.end = jest.fn(() => {
      const res = new EventEmitter() as any; res.statusCode = next.statusCode;
      callback(res); if (next.response?.length) res.emit('data', next.response); res.emit('end');
    });
    (req as any).options = options;
    return req;
  }) as any);
  return request;
}

function mockRequest(statusCode: number, response = Buffer.alloc(0)) {
  return mockRequests([{ statusCode, response }]);
}

describe('StorageService public/private separation', () => {
  afterEach(() => jest.clearAllMocks());

  it('conserve le comportement public existant', async () => {
    const request = mockRequest(200);
    const result = await new StorageService().uploadFile(Buffer.from('x'), 'x.pdf', 'documents', 'application/pdf');
    const options: any = request.mock.calls[0][0];
    expect(options.headers['x-amz-acl']).toBe('public-read');
    expect(result).toContain('documents/x.pdf');
  });

  it('uploadPrivateImmutable ne pose aucune ACL publique et ne retourne aucune URL', async () => {
    const bytes = Buffer.from('%PDF-x');
    const request = mockRequests([
      { statusCode: 404 },
      { statusCode: 200 },
      { statusCode: 200, response: bytes },
    ]);
    const result = await new StorageService().uploadPrivateImmutable(bytes, 'population-evidence/org/evidence/report.pdf', 'application/pdf');
    const putOptions: any = request.mock.calls[1][0];
    expect(request.mock.calls.map((call) => call[0].method)).toEqual(['GET', 'PUT', 'GET']);
    expect(putOptions.headers['x-amz-acl']).toBeUndefined();
    expect(putOptions.headers['if-none-match']).toBeUndefined();
    expect(result).toEqual({ storageKey: 'population-evidence/org/evidence/report.pdf' });
    expect(JSON.stringify(result)).not.toMatch(/https?:|cdn/i);
  });

  it('refuse un objet existant avant tout PUT', async () => {
    const request = mockRequest(200, Buffer.from('existing'));
    await expect(new StorageService().uploadPrivateImmutable(Buffer.from('x'), 'private/x', 'application/pdf')).rejects.toThrow('PRIVATE_OBJECT_ALREADY_EXISTS');
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0].method).toBe('GET');
  });

  it('refuse de valider un PUT dont les octets relus divergent', async () => {
    const request = mockRequests([
      { statusCode: 404 },
      { statusCode: 200 },
      { statusCode: 200, response: Buffer.from('different') },
    ]);
    await expect(new StorageService().uploadPrivateImmutable(Buffer.from('expected'), 'private/x', 'application/pdf')).rejects.toThrow('PRIVATE_OBJECT_WRITE_VERIFICATION_FAILED');
    expect(request.mock.calls.map((call) => call[0].method)).toEqual(['GET', 'PUT', 'GET']);
  });

  it('lit les octets prives sans URL', async () => {
    mockRequest(200, Buffer.from('%PDF-private'));
    await expect(new StorageService().downloadPrivate('private/x')).resolves.toEqual(Buffer.from('%PDF-private'));
  });
});
