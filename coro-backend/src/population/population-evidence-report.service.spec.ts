import { createHash } from 'crypto';
import { PopulationEvidenceReportService } from './population-evidence-report.service';

jest.mock('./population-evidence.service', () => ({
  verifyEvidenceIntegrity: jest.fn(() => ({ status: 'VERIFIED', verifiedAt: '2026-09-20T17:00:00.000Z' })),
}));

describe('PopulationEvidenceReportService recovery', () => {
  it('ne régénère jamais un report FINALIZED créé par le générateur 1.0.0', async () => {
    const historical = { id: 'report-v1', status: 'FINALIZED', generatorVersion: 'coro-evidence-pdf/1.0.0', reportSha256: 'a'.repeat(64), storageKey: 'private/historical.pdf', fileSize: 18271 };
    const tx = {
      $executeRaw: jest.fn(),
      populationEvidenceRecord: { findFirst: jest.fn().mockResolvedValue({ id: 'evidence-v1', status: 'FINALIZED' }) },
      populationEvidenceManifest: { findFirst: jest.fn().mockResolvedValue({ id: 'manifest-v1', manifest: {} }) },
      populationEvidenceReport: { findFirst: jest.fn().mockResolvedValue(historical), create: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((callback: any) => callback(tx)) };
    const storage = { uploadPrivateImmutable: jest.fn() };
    const service = new PopulationEvidenceReportService(prisma as any, storage as any);
    const renderer = jest.spyOn((service as any).renderer, 'render');
    const result = await service.generate('building', 'organization', 'evidence-v1', { type: 'SYSTEM' as any, id: 'actor' });
    expect(result).toMatchObject({ id: historical.id, generatorVersion: historical.generatorVersion, reportSha256: historical.reportSha256 });
    expect(renderer).not.toHaveBeenCalled();
    expect(storage.uploadPrivateImmutable).not.toHaveBeenCalled();
    expect(tx.populationEvidenceReport.create).not.toHaveBeenCalled();
    expect(historical.storageKey).toBe('private/historical.pdf');
  });
  it('finalise le meme report apres un crash post-upload sans second upload', async () => {
    const bytes = Buffer.from('%PDF-existing-private-object');
    const hash = createHash('sha256').update(bytes).digest('hex');
    const prisma = { populationEvidenceReport: { update: jest.fn().mockResolvedValue({ id: 'report-1', status: 'FINALIZED', reportSha256: hash, fileSize: bytes.length, storageKey: 'private/key' }) } };
    const storage = { downloadPrivate: jest.fn().mockResolvedValue(bytes), uploadPrivateImmutable: jest.fn() };
    const service = new PopulationEvidenceReportService(prisma as any, storage as any);
    const result = await (service as any).materialize({
      report: { id: 'report-1', storageKey: 'private/key', reportSha256: hash, fileSize: bytes.length },
      evidence: {}, manifest: {}, verification: { status: 'VERIFIED' },
    });
    expect(result).toMatchObject({ id: 'report-1', status: 'FINALIZED', reportSha256: hash });
    expect(storage.downloadPrivate).toHaveBeenCalledWith('private/key');
    expect(storage.uploadPrivateImmutable).not.toHaveBeenCalled();
    expect((result as any).storageKey).toBeUndefined();
  });

  it('refuse de finaliser un objet orphelin divergent', async () => {
    const storage = { downloadPrivate: jest.fn().mockResolvedValue(Buffer.from('different')), uploadPrivateImmutable: jest.fn() };
    const service = new PopulationEvidenceReportService({} as any, storage as any);
    await expect((service as any).materialize({ report: { id: 'report-1', storageKey: 'private/key', reportSha256: '0'.repeat(64), fileSize: 9 }, evidence: {}, manifest: {}, verification: {} })).rejects.toThrow('divergent');
    expect(storage.uploadPrivateImmutable).not.toHaveBeenCalled();
  });

  it('reprend un conflit write-once uniquement si le hash et la taille correspondent', async () => {
    const bytes = Buffer.from('%PDF-deterministic-report');
    const hash = createHash('sha256').update(bytes).digest('hex');
    const prisma = { populationEvidenceReport: { update: jest.fn()
      .mockResolvedValueOnce({ id: 'report-1' })
      .mockResolvedValueOnce({ id: 'report-1', status: 'FINALIZED', reportSha256: hash, fileSize: bytes.length }) } };
    const storage = {
      downloadPrivate: jest.fn().mockResolvedValue(bytes),
      uploadPrivateImmutable: jest.fn().mockRejectedValue(new Error('PRIVATE_OBJECT_ALREADY_EXISTS')),
    };
    const renderer = { render: jest.fn().mockResolvedValue(bytes) };
    const service = new PopulationEvidenceReportService(prisma as any, storage as any);
    (service as any).renderer = renderer;

    const result = await (service as any).materialize({
      report: { id: 'report-1', storageKey: 'private/key' },
      evidence: {}, manifest: {}, verification: { status: 'VERIFIED' },
    });

    expect(storage.uploadPrivateImmutable).toHaveBeenCalledTimes(1);
    expect(storage.downloadPrivate).toHaveBeenCalledWith('private/key');
    expect(result).toMatchObject({ status: 'FINALIZED', reportSha256: hash, fileSize: bytes.length });
  });
});
