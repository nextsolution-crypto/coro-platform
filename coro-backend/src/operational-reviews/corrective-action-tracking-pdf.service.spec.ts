import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CorrectiveActionPermission } from '@prisma/client';
import { createHash } from 'crypto';
import { CorrectiveActionTrackingPdfService } from './corrective-action-tracking-pdf.service';
import { CORRECTIVE_ACTION_TRACKING_REPORT_GENERATOR_VERSION } from './corrective-action-tracking-report.renderer';

const actor = { sub: 'operator-b', organizationId: 'org', role: 'CLIENT_MANAGER', buildingIds: ['building'] };
const bytes = Buffer.from('%PDF-1.7\ntracking-test');
const hash = createHash('sha256').update(bytes).digest('hex');
const snapshot = { schemaVersion: 1, snapshotAt: '2026-09-22T00:00:00.000Z', review: { reference: 'REX-2026-000001', version: 1, confidentiality: 'BUILDING_TEAM' }, actions: [{ status: 'CLOSED' }] };
const ready = { id: 'report', organizationId: 'org', operationalReviewId: 'review', reviewVersion: 1, reportVersion: 1,
  status: 'SNAPSHOT_READY', snapshotAt: new Date(snapshot.snapshotAt), createdAt: new Date(), renderData: snapshot,
  generatedByType: 'CLIENT_USER', generatedById: 'operator-a', snapshotCreatedByType: 'CLIENT_USER', snapshotCreatedById: 'operator-a',
  language: 'FR', format: 'PDF', generatedAt: null, generatorVersion: null, storageKey: null, fileSize: null, reportSha256: null, leaseExpiresAt: null };

function setup() {
  const generating = { ...ready, status: 'GENERATING', generatedById: actor.sub, generatedAt: new Date(), generatorVersion: CORRECTIVE_ACTION_TRACKING_REPORT_GENERATOR_VERSION,
    storageKey: 'corrective-action-tracking-reports/org/review/report/REX-2026-000001_Suivi-actions_R1_FR.pdf', leaseExpiresAt: new Date(Date.now() + 120000) };
  const finalized = { ...generating, status: 'FINALIZED', fileSize: bytes.length, reportSha256: hash, finalizedAt: new Date() };
  const prisma: any = { clientUser: { findFirst: jest.fn().mockResolvedValue({ correctiveActionPermissions: [CorrectiveActionPermission.CORRECTIVE_ACTION_REPORT_GENERATE] }) },
    correctiveActionTrackingReport: { findFirst: jest.fn().mockResolvedValue(ready), update: jest.fn().mockResolvedValue(generating), updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: jest.fn().mockResolvedValue(finalized) },
    $executeRaw: jest.fn() };
  prisma.$transaction = jest.fn((callback: any) => callback(prisma));
  const storage: any = { uploadPrivateImmutable: jest.fn().mockResolvedValue({}), downloadPrivate: jest.fn().mockResolvedValue(bytes) };
  const tracking: any = { authorize: jest.fn().mockResolvedValue({ status: 'FINALIZED', reference: 'REX-2026-000001', version: 1, confidentiality: 'BUILDING_TEAM' }) };
  const service = new CorrectiveActionTrackingPdfService(prisma, storage, tracking);
  (service as any).renderer.render = jest.fn().mockResolvedValue(bytes);
  return { service, prisma, storage, tracking, generating, finalized };
}

describe('CorrectiveActionTrackingPdfService', () => {
  it('materialise uniquement le snapshot et retourne un DTO SAFE', async () => {
    const h = setup();
    const result = await h.service.materialize('review', 1, actor);
    expect(result).toMatchObject({ status: 'FINALIZED', reportVersion: 1, actionCount: 1, reportSha256: hash, fileSize: bytes.length });
    expect(JSON.stringify(result)).not.toMatch(/renderData|storageKey|clientIntentId|generatedById|leaseExpiresAt/);
    expect(h.storage.uploadPrivateImmutable).toHaveBeenCalledWith(bytes, h.generating.storageKey, 'application/pdf');
    expect(h.storage.downloadPrivate).toHaveBeenCalledWith(h.generating.storageKey);
    expect((h.service as any).renderer.render).toHaveBeenCalledWith(snapshot, expect.objectContaining({ generatedByType: 'CLIENT_USER', generatorVersion: CORRECTIVE_ACTION_TRACKING_REPORT_GENERATOR_VERSION }));
    expect(h.prisma.correctiveActionTrackingReport.update.mock.calls[0][0].data).toMatchObject({ snapshotCreatedById: 'operator-a', generatedById: 'operator-b' });
    expect(h.prisma.correctiveAction).toBeUndefined();
  });

  it('rejoue FINALIZED sans render ni second upload', async () => {
    const h = setup(); h.prisma.correctiveActionTrackingReport.findFirst.mockResolvedValue(h.finalized);
    await expect(h.service.materialize('review', 1, actor)).resolves.toMatchObject({ status: 'FINALIZED' });
    expect(h.storage.uploadPrivateImmutable).not.toHaveBeenCalled();
    expect((h.service as any).renderer.render).not.toHaveBeenCalled();
  });

  it('reprend un upload existant conforme sans second PUT', async () => {
    const h = setup(); const expired = { ...h.generating, leaseExpiresAt: new Date(Date.now() - 1000), reportSha256: hash, fileSize: bytes.length };
    h.prisma.correctiveActionTrackingReport.findFirst.mockResolvedValue(expired);
    h.prisma.correctiveActionTrackingReport.update.mockResolvedValue({ ...expired, leaseExpiresAt: h.generating.leaseExpiresAt });
    await expect(h.service.materialize('review', 1, actor)).resolves.toMatchObject({ status: 'FINALIZED' });
    expect(h.storage.uploadPrivateImmutable).not.toHaveBeenCalled();
    expect((h.service as any).renderer.render).not.toHaveBeenCalled();
  });

  it('bloque un objet divergent et une lease encore valide', async () => {
    const h = setup(); const expired = { ...h.generating, leaseExpiresAt: new Date(Date.now() - 1000), reportSha256: 'a'.repeat(64), fileSize: bytes.length };
    h.prisma.correctiveActionTrackingReport.findFirst.mockResolvedValue(expired);
    h.prisma.correctiveActionTrackingReport.update.mockResolvedValue({ ...expired, leaseExpiresAt: h.generating.leaseExpiresAt });
    await expect(h.service.materialize('review', 1, actor)).rejects.toBeInstanceOf(ConflictException);
    expect(h.storage.uploadPrivateImmutable).not.toHaveBeenCalled();
    h.prisma.correctiveActionTrackingReport.findFirst.mockResolvedValue(h.generating);
    await expect(h.service.materialize('review', 1, actor)).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuse sans permission de generation et revalide les droits de lecture', async () => {
    const h = setup(); h.prisma.clientUser.findFirst.mockResolvedValue({ correctiveActionPermissions: [] });
    await expect(h.service.materialize('review', 1, actor)).rejects.toBeInstanceOf(ForbiddenException);
    h.tracking.authorize.mockRejectedValue(new ForbiddenException());
    await expect(h.service.download('review', 1, actor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sert FINALIZED via le backend uniquement apres controle SHA/taille', async () => {
    const h = setup(); h.prisma.correctiveActionTrackingReport.findFirst.mockResolvedValue(h.finalized);
    const result = await h.service.download('review', 1, actor);
    expect(result.bytes).toEqual(bytes);
    expect(result.filename).toBe('REX-2026-000001_Suivi-actions_R1_FR.pdf');
    h.storage.downloadPrivate.mockResolvedValue(Buffer.from('corrupted'));
    await expect(h.service.download('review', 1, actor)).rejects.toBeInstanceOf(ConflictException);
  });
});
