import { IncidentReportAttachmentScanWorker } from './incident-report-attachment-scan-worker.service';

function setup(rows: any[], scanner: any) {
  const tx = {
    incidentReportAttachment: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    incidentReportAuditEvent: { create: jest.fn() },
  };
  const prisma = {
    incidentReportAttachment: { findMany: jest.fn().mockResolvedValue(rows) },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
  const storage = { downloadPrivate: jest.fn().mockResolvedValue(Buffer.from('x')) };
  return { worker: new IncidentReportAttachmentScanWorker(prisma as any, storage as any, scanner), tx, storage };
}

const now = new Date('2026-11-22T12:00:00Z');
const row = (id: string, ageMs = 60_000) => ({ id, organizationId: 'o', reportId: 'r', storageKey: `k/${id}`, createdAt: new Date(now.getTime() - ageMs) });

describe('ClamAV à la demande — analyse des pièces jointes en quarantaine', () => {
  it('attend sans rien changer tant que ClamAV ne répond pas', async () => {
    const scanner = { ping: jest.fn().mockRejectedValue(new Error('down')), scan: jest.fn() };
    const { worker, tx } = setup([row('a')], scanner);
    await expect(worker.processPending(now)).resolves.toEqual({ scanned: 0, waiting: 1 });
    expect(scanner.scan).not.toHaveBeenCalled();
    expect(tx.incidentReportAttachment.updateMany).not.toHaveBeenCalled();
  });

  it('libère un fichier sain et révoque un fichier infecté', async () => {
    const scanner = { ping: jest.fn(), scan: jest.fn().mockResolvedValueOnce('CLEAN').mockResolvedValueOnce('INFECTED') };
    const { worker, tx } = setup([row('a'), row('b')], scanner);
    await expect(worker.processPending(now)).resolves.toEqual({ scanned: 2 });
    expect(tx.incidentReportAttachment.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'a', scanStatus: 'PENDING' },
      data: { scanStatus: 'CLEAN', scannedAt: now },
    });
    expect(tx.incidentReportAttachment.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'b', scanStatus: 'PENDING' },
      data: { scanStatus: 'INFECTED', scannedAt: now, revokedAt: now },
    });
    expect(tx.incidentReportAuditEvent.create.mock.calls[1][0].data.action).toBe('ATTACHMENT_REJECTED_MALWARE');
  });

  it('arrête la passe si ClamAV tombe en cours de route', async () => {
    const scanner = { ping: jest.fn(), scan: jest.fn().mockRejectedValue(new Error('gone')) };
    const { worker, tx } = setup([row('a'), row('b')], scanner);
    await expect(worker.processPending(now)).resolves.toEqual({ scanned: 0 });
    expect(tx.incidentReportAttachment.updateMany).not.toHaveBeenCalled();
  });

  it('abandonne après 48 h (échec, fichier révoqué)', async () => {
    const scanner = { ping: jest.fn(), scan: jest.fn() };
    const { worker, tx } = setup([row('old', 49 * 3600_000)], scanner);
    await worker.processPending(now);
    expect(tx.incidentReportAttachment.updateMany).toHaveBeenCalledWith({
      where: { id: 'old', scanStatus: 'PENDING' },
      data: { scanStatus: 'FAILED', scannedAt: now, revokedAt: now },
    });
  });
});
