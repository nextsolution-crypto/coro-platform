import { createHash } from 'crypto';
import { StorageService } from './storage.service';

const describeQaStorage =
  process.env.PRIVATE_STORAGE_QA_INTEGRATION === 'true'
    ? describe
    : describe.skip;

describeQaStorage('StorageService private QA integration', () => {
  const objectKey = `qa-integration/${process.pid}/private-document.pdf`;
  const payload = Buffer.from(
    '%PDF-1.7\nCORO isolated private storage QA\n%%EOF\n',
  );
  let storage: StorageService;

  beforeAll(() => {
    storage = new StorageService();
  });

  it('uploads, verifies and retrieves an immutable private object', async () => {
    const result = await storage.uploadPrivateImmutable(
      payload,
      objectKey,
      'application/pdf',
    );

    expect(result).toEqual({
      storageKey: objectKey,
    });
    expect(createHash('sha256').update(payload).digest('hex')).toHaveLength(64);
    await expect(storage.downloadPrivate(objectKey)).resolves.toEqual(payload);
  });

  it('rejects an attempted overwrite of the immutable object', async () => {
    await expect(
      storage.uploadPrivateImmutable(
        Buffer.from('different bytes'),
        objectKey,
        'application/pdf',
      ),
    ).rejects.toThrow('PRIVATE_OBJECT_ALREADY_EXISTS');

    await expect(storage.downloadPrivate(objectKey)).resolves.toEqual(payload);
  });
});
