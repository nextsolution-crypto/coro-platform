import { CORS_ALLOWED_HEADERS } from './cors.config';

describe('browser CORS contract', () => {
  it('allows the document generation concurrency headers sent by the frontend', () => {
    expect(CORS_ALLOWED_HEADERS).toEqual(
      expect.arrayContaining([
        'Idempotency-Key',
        'X-Expected-Document-Version',
      ]),
    );
  });
});
