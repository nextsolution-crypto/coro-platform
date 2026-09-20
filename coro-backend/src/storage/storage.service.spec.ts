import { EventEmitter } from 'events';
import * as https from 'https';
import { StorageService } from './storage.service';

jest.mock('https', () => ({ request: jest.fn() }));

function mockRequest(statusCode: number, response = Buffer.alloc(0)) {
  const request = https.request as unknown as jest.Mock;
  request.mockImplementation(((options: any, callback: any) => {
    const req = new EventEmitter() as any;
    req.write = jest.fn();
    req.end = jest.fn(() => {
      const res = new EventEmitter() as any; res.statusCode = statusCode;
      callback(res); if (response.length) res.emit('data', response); res.emit('end');
    });
    (req as any).options = options;
    return req;
  }) as any);
  return request;
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
    const request = mockRequest(200);
    const result = await new StorageService().uploadPrivateImmutable(Buffer.from('%PDF-x'), 'population-evidence/org/evidence/report.pdf', 'application/pdf');
    const options: any = request.mock.calls[0][0];
    expect(options.headers['x-amz-acl']).toBeUndefined();
    expect(options.headers['if-none-match']).toBe('*');
    expect(result).toEqual({ storageKey: 'population-evidence/org/evidence/report.pdf' });
    expect(JSON.stringify(result)).not.toMatch(/https?:|cdn/i);
  });

  it('refuse le conflit objet et lit les octets prives sans URL', async () => {
    mockRequest(412);
    await expect(new StorageService().uploadPrivateImmutable(Buffer.from('x'), 'private/x', 'application/pdf')).rejects.toThrow('PRIVATE_OBJECT_ALREADY_EXISTS');
    jest.clearAllMocks();
    mockRequest(200, Buffer.from('%PDF-private'));
    await expect(new StorageService().downloadPrivate('private/x')).resolves.toEqual(Buffer.from('%PDF-private'));
  });
});
