import { EventEmitter } from 'events';
import * as http from 'http';
import * as https from 'https';
import { StorageService } from './storage.service';

jest.mock('http', () => ({ request: jest.fn() }));
jest.mock('https', () => ({ request: jest.fn() }));

const qaKeys = [
  'PRIVATE_STORAGE_QA_MODE',
  'PRIVATE_STORAGE_QA_ENDPOINT',
  'PRIVATE_STORAGE_QA_ACCESS_KEY',
  'PRIVATE_STORAGE_QA_SECRET_KEY',
  'PRIVATE_STORAGE_QA_BUCKET',
] as const;

type TestRequestOptions = {
  headers: Record<string, string | number>;
  hostname?: string;
  method?: string;
  path?: string;
  port?: number;
};

type TestResponse = EventEmitter & { statusCode: number };
type TestRequest = EventEmitter & {
  end: jest.Mock;
  options: TestRequestOptions;
  write: jest.Mock;
};
type TestRequestMock = jest.MockedFunction<
  (
    options: TestRequestOptions,
    callback: (response: TestResponse) => void,
  ) => TestRequest
>;

function configureRequestMock(
  request: TestRequestMock,
  responses: Array<{ statusCode: number; response?: Buffer }>,
) {
  request.mockImplementation((options, callback) => {
    const next = responses.shift();
    if (!next) throw new Error('Unexpected HTTP request');
    const req = Object.assign(new EventEmitter(), {
      options,
      write: jest.fn(),
      end: jest.fn(() => {
        const res = Object.assign(new EventEmitter(), {
          statusCode: next.statusCode,
        });
        callback(res);
        if (next.response?.length) res.emit('data', next.response);
        res.emit('end');
      }),
    });
    return req;
  });
  return request;
}

function requestOptions(request: TestRequestMock, index: number) {
  return request.mock.calls[index][0];
}

function mockRequests(
  responses: Array<{ statusCode: number; response?: Buffer }>,
) {
  return configureRequestMock(
    https.request as unknown as TestRequestMock,
    responses,
  );
}

function mockRequest(statusCode: number, response = Buffer.alloc(0)) {
  return mockRequests([{ statusCode, response }]);
}

function mockHttpRequests(
  responses: Array<{ statusCode: number; response?: Buffer }>,
) {
  return configureRequestMock(
    http.request as unknown as TestRequestMock,
    responses,
  );
}

function enableQaStorage() {
  process.env.PRIVATE_STORAGE_QA_MODE = 'true';
  process.env.PRIVATE_STORAGE_QA_ENDPOINT = 'http://127.0.0.1:59000';
  process.env.PRIVATE_STORAGE_QA_ACCESS_KEY = 'qa-access-key';
  process.env.PRIVATE_STORAGE_QA_SECRET_KEY = 'qa-secret-key';
  process.env.PRIVATE_STORAGE_QA_BUCKET = 'coro-private-qa';
}

describe('StorageService public/private separation', () => {
  afterEach(() => {
    jest.clearAllMocks();
    for (const key of qaKeys) delete process.env[key];
  });

  it('conserve le comportement public existant', async () => {
    const request = mockRequest(200);
    const result = await new StorageService().uploadFile(
      Buffer.from('x'),
      'x.pdf',
      'documents',
      'application/pdf',
    );
    const options = requestOptions(request, 0);
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
    const result = await new StorageService().uploadPrivateImmutable(
      bytes,
      'population-evidence/org/evidence/report.pdf',
      'application/pdf',
    );
    const putOptions = requestOptions(request, 1);
    expect(request.mock.calls.map(([options]) => options.method)).toEqual([
      'GET',
      'PUT',
      'GET',
    ]);
    expect(putOptions.headers['x-amz-acl']).toBeUndefined();
    expect(putOptions.headers['if-none-match']).toBeUndefined();
    expect(result).toEqual({
      storageKey: 'population-evidence/org/evidence/report.pdf',
    });
    expect(JSON.stringify(result)).not.toMatch(/https?:|cdn/i);
  });

  it('refuse un objet existant avant tout PUT', async () => {
    const request = mockRequest(200, Buffer.from('existing'));
    await expect(
      new StorageService().uploadPrivateImmutable(
        Buffer.from('x'),
        'private/x',
        'application/pdf',
      ),
    ).rejects.toThrow('PRIVATE_OBJECT_ALREADY_EXISTS');
    expect(request).toHaveBeenCalledTimes(1);
    expect(requestOptions(request, 0).method).toBe('GET');
  });

  it('refuse de valider un PUT dont les octets relus divergent', async () => {
    const request = mockRequests([
      { statusCode: 404 },
      { statusCode: 200 },
      { statusCode: 200, response: Buffer.from('different') },
    ]);
    await expect(
      new StorageService().uploadPrivateImmutable(
        Buffer.from('expected'),
        'private/x',
        'application/pdf',
      ),
    ).rejects.toThrow('PRIVATE_OBJECT_WRITE_VERIFICATION_FAILED');
    expect(request.mock.calls.map(([options]) => options.method)).toEqual([
      'GET',
      'PUT',
      'GET',
    ]);
  });

  it('lit les octets prives sans URL', async () => {
    mockRequest(200, Buffer.from('%PDF-private'));
    await expect(
      new StorageService().downloadPrivate('private/x'),
    ).resolves.toEqual(Buffer.from('%PDF-private'));
  });

  it('échoue fermé lorsque le mode QA est incomplet', () => {
    process.env.PRIVATE_STORAGE_QA_MODE = 'true';
    expect(() => new StorageService()).toThrow(
      'PRIVATE_STORAGE_QA_MODE requires',
    );
  });

  it('refuse un endpoint QA externe', () => {
    enableQaStorage();
    process.env.PRIVATE_STORAGE_QA_ENDPOINT =
      'https://coro-storage.tor1.digitaloceanspaces.com';
    expect(() => new StorageService()).toThrow(
      'must be an explicit local HTTP(S) endpoint',
    );
  });

  it('utilise uniquement le endpoint HTTP local path-style en mode QA', async () => {
    enableQaStorage();
    const bytes = Buffer.from('%PDF-isolated-qa');
    const request = mockHttpRequests([
      { statusCode: 404 },
      { statusCode: 200 },
      { statusCode: 200, response: bytes },
    ]);

    await expect(
      new StorageService().uploadPrivateImmutable(
        bytes,
        'commercial-proposals/org/document.pdf',
        'application/pdf',
      ),
    ).resolves.toEqual({
      storageKey: 'commercial-proposals/org/document.pdf',
    });

    expect(https.request).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(3);
    expect(requestOptions(request, 1)).toMatchObject({
      hostname: '127.0.0.1',
      port: 59000,
      method: 'PUT',
      path: '/coro-private-qa/commercial-proposals/org/document.pdf',
    });
    expect(requestOptions(request, 1).headers['x-amz-acl']).toBeUndefined();
    expect(requestOptions(request, 1).headers.Authorization).toContain(
      'Credential=qa-access-key/',
    );
  });

  it('stocke un PDF officiel sous une cle privee deterministe et retourne une reference opaque', async () => {
    enableQaStorage();
    const bytes = Buffer.from('%PDF-official');
    const request = mockHttpRequests([
      { statusCode: 404 },
      { statusCode: 404 },
      { statusCode: 200 },
      { statusCode: 200, response: bytes },
    ]);
    const reference = await new StorageService().storeOfficialPdfImmutable({
      organizationId: 'org-a',
      projectId: 'project-a',
      projectVersionId: 'version-1',
      language: 'fr',
      bytes,
    });

    expect(reference).toMatch(/^coro-private:v1:/);
    expect(reference).not.toContain('http');
    expect(requestOptions(request, 2)).toMatchObject({
      method: 'PUT',
      path: '/coro-private-qa/tenant-org-a/official-project-pdfs/project-a/version-1/fr.pdf',
    });
    expect(requestOptions(request, 2).headers['x-amz-acl']).toBeUndefined();
  });

  it('reutilise sans ecriture un PDF officiel identique lors d une reprise', async () => {
    enableQaStorage();
    const bytes = Buffer.from('%PDF-official');
    const request = mockHttpRequests([{ statusCode: 200, response: bytes }]);
    await expect(
      new StorageService().storeOfficialPdfImmutable({
        organizationId: 'org-a',
        projectId: 'project-a',
        projectVersionId: 'version-1',
        language: 'en',
        bytes,
      }),
    ).resolves.toMatch(/^coro-private:v1:/);
    expect(request).toHaveBeenCalledTimes(1);
    expect(requestOptions(request, 0).method).toBe('GET');
  });

  it('refuse de remplacer un PDF officiel existant dont le contenu diverge', async () => {
    enableQaStorage();
    const request = mockHttpRequests([
      { statusCode: 200, response: Buffer.from('%PDF-existing') },
    ]);
    await expect(
      new StorageService().storeOfficialPdfImmutable({
        organizationId: 'org-a',
        projectId: 'project-a',
        projectVersionId: 'version-1',
        language: 'fr',
        bytes: Buffer.from('%PDF-different'),
      }),
    ).rejects.toThrow('OFFICIAL_PDF_IMMUTABLE_CONFLICT');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('resout une reference officielle privee sans requete publique', async () => {
    enableQaStorage();
    const key = 'tenant-org-a/official-project-pdfs/project-a/version-1/fr.pdf';
    const reference = `coro-private:v1:${Buffer.from(key).toString('base64url')}`;
    const bytes = Buffer.from('%PDF-private');
    mockHttpRequests([{ statusCode: 200, response: bytes }]);
    await expect(
      new StorageService().downloadOfficialPdfReference(reference),
    ).resolves.toEqual(bytes);
    expect(https.request).not.toHaveBeenCalled();
  });

  it('refuse une ancienne URL hors de l origine et du repertoire historiques autorises', async () => {
    await expect(
      new StorageService().downloadOfficialPdfReference(
        'https://attacker.invalid/documents/file.pdf',
      ),
    ).rejects.toThrow('UNSUPPORTED_HISTORICAL_OFFICIAL_PDF_REFERENCE');
    await expect(
      new StorageService().downloadOfficialPdfReference(
        'https://coro-storage.tor1.digitaloceanspaces.com/private/file.pdf',
      ),
    ).rejects.toThrow('UNSUPPORTED_HISTORICAL_OFFICIAL_PDF_REFERENCE');
    expect(https.request).not.toHaveBeenCalled();
  });

  it('lit une ancienne reference uniquement depuis l origine CORO sans redirection', async () => {
    const bytes = Buffer.from('%PDF-legacy');
    const request = mockRequests([{ statusCode: 200, response: bytes }]);
    await expect(
      new StorageService().downloadOfficialPdfReference(
        'https://coro-storage.tor1.digitaloceanspaces.com/documents/legacy.pdf',
      ),
    ).resolves.toEqual(bytes);
    expect(requestOptions(request, 0)).toMatchObject({
      hostname: 'coro-storage.tor1.digitaloceanspaces.com',
      method: 'GET',
      path: '/documents/legacy.pdf',
    });
  });
});
